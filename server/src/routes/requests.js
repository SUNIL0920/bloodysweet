import express from 'express';
import BloodRequest from '../models/BloodRequest.js';
import User from '../models/User.js';
import Pledge from '../models/Pledge.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Create a new blood request (hospital only)
router.post('/', authMiddleware, requireRole('hospital'), async (req, res) => {
  try {
    const { bloodType } = req.body;
    const hospital = await User.findById(req.user._id);
    if (!hospital || hospital.role !== 'hospital') return res.status(403).json({ message: 'Forbidden' });
    if (!hospital.location) return res.status(400).json({ message: 'Hospital location not set' });

    const request = await BloodRequest.create({
      hospital: hospital._id,
      bloodType,
      location: hospital.location,
    });

    const populated = await request.populate('hospital', '-password');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create request' });
  }
});

// Get all active blood requests
router.get('/active', async (_req, res) => {
  try {
    const requests = await BloodRequest.find({ status: 'active' }).populate('hospital', '-password').sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch active requests' });
  }
});

// Donor pledge to a request with optional ETA
router.post('/:id/pledge', authMiddleware, requireRole('donor'), async (req, res) => {
  try {
    const requestId = req.params.id;
    const { etaMinutes } = req.body || {};

    const request = await BloodRequest.findById(requestId);
    if (!request || request.status !== 'active') return res.status(404).json({ message: 'Request not active' });

    const donor = await User.findById(req.user._id).lean();
    const last = donor.lastDonationDate ? new Date(donor.lastDonationDate) : null;
    if (last) {
      const nextEligible = new Date(last.getTime() + 56 * 24 * 60 * 60 * 1000);
      if (new Date() < nextEligible) {
        return res.status(400).json({ message: `Not eligible until ${nextEligible.toISOString().slice(0,10)}` });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const pledge = await Pledge.create({ request: request._id, donor: req.user._id, etaMinutes, code });
    const populated = await pledge.populate('donor', 'name bloodType location');

    // Emit socket event
    req.app.get('io').emit('pledge:new', { requestId, pledge: populated });

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'You already pledged' });
    res.status(500).json({ message: 'Failed to pledge' });
  }
});

// Donor cancels pledge
router.delete('/:id/pledge', authMiddleware, requireRole('donor'), async (req, res) => {
  try {
    const requestId = req.params.id;
    await Pledge.findOneAndUpdate({ request: requestId, donor: req.user._id }, { $set: { status: 'cancelled' } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel pledge' });
  }
});

// Hospital: view pledges for a specific request they own
router.get('/:id/pledges', authMiddleware, requireRole('hospital'), async (req, res) => {
  try {
    const reqId = req.params.id;
    const request = await BloodRequest.findOne({ _id: reqId, hospital: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const pledges = await Pledge.find({ request: reqId, status: { $in: ['pledged', 'arrived'] } })
      .populate('donor', 'name bloodType location lastDonationDate');
    res.json(pledges);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pledges' });
  }
});

// Hospital: verify donor arrival via code and optionally auto-fulfill
router.post('/:id/verify-arrival', authMiddleware, requireRole('hospital'), async (req, res) => {
  try {
    const reqId = req.params.id;
    const { code } = req.body || {};
    const request = await BloodRequest.findOne({ _id: reqId, hospital: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const pledge = await Pledge.findOneAndUpdate(
      { request: reqId, code },
      { $set: { status: 'arrived' } },
      { new: true }
    );
    if (!pledge) return res.status(400).json({ message: 'Invalid code' });

    await BloodRequest.updateOne({ _id: reqId, status: 'active' }, { $set: { status: 'fulfilled' } });

    // Emit socket event
    req.app.get('io').emit('pledge:arrived', { requestId: reqId, pledgeId: pledge._id });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify arrival' });
  }
});

// Donor readiness score (dummy data fallback)
router.get('/readiness', authMiddleware, requireRole('donor'), async (req, res) => {
  try {
    const donor = await User.findById(req.user._id).lean();
    const now = Date.now();
    const last = donor?.lastDonationDate ? new Date(donor.lastDonationDate).getTime() : (now - 90*24*3600*1000);
    const daysSince = Math.floor((now - last) / (24*3600*1000));

    // naive distance trend & availability window dummy values
    const distanceTrend = Math.random(); // 0..1 smaller is better
    const availability = 0.8; // treat as 80% available

    // score out of 100
    const score = Math.max(0, Math.min(100, Math.round(
      (Math.min(daysSince/56, 1) * 50) + // cooldown weight
      ((1-distanceTrend) * 30) +         // trend weight
      (availability * 20)                // availability weight
    )));

    res.json({ score, daysSince, availability, distanceTrend });
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute readiness' });
  }
});

// Hotspots: aggregate active requests density for heatmap
router.get('/hotspots', async (_req, res) => {
  try {
    const data = await BloodRequest.aggregate([
      { $match: { status: 'active' } },
      { $project: {
          lng: { $arrayElemAt: ['$location.coordinates', 0] },
          lat: { $arrayElemAt: ['$location.coordinates', 1] }
        }
      },
      { $project: { lng: { $round: ['$lng', 2] }, lat: { $round: ['$lat', 2] } } },
      { $group: { _id: { lng: '$lng', lat: '$lat' }, count: { $sum: 1 } } },
      { $project: { _id: 0, coordinates: ['$_id.lng', '$_id.lat'], count: 1 } }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute hotspots' });
  }
});

// Improve nearby by adding compatibility score
function compatibilityScore(donorType, neededType) {
  const compat = {
    'O-': ['O-','O+','A-','A+','B-','B+','AB-','AB+'],
    'O+': ['O+','A+','B+','AB+'],
    'A-': ['A-','A+','AB-','AB+'],
    'A+': ['A+','AB+'],
    'B-': ['B-','B+','AB-','AB+'],
    'B+': ['B+','AB+'],
    'AB-': ['AB-','AB+'],
    'AB+': ['AB+']
  };
  const ok = compat[donorType]?.includes(neededType) ? 1 : 0;
  return ok;
}

// Override existing nearby handler to append scores and sort
router.get('/nearby', authMiddleware, requireRole('donor'), async (req, res) => {
  try {
    const donor = await User.findById(req.user._id).lean();
    if (!donor?.location?.coordinates) return res.status(400).json({ message: 'Donor location not set' });

    const [lng, lat] = donor.location.coordinates;

    const results = await BloodRequest.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          spherical: true,
          maxDistance: 50000, // 50km
          query: { status: 'active' }
        }
      },
      { $lookup: { from: 'users', localField: 'hospital', foreignField: '_id', as: 'hospital' } },
      { $unwind: '$hospital' },
      { $project: { 'hospital.password': 0 } }
    ]);

    const scored = results.map(r => ({
      ...r,
      compatibilityScore: compatibilityScore(donor.bloodType, r.bloodType),
      distanceKm: (r.distanceMeters || 0) / 1000
    })).sort((a,b) => (b.compatibilityScore - a.compatibilityScore) || (a.distanceKm - b.distanceKm));

    res.json(scored);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch nearby requests' });
  }
});

// Fulfill a request (hospital only, must own the request)
router.put('/:id/fulfill', authMiddleware, requireRole('hospital'), async (req, res) => {
  try {
    const reqId = req.params.id;
    const updated = await BloodRequest.findOneAndUpdate(
      { _id: reqId, hospital: req.user._id },
      { $set: { status: 'fulfilled' } },
      { new: true }
    ).populate('hospital', '-password');

    if (!updated) return res.status(404).json({ message: 'Request not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fulfill request' });
  }
});

// Hospital: list own requests
router.get('/mine', authMiddleware, requireRole('hospital'), async (req, res) => {
  try {
    const requests = await BloodRequest.find({ hospital: req.user._id })
      .populate('hospital', '-password')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your requests' });
  }
});

export default router; 
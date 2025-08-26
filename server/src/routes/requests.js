import express from "express";
import path from "path";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import BloodRequest from "../models/BloodRequest.js";
import Pledge from "../models/Pledge.js";
import SwapRequest from "../models/SwapRequest.js";
import User from "../models/User.js";
import fs from "fs";
import { sendEmail } from "../services/mailer.js";
import { sendWhatsApp } from "../services/whatsapp.js";
// SMS/WhatsApp disabled for this deployment; using Email only

const router = express.Router();

// ===== File Upload (Certificates) =====
const uploadDir = path.resolve(process.cwd(), "uploads/certificates");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const fileFilter = (_req, file, cb) => {
  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid file type. Only PDF/PNG/JPG allowed."));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

async function simulateRequestsForHospital(hospital, count, io, opts = {}) {
  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const created = [];
  const radius = Math.max(0.5, Math.min(Number(opts.radiusKm || 5), 20));
  const mix = opts.mix || "random";
  for (let i = 0; i < count; i++) {
    const bt =
      mix === "same"
        ? hospital.bloodType
        : bloodTypes[Math.floor(Math.random() * bloodTypes.length)];
    const urgencyLevel = 5;
    // radius jitter in degrees (~111km per degree)
    const jitterLng =
      hospital.location.coordinates[0] +
      (Math.random() - 0.5) * (radius / 111) * 2;
    const jitterLat =
      hospital.location.coordinates[1] +
      (Math.random() - 0.5) * (radius / 111) * 2;
    const reqDoc = await BloodRequest.create({
      hospital: hospital._id,
      bloodType: bt,
      urgencyLevel,
      unitsNeeded: 1 + Math.floor(Math.random() * 3),
      location: { type: "Point", coordinates: [jitterLng, jitterLat] },
      simulated: true,
    });
    const populated = await reqDoc.populate("hospital", "-password");
    created.push(populated);
    io.emit("request:new", populated);
  }
  io.emit("requests:simulate", { ids: created.map((r) => r._id) });
  return created;
}

// Helper: compute urgency score for a donor vs request
function computeUrgencyScore({ donor, request, distanceKm }) {
  // rarity baseline (rarer types get higher base)
  const rarityRank = {
    "O-": 1,
    "AB-": 2,
    "B-": 3,
    "A-": 4,
    "O+": 5,
    "AB+": 6,
    "B+": 7,
    "A+": 8,
  };
  const rarityScore = (9 - (rarityRank[donor.bloodType] || 8)) / 8; // 0..1
  // distance score: closer is better
  const distanceScore = Math.max(0, 1 - Math.min(distanceKm || 50, 50) / 50);
  // responsiveness
  const responsiveness =
    typeof donor.responsivenessScore === "number"
      ? donor.responsivenessScore
      : 0.5;
  // compatibility exact match or ok
  const compat = compatibilityScore(donor.bloodType, request.bloodType);
  const compatBoost = compat ? 1 : 0; // 1 if compatible else 0
  // urgency from request
  const urgency = Math.min(Math.max(request.urgencyLevel || 3, 1), 5) / 5;
  // weighted sum → 0..100
  const total = Math.round(
    urgency * 35 +
      compatBoost * 25 +
      distanceScore * 20 +
      rarityScore * 10 +
      responsiveness * 10
  );
  return total;
}

// Create a new blood request (hospital only)
router.post("/", authMiddleware, requireRole("hospital"), async (req, res) => {
  try {
    const { bloodType, urgencyLevel = 3, unitsNeeded = 1, notes } = req.body;
    const hospital = await User.findById(req.user._id);
    if (!hospital || hospital.role !== "hospital")
      return res.status(403).json({ message: "Forbidden" });
    
    // Check if hospital has location, if not, create a default location for testing
    let hospitalLocation = hospital.location;
    if (!hospitalLocation) {
      // Create a default location for hospitals without location (temporary fix)
      hospitalLocation = {
        type: "Point",
        coordinates: [78.59228332256787, 10.67197801341462] // Default coordinates (Delhi area)
      };
      console.log(`Hospital ${hospital.name} has no location, using default coordinates`);
    }

    const request = await BloodRequest.create({
      hospital: hospital._id,
      bloodType,
      urgencyLevel,
      unitsNeeded,
      notes,
      location: hospitalLocation,
    });

    const populated = await request.populate("hospital", "-password");
    // notify listeners
    req.app.get("io").emit("request:new", populated);

    // Fire-and-forget: notify nearby compatible donors (email + WhatsApp) within 50km
    try {
      const [lng, lat] = hospital.location.coordinates;
      const donors = await User.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distanceMeters",
            spherical: true,
            maxDistance: 50000,
            query: { role: "donor", phone: { $exists: true, $ne: "" } },
          },
        },
      ]);
      // Strict same-blood-group notifications for WhatsApp
      const compatible = donors.filter((d) => d.bloodType === bloodType);
      try { console.log('[WA] nearby donors', { total: donors.length, compatible: compatible.length }) } catch {}
      const top = compatible.slice(0, 50);
      const emails = top.map((d) => d.email).filter(Boolean);
      if (emails.length > 0) {
        for (const d of top) {
          if (!d.email) continue;
          const distanceKm =
            typeof d.distanceMeters === "number"
              ? (d.distanceMeters / 1000).toFixed(1) + " km"
              : "near you";
          const subject = "Alert : Require blood";
          const body = `Alert : Required ${bloodType} in ${hospital.name} , ${distanceKm}`;
          const html = `<div style="font-family:Inter,Arial,Helvetica,sans-serif;padding:16px">
            <h2>Blood Alert</h2>
            <p>${body}</p>
            <p><strong>Units Needed:</strong> ${unitsNeeded}</p>
            <p><strong>Urgency:</strong> ${urgencyLevel}</p>
          </div>`;
          // send from hospital email if available; fallback to global FROM_EMAIL
          const fromHeader = hospital?.email
            ? `${hospital.name} <${hospital.email}>`
            : undefined;
          await sendEmail({
            to: d.email,
            subject,
            text: body,
            html,
            from: fromHeader,
          });
        }
      }
      // WhatsApp alerts via Twilio (best effort per recipient)
      const whatsappResults = [];
      const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || "";
      const detailsUrl = appUrl
        ? `${appUrl.replace(/\/$/, "")}/requests/${request._id.toString()}`
        : "";
      // Universal navigation link (lets Google Maps optimize from current location)
      const navLat = hospital?.location?.coordinates?.[1];
      const navLng = hospital?.location?.coordinates?.[0];
      const mapsUrl =
        typeof navLat === "number" && typeof navLng === "number"
          ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              navLat + "," + navLng
            )}`
          : "";
      const contentSid = process.env.TWILIO_CONTENT_SID || undefined;
      for (const d of top) {
        if (!d.phone) continue;
        const phone = d.phone.startsWith("whatsapp:")
          ? d.phone
          : `whatsapp:${d.phone}`;
        const distanceKm =
          typeof d.distanceMeters === "number"
            ? (d.distanceMeters / 1000).toFixed(1) + " km"
            : "near you";
        const msg = [
          '⚠ Alert Blood Donation Request',
          '',
          `🩸 Blood Type: ${bloodType}`,
          `🏥 Hospital: ${hospital.name}`,
          `📊 Units Needed: ${unitsNeeded}`,
          `📍 Location: (${distanceKm} away)`,
          '',
          mapsUrl ? `🗺 Navigate: ${mapsUrl}` : null,
        ].filter(Boolean).join('\n');
        try {
          const resp = await sendWhatsApp({ phone: phone.replace(/^whatsapp:/, ''), text: msg });
          whatsappResults.push({ to: phone, sid: resp?.sid, ok: resp?.ok !== false });
        } catch (err) {
          try { console.error('[WA] send error', phone, err?.message || err) } catch {}
          whatsappResults.push({ to: phone, error: err?.message || 'failed' });
        }
      }

      // If no donor message was queued/sent, send to hospital contact for verification
      const deliveredCount = whatsappResults.filter((r) => r.sid || r.ok).length;
      if (deliveredCount === 0 && hospital?.phone) {
        const phone = hospital.phone.startsWith("whatsapp:")
          ? hospital.phone
          : `whatsapp:${hospital.phone}`;
        const msg = `Emergency ${bloodType} request created at ${
          hospital.name
        }. No donors with WhatsApp found nearby.${
          detailsUrl ? ` More info: ${detailsUrl}` : ""
        }`;
        try {
          await sendWhatsApp({ phone: phone.replace(/^whatsapp:/, ''), text: msg });
        } catch (err) {
          console.log("WhatsApp hospital fallback failed:", err?.message);
        }
      }

      // Expose notification counts in response headers for debugging without changing payload shape
      res.set("X-Notify-Email", String(emails.length || 0));
      res.set("X-Notify-WhatsApp-Sent", String(deliveredCount));
      try { console.log('[WA] results', whatsappResults) } catch {}
    } catch (e) {
      console.log("Email notify failed:", e?.message);
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to create request" });
  }
});

// Get all active blood requests
router.get("/active", async (_req, res) => {
  try {
    const requests = await BloodRequest.find({ status: "active" })
      .populate("hospital", "-password")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch active requests" });
  }
});

// Rank donors for a request by urgency score
router.get(
  "/:id/ranking",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const reqId = req.params.id;
      const request = await BloodRequest.findOne({
        _id: reqId,
        hospital: req.user._id,
      });
      if (!request)
        return res.status(404).json({ message: "Request not found" });

      // find compatible donors within 50km
      const [lng, lat] = request.location.coordinates;
      const donors = await User.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distanceMeters",
            spherical: true,
            maxDistance: 50000,
            query: { role: "donor" },
          },
        },
      ]);

      const ranked = donors
        .filter((d) => compatibilityScore(d.bloodType, request.bloodType))
        .map((d) => {
          const distanceKm = (d.distanceMeters || 0) / 1000;
          const score = computeUrgencyScore({ donor: d, request, distanceKm });
          return {
            donorId: d._id,
            name: d.name,
            bloodType: d.bloodType,
            distanceKm,
            responsiveness: d.responsivenessScore || 0.5,
            urgencyScore: score,
            location: d.location,
          };
        })
        .sort((a, b) => b.urgencyScore - a.urgencyScore)
        .slice(0, 50);

      res.json(ranked);
    } catch (err) {
      res.status(500).json({ message: "Failed to rank donors" });
    }
  }
);

// Donor pledge to a request with optional ETA and availability window
router.post(
  "/:id/pledge",
  authMiddleware,
  requireRole("donor"),
  async (req, res) => {
    try {
      const requestId = req.params.id;
      const { etaMinutes, availableForMinutes } = req.body || {};

      const request = await BloodRequest.findById(requestId);
      if (!request || request.status !== "active")
        return res.status(404).json({ message: "Request not active" });

      const donor = await User.findById(req.user._id).lean();
      // Enforce strict same-group only
      if (!compatibilityScore(donor.bloodType, request.bloodType)) {
        return res.status(400).json({
          message: `Only same blood group allowed. Your ${donor.bloodType} cannot donate to ${request.bloodType}.`,
        });
      }
      const last = donor.lastDonationDate
        ? new Date(donor.lastDonationDate)
        : null;
      if (last) {
        const nextEligible = new Date(
          last.getTime() + 30 * 24 * 60 * 60 * 1000
        );
        if (new Date() < nextEligible) {
          return res.status(400).json({
            message: `Not eligible until ${nextEligible
              .toISOString()
              .slice(0, 10)}`,
          });
        }
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const pledge = await Pledge.create({
        request: request._id,
        donor: req.user._id,
        etaMinutes,
        availableForMinutes,
        code,
      });
      const populated = await pledge.populate([
        { path: "donor", select: "name bloodType location email" },
        {
          path: "request",
          populate: { path: "hospital", select: "name location" },
        },
      ]);

      // Emit socket event
      req.app.get("io").emit("pledge:new", { requestId, pledge: populated });

      // Update donor responsiveness (slight positive reinforcement)
      try {
        const current = donor.responsivenessScore ?? 0.5;
        const updated = Math.max(0, Math.min(1, current * 0.7 + 0.3 * 0.7));
        await User.updateOne(
          { _id: req.user._id },
          { $set: { responsivenessScore: updated } }
        );
      } catch {}

      // Email the donor their arrival code (post-pledge)
      try {
        const to = populated?.donor?.email;
        if (to) {
          const hospitalName = populated?.request?.hospital?.name || "Hospital";
          const subject = "Blood Donation Code";
          const text = `${code} for blood donation , ${
            populated.request?.bloodType || ""
          } , ${hospitalName}`;
          const html = `<div style="font-family:Inter,Arial,Helvetica,sans-serif;padding:16px">
        <h2>Blood Donation Code</h2>
        <p><strong>${code}</strong> for blood donation , <strong>${
            populated.request?.bloodType || ""
          }</strong> , <strong>${hospitalName}</strong></p>
      </div>`;
          await sendEmail({ to, subject, text, html });
        }
      } catch {}

      res.status(201).json(populated);
    } catch (err) {
      if (err.code === 11000)
        return res.status(400).json({ message: "You already pledged" });
      res.status(500).json({ message: "Failed to pledge" });
    }
  }
);

// Donor cancels pledge
router.delete(
  "/:id/pledge",
  authMiddleware,
  requireRole("donor"),
  async (req, res) => {
    try {
      const requestId = req.params.id;
      await Pledge.findOneAndUpdate(
        { request: requestId, donor: req.user._id },
        { $set: { status: "cancelled" } }
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to cancel pledge" });
    }
  }
);

// Hospital: view pledges for a specific request they own
router.get(
  "/:id/pledges",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const reqId = req.params.id;
      const request = await BloodRequest.findOne({
        _id: reqId,
        hospital: req.user._id,
      });
      if (!request)
        return res.status(404).json({ message: "Request not found" });

      const pledges = await Pledge.find({
        request: reqId,
        status: { $in: ["pledged", "arrived"] },
      }).populate("donor", "name bloodType location lastDonationDate");
      res.json(pledges);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch pledges" });
    }
  }
);

// Hospital: view donor feedback for a specific request they own
router.get(
  "/:id/feedbacks",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const reqId = req.params.id;
      const request = await BloodRequest.findOne({
        _id: reqId,
        hospital: req.user._id,
      });
      if (!request)
        return res.status(404).json({ message: "Request not found" });

      const feedbacks = await Pledge.find({
        request: reqId,
        feedbackRating: { $exists: true },
      })
        .populate("donor", "name bloodType")
        .sort({ feedbackAt: -1 })
        .lean();

      // sanitize output
      const data = feedbacks.map((f) => ({
        _id: f._id,
        donor: f.donor ? { name: f.donor.name, bloodType: f.donor.bloodType } : null,
        rating: f.feedbackRating,
        comment: f.feedbackComment || "",
        at: f.feedbackAt,
      }));

      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch feedbacks" });
    }
  }
);

// Hospital: verify donor arrival via code and optionally auto-fulfill
router.post(
  "/:id/verify-arrival",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const reqId = req.params.id;
      const { code, report } = req.body || {};
      const request = await BloodRequest.findOne({
        _id: reqId,
        hospital: req.user._id,
      });
      if (!request)
        return res.status(404).json({ message: "Request not found" });

      const pledge = await Pledge.findOneAndUpdate(
        { request: reqId, code },
        {
          $set: {
            status: "arrived",
            reportAt: report?.reportAt ? new Date(report.reportAt) : new Date(),
            bpSys: report?.bpSys,
            bpDia: report?.bpDia,
            hemoglobin: report?.hemoglobin,
            sugar: report?.sugar,
            unitsDonated:
              typeof report?.unitsDonated === "number" &&
              report.unitsDonated >= 0
                ? Math.min(20, report.unitsDonated)
                : undefined,
            certificateId:
              report?.certificateId ||
              `CERT-${Date.now().toString().slice(-8)}`,
          },
        },
        { new: true }
      );
      if (!pledge) return res.status(400).json({ message: "Invalid code" });

      await BloodRequest.updateOne(
        { _id: reqId, status: "active" },
        { $set: { status: "fulfilled" } }
      );

      // Emit socket event
      req.app
        .get("io")
        .emit("pledge:arrived", { requestId: reqId, pledgeId: pledge._id });

      // Award credit points to donor upon successful arrival and set cooldown start
      try {
        // Award Blood Credits
        await User.updateOne(
          { _id: pledge.donor },
          { $inc: { creditPoints: 10 }, $set: { lastDonationDate: new Date() } }
        );
        // clear active code on donor side via event
        req.app
          .get("io")
          .emit("donor:clear-code", { donorId: pledge.donor.toString() });
      } catch {}

      res.json({ ok: true, certificateId: pledge.certificateId });
    } catch (err) {
      res.status(500).json({ message: "Failed to verify arrival" });
    }
  }
);

// Simulated emergency: create N requests around a point and emit events
router.post(
  "/simulate",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const hospital = await User.findById(req.user._id);
      if (!hospital?.location?.coordinates)
        return res.status(400).json({ message: "Hospital location not set" });
      const count = Math.min(Number(req.body?.count || 3), 10);
      const radiusKm = Math.max(
        1,
        Math.min(Number(req.body?.radiusKm || 5), 20)
      );
      const mix = req.body?.mix === "same" ? "same" : "random";
      const created = await simulateRequestsForHospital(
        hospital,
        count,
        req.app.get("io"),
        { radiusKm, mix }
      );
      res.json({ ok: true, created });
    } catch (err) {
      res.status(500).json({ message: "Failed to simulate emergency" });
    }
  }
);

// GET alias for simulate to avoid 404s when testing via browser (requires auth)
router.get(
  "/simulate",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const hospital = await User.findById(req.user._id);
      if (!hospital?.location?.coordinates)
        return res.status(400).json({ message: "Hospital location not set" });
      const count = Math.min(Number(req.query.count || 3), 10);
      const radiusKm = Math.max(
        1,
        Math.min(Number(req.query.radiusKm || 5), 20)
      );
      const mix = req.query.mix === "same" ? "same" : "random";
      const created = await simulateRequestsForHospital(
        hospital,
        count,
        req.app.get("io"),
        { radiusKm, mix }
      );
      res.json({ ok: true, created });
    } catch (err) {
      res.status(500).json({ message: "Failed to simulate emergency" });
    }
  }
);

// Clear simulated requests (close them)
router.post(
  "/simulate/clear",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      await BloodRequest.updateMany(
        { hospital: req.user._id, simulated: true, status: "active" },
        { $set: { status: "closed" } }
      );
      req.app.get("io").emit("requests:simulate", { cleared: true });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to clear simulations" });
    }
  }
);

// Donor readiness score (dummy data fallback)
router.get(
  "/readiness",
  authMiddleware,
  requireRole("donor"),
  async (req, res) => {
    try {
      const donor = await User.findById(req.user._id).lean();
      const now = Date.now();
      const last = donor?.lastDonationDate
        ? new Date(donor.lastDonationDate).getTime()
        : now - 90 * 24 * 3600 * 1000;
      const daysSince = Math.floor((now - last) / (24 * 3600 * 1000));

      // naive distance trend & availability window dummy values
      const distanceTrend = Math.random(); // 0..1 smaller is better
      const availability = 0.8; // treat as 80% available

      // score out of 100
      const score = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            Math.min(daysSince / 56, 1) * 50 + // cooldown weight
              (1 - distanceTrend) * 30 + // trend weight
              availability * 20 // availability weight
          )
        )
      );

      res.json({ score, daysSince, availability, distanceTrend });
    } catch (err) {
      res.status(500).json({ message: "Failed to compute readiness" });
    }
  }
);

// Hotspots: aggregate active requests density for heatmap
router.get("/hotspots", async (_req, res) => {
  try {
    const data = await BloodRequest.aggregate([
      { $match: { status: "active" } },
      {
        $project: {
          lng: { $arrayElemAt: ["$location.coordinates", 0] },
          lat: { $arrayElemAt: ["$location.coordinates", 1] },
        },
      },
      {
        $project: {
          lng: { $round: ["$lng", 2] },
          lat: { $round: ["$lat", 2] },
        },
      },
      { $group: { _id: { lng: "$lng", lat: "$lat" }, count: { $sum: 1 } } },
      { $project: { _id: 0, coordinates: ["$_id.lng", "$_id.lat"], count: 1 } },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to compute hotspots" });
  }
});

// Improve nearby by adding compatibility score
// Blood type compatibility - O+ can donate to O+ and O-
function compatibilityScore(donorType, neededType) {
  if (!donorType || !neededType) return 0;
  
  // Exact match is always compatible (highest priority)
  if (donorType === neededType) return 2;
  
  // O+ donors can donate to O+ recipients (same blood type)
  if (donorType === 'O+') {
    return (neededType === 'O+') ? 2 : 0;
  }
  
  // O- donors can donate to all blood types (universal donor)
  if (donorType === 'O-') {
    return 1;
  }
  
  // A+ donors can donate to A+ and AB+
  if (donorType === 'A+') {
    return (neededType === 'A+' || neededType === 'AB+') ? 1 : 0;
  }
  
  // A- donors can donate to A+, A-, AB+, AB-
  if (donorType === 'A-') {
    return (neededType === 'A+' || neededType === 'A-' || neededType === 'AB+' || neededType === 'AB-') ? 1 : 0;
  }
  
  // B+ donors can donate to B+ and AB+
  if (donorType === 'B+') {
    return (neededType === 'B+' || neededType === 'AB+') ? 1 : 0;
  }
  
  // B- donors can donate to B+, B-, AB+, AB-
  if (donorType === 'B-') {
    return (neededType === 'B+' || neededType === 'B-' || neededType === 'AB+' || neededType === 'AB-') ? 1 : 0;
  }
  
  // AB+ donors can only donate to AB+
  if (donorType === 'AB+') {
    return (neededType === 'AB+') ? 1 : 0;
  }
  
  // AB- donors can donate to AB+ and AB-
  if (donorType === 'AB-') {
    return (neededType === 'AB+' || neededType === 'AB-') ? 1 : 0;
  }
  
  return 0;
}

// Override existing nearby handler to append scores and sort
router.get(
  "/nearby",
  authMiddleware,
  requireRole("donor"),
  async (req, res) => {
    try {
      const donor = await User.findById(req.user._id).lean();
      if (!donor?.location?.coordinates) {
        // If donor has no location, try to use a default location or return all requests
        console.log(`Donor ${donor?.name} has no location, using fallback logic`);
        
        // Get all active requests without location filtering
        const allRequests = await BloodRequest.find({ status: "active" })
          .populate("hospital", "-password")
          .lean();
        
        const scored = allRequests.map((r) => {
          const compatScore = compatibilityScore(donor.bloodType, r.bloodType);
          return {
            ...r,
            compatibilityScore: compatScore,
            distanceKm: 0, // No distance calculation possible
            urgencyScore: (r.urgencyLevel || 3) * 20,
            donorBloodType: donor.bloodType,
            requestBloodType: r.bloodType,
            isExactMatch: donor.bloodType === r.bloodType,
            isOPlusMatch: donor.bloodType === 'O+' && r.bloodType === 'O+',
          };
        }).sort((a, b) => b.compatibilityScore - a.compatibilityScore);
        
        return res.json(scored);
      }

      const [lng, lat] = donor.location.coordinates;

      const results = await BloodRequest.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distanceMeters",
            spherical: true,
            maxDistance: 50000, // 50km
            // Show all active requests - we'll filter by compatibility later
            query: { status: "active" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "hospital",
            foreignField: "_id",
            as: "hospital",
          },
        },
        { $unwind: "$hospital" },
        { $project: { "hospital.password": 0 } },
      ]);

      const scored = results
        .map((r) => {
          const distanceKm = (r.distanceMeters || 0) / 1000;
          const compatScore = compatibilityScore(
            donor.bloodType,
            r.bloodType
          );
          
          // Enhanced scoring for O+ donors seeing O+ requests
          let enhancedScore = compatScore;
          if (donor.bloodType === 'O+' && r.bloodType === 'O+') {
            enhancedScore = 10; // Highest priority for O+ donors seeing O+ requests
          }
          
          const urgencyScore = computeUrgencyScore({
            donor,
            request: r,
            distanceKm,
          });
          
          return {
            ...r,
            compatibilityScore: enhancedScore,
            distanceKm,
            urgencyScore,
            // Add donor blood type for debugging
            donorBloodType: donor.bloodType,
            // Add request blood type for debugging
            requestBloodType: r.bloodType,
            // Add enhanced compatibility info
            isExactMatch: donor.bloodType === r.bloodType,
            isOPlusMatch: donor.bloodType === 'O+' && r.bloodType === 'O+',
          };
        })
        .sort((a, b) => {
          // Sort by compatibility score first, then by urgency
          if (a.compatibilityScore !== b.compatibilityScore) {
            return b.compatibilityScore - a.compatibilityScore;
          }
          return b.urgencyScore - a.urgencyScore;
        });

      res.json(scored);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch nearby requests" });
    }
  }
);

// Donor: pledge history
router.get(
  "/pledges/mine",
  authMiddleware,
  requireRole("donor"),
  async (req, res) => {
    try {
      const pledges = await Pledge.find({ donor: req.user._id })
        .sort({ createdAt: -1 })
        .populate({
          path: "request",
          populate: { path: "hospital", select: "-password" },
        });
      res.json(pledges);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch pledges" });
    }
  }
);

// Test endpoint to create a sample blood request (for development/testing)
router.post("/test/create-request", async (req, res) => {
  try {
    // Find any hospital user
    const hospital = await User.findOne({ role: "hospital" });
    if (!hospital) {
      return res.status(404).json({ message: "No hospital found in database" });
    }

    // Create a test O+ blood request
    const request = await BloodRequest.create({
      hospital: hospital._id,
      bloodType: "O+",
      urgencyLevel: 4,
      unitsNeeded: 2,
      notes: "Test request for O+ blood",
      location: hospital.location || {
        type: "Point",
        coordinates: [78.59228332256787, 10.67197801341462]
      },
      status: "active"
    });

    const populated = await request.populate("hospital", "-password");
    
    // Emit socket event
    if (req.app.get("io")) {
      req.app.get("io").emit("request:new", populated);
    }

    res.json({ 
      message: "Test request created successfully", 
      request: populated 
    });
  } catch (err) {
    console.error("Test request creation failed:", err);
    res.status(500).json({ message: "Failed to create test request", error: err.message });
  }
});

// Debug endpoint to check database state
router.get("/test/debug", async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean();
    const requests = await BloodRequest.find({}).populate('hospital', '-password').lean();
    
    res.json({
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        bloodType: u.bloodType,
        hasLocation: !!u.location,
        coordinates: u.location?.coordinates
      })),
      requests: requests.map(r => ({
        id: r._id,
        bloodType: r.bloodType,
        status: r.status,
        hospital: r.hospital?.name,
        hasLocation: !!r.location,
        coordinates: r.location?.coordinates
      })),
      summary: {
        totalUsers: users.length,
        totalRequests: requests.length,
        activeRequests: requests.filter(r => r.status === 'active').length,
        hospitals: users.filter(u => u.role === 'hospital').length,
        donors: users.filter(u => u.role === 'donor').length
      }
    });
  } catch (err) {
    console.error("Debug endpoint failed:", err);
    res.status(500).json({ message: "Debug failed", error: err.message });
  }
});

// Donor: redeem free health checkup if credits >= 100
router.post(
  "/health-check/redeem",
  authMiddleware,
  requireRole("donor"),
  async (req, res) => {
    try {
      const donor = await User.findById(req.user._id);
      if (!donor) return res.status(404).json({ message: "User not found" });
      if ((donor.creditPoints || 0) < 100)
        return res.status(400).json({ message: "Not enough credits" });

      donor.creditPoints = (donor.creditPoints || 0) - 100;
      donor.lastHealthCheckAt = new Date();
      await donor.save();

      const userSafe = donor.toObject();
      delete userSafe.password;
      res.json({ ok: true, user: userSafe });
    } catch (err) {
      res.status(500).json({ message: "Failed to redeem health check" });
    }
  }
);

// Donor: availability toggle
router.put(
  "/availability",
  authMiddleware,
  requireRole("donor"),
  async (req, res) => {
    try {
      const availableNow = Boolean(req.body?.availableNow);
      await User.updateOne({ _id: req.user._id }, { $set: { availableNow } });
      res.json({ ok: true, availableNow });
    } catch (err) {
      res.status(500).json({ message: "Failed to update availability" });
    }
  }
);

// Donor: upload medical certificate (PDF/JPG/PNG)
router.post(
  "/certificates/upload",
  authMiddleware,
  requireRole("donor"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const url = `/uploads/certificates/${req.file.filename}`;
      const meta = {
        name: req.body?.name || req.file.originalname,
        url,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };
      await User.updateOne(
        { _id: req.user._id },
        { $push: { certificates: meta } }
      );
      res.json({ ok: true, certificate: meta });
    } catch (err) {
      res.status(500).json({ message: "Failed to upload certificate" });
    }
  }
);

// Donor: list my certificates
router.get(
  "/certificates/mine",
  authMiddleware,
  requireRole("donor"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id).lean();
      res.json(user?.certificates || []);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  }
);

// Donor: submit feedback for a pledge after arrival/fulfillment
router.post(
  "/pledges/:id/feedback",
  authMiddleware,
  requireRole("donor"),
  async (req, res) => {
    try {
      const { rating, comment } = req.body || {};
      if (!rating || rating < 1 || rating > 5)
        return res.status(400).json({ message: "Invalid rating" });
      const pledge = await Pledge.findOneAndUpdate(
        { _id: req.params.id, donor: req.user._id },
        {
          $set: {
            feedbackRating: rating,
            feedbackComment: comment || "",
            feedbackAt: new Date(),
          },
        },
        { new: true }
      );
      if (!pledge) return res.status(404).json({ message: "Pledge not found" });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  }
);

// Fulfill a request (hospital only, must own the request)
router.put(
  "/:id/fulfill",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const reqId = req.params.id;
      const updated = await BloodRequest.findOneAndUpdate(
        { _id: reqId, hospital: req.user._id },
        { $set: { status: "fulfilled" } },
        { new: true }
      ).populate("hospital", "-password");

      if (!updated)
        return res.status(404).json({ message: "Request not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to fulfill request" });
    }
  }
);

// Hospital: list own requests
router.get(
  "/mine",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const requests = await BloodRequest.find({ hospital: req.user._id })
        .populate("hospital", "-password")
        .sort({ createdAt: -1 });
      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch your requests" });
    }
  }
);

// Hospital consortium: swap units marketplace (simplified in-memory matching)
// GET inventory placeholder: hospitals advertise capacityUnits per blood type via their profile
router.get(
  "/market/listings",
  authMiddleware,
  requireRole("hospital"),
  async (_req, res) => {
    try {
      const hospitals = await User.find({ role: "hospital" }).select(
        "name capacityUnits location"
      );
      res.json(hospitals);
    } catch (err) {
      res.status(500).json({ message: "Failed to load listings" });
    }
  }
);

// Create a swap request: from hospital A to hospital B with units for specific bloodType
router.post(
  "/market/swap",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const { toHospitalId, bloodType, units = 1 } = req.body || {};
      if (!toHospitalId || !bloodType)
        return res.status(400).json({ message: "Missing fields" });
      const toHospital = await User.findOne({
        _id: toHospitalId,
        role: "hospital",
      });
      if (!toHospital)
        return res.status(404).json({ message: "Target hospital not found" });

      if (toHospitalId.toString() === req.user._id.toString()) {
        return res
          .status(400)
          .json({ message: "Cannot request swap from your own hospital" });
      }

      const swap = await SwapRequest.create({
        fromHospital: req.user._id,
        toHospital: toHospitalId,
        bloodType,
        units,
      });

      // Notify target hospital via socket (room by hospital userId)
      const payload = {
        _id: swap._id.toString(),
        fromHospitalId: req.user._id.toString(),
        fromHospitalName: (await User.findById(req.user._id).select("name"))
          .name,
        toHospitalId: toHospitalId.toString(),
        bloodType,
        units,
        status: "pending",
      };
      req.app
        .get("io")
        .to(toHospitalId.toString())
        .emit("market:swap:new", payload);
      // fallback broadcast for clients not in rooms yet (will filter client-side)
      req.app.get("io").emit("market:swap:new", payload);

      res.json({ ok: true, swapId: swap._id });
    } catch (err) {
      res.status(500).json({ message: "Failed to create swap" });
    }
  }
);

// List incoming swap requests for the logged-in hospital
router.get(
  "/market/swaps/incoming",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const swaps = await SwapRequest.find({ toHospital: req.user._id })
        .sort({ createdAt: -1 })
        .populate("fromHospital", "name");
      res.json(swaps);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch swaps" });
    }
  }
);

// List outgoing swap requests
router.get(
  "/market/swaps/outgoing",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const swaps = await SwapRequest.find({ fromHospital: req.user._id })
        .sort({ createdAt: -1 })
        .populate("toHospital", "name");
      res.json(swaps);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch swaps" });
    }
  }
);

// Accept or decline a swap
router.post(
  "/market/swaps/:id/:action",
  authMiddleware,
  requireRole("hospital"),
  async (req, res) => {
    try {
      const { id, action } = req.params;
      if (!["accept", "decline"].includes(action))
        return res.status(400).json({ message: "Invalid action" });
      const swap = await SwapRequest.findOne({
        _id: id,
        toHospital: req.user._id,
      });
      if (!swap) return res.status(404).json({ message: "Swap not found" });
      swap.status = action === "accept" ? "accepted" : "declined";
      await swap.save();
      // notify both sides
      req.app
        .get("io")
        .to(swap.fromHospital.toString())
        .emit("market:swap:update", {
          id: swap._id.toString(),
          status: swap.status,
        });
      req.app
        .get("io")
        .to(swap.toHospital.toString())
        .emit("market:swap:update", {
          id: swap._id.toString(),
          status: swap.status,
        });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update swap" });
    }
  }
);

export default router;

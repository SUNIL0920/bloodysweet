import express from 'express'
import User from '../models/User.js'
import BloodRequest from '../models/BloodRequest.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

// GET /api/hospitals/summary?near=lng,lat&radiusKm=50
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const near = (req.query.near || '').toString()
    const radiusKm = Math.min(Math.max(Number(req.query.radiusKm || 50), 1), 200)
    const [lngStr, latStr] = near.split(',')
    const lng = Number(lngStr)
    const lat = Number(latStr)

    let hospitals = []

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      // fallback: return latest 200 hospitals
      hospitals = await User.aggregate([
        { $match: { role: 'hospital' } },
        { $limit: 200 },
        { $lookup: { from: 'bloodrequests', let: { hid: '$_id' }, pipeline: [
          { $match: { $expr: { $and: [ { $eq: ['$hospital', '$$hid'] }, { $eq: ['$status', 'active'] } ] } } },
          { $count: 'cnt' }
        ], as: 'active' } },
        { $addFields: { activeCount: { $ifNull: [ { $arrayElemAt: ['$active.cnt', 0] }, 0 ] } } },
        { $project: { name: 1, location: 1, activeCount: 1 } }
      ])
    } else {
      hospitals = await User.aggregate([
        { $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanceMeters', spherical: true, maxDistance: radiusKm * 1000,
            query: { role: 'hospital' }
        } },
        { $lookup: { from: 'bloodrequests', let: { hid: '$_id' }, pipeline: [
          { $match: { $expr: { $and: [ { $eq: ['$hospital', '$$hid'] }, { $eq: ['$status', 'active'] } ] } } },
          { $count: 'cnt' }
        ], as: 'active' } },
        { $addFields: { activeCount: { $ifNull: [ { $arrayElemAt: ['$active.cnt', 0] }, 0 ] } } },
        { $project: { name: 1, location: 1, activeCount: 1, distanceMeters: 1 } }
      ])
    }

    res.json(hospitals)
  } catch (err) {
    res.status(500).json({ message: 'Failed to load hospitals summary' })
  }
})

export default router



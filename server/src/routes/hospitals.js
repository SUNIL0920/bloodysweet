import express from 'express'
import User from '../models/User.js'
import BloodRequest from '../models/BloodRequest.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { analyzeDocument } from '../services/aiVerifier.js'
import PDFDocument from 'pdfkit'

const router = express.Router()

// Storage for hospital verification docs
const hospitalDocsDir = path.resolve(process.cwd(), 'uploads/hospital_docs')
try { if (!fs.existsSync(hospitalDocsDir)) fs.mkdirSync(hospitalDocsDir, { recursive: true }) } catch {}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, hospitalDocsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  }
})
const allowedTypes = ['application/pdf','image/png','image/jpeg','image/jpg']
const fileFilter = (_req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Invalid file type. Only PDF/PNG/JPG allowed.'))
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } })

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

// GET /api/hospitals/verification/template/:type -> returns a blank template PDF with required headings
router.get('/verification/template/:type', async (req, res) => {
  try {
    const type = (req.params.type || '').toString()
    const titles = {
      license: ['Hospital License', 'License Number:', 'Issued To:', 'Address:', 'Valid From:', 'Valid Till:'],
      registrationProof: ['Registration Proof', 'Registration ID:', 'Registered Name:', 'Address:', 'Date of Registration:'],
      authorityLetter: ['Authority Letter', 'To Whomsoever It May Concern,', 'Authorized Person:', 'Authorized By:', 'Designation:', 'Date:'],
      accreditation: ['Accreditation Certificate', 'Certificate No:', 'Awarded To:', 'Address:', 'Accreditation Body:', 'Validity:']
    }[type]
    if (!titles) return res.status(400).json({ message: 'Invalid type' })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=${type}-template.pdf`)
    const doc = new PDFDocument({ margin: 50 })
    doc.pipe(res)
    doc.fontSize(20).text(titles[0], { align: 'center' })
    doc.moveDown()
    doc.fontSize(12)
    for (let i = 1; i < titles.length; i++) {
      doc.text(titles[i])
      doc.moveDown(0.5)
    }
    doc.moveDown().fontSize(10).fillColor('#555').text('Note: This is a template. Replace headings with your actual details when issuing the document.', { align: 'left' })
    doc.end()
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate template' })
  }
})

// POST /api/hospitals/verification/upload  (role: hospital)
// fields: type=license|registrationProof|authorityLetter|accreditation  file
router.post('/verification/upload', authMiddleware, async (req, res, next) => {
  if (req.user?.role !== 'hospital') return res.status(403).json({ message: 'Forbidden' })
  next()
}, upload.single('file'), async (req, res) => {
  try {
    const docType = (req.body?.type || '').toString() || 'other'
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
    const meta = {
      type: docType,
      name: req.file.originalname,
      url: `/uploads/hospital_docs/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size
    }
    // Run analysis
    let analysis = null
    try {
      analysis = await analyzeDocument({ type: docType, localPath: path.join(hospitalDocsDir, req.file.filename), mimeType: req.file.mimetype })
      meta.analysis = analysis
    } catch {}

    // If analysis verdict is pass/partial mark pending, if fail keep unverified but still store document
    const status = analysis?.verdict === 'fail' ? 'unverified' : 'pending'
    await User.updateOne({ _id: req.user._id }, { $push: { 'verification.documents': meta }, $set: { 'verification.status': status } })
    res.json({ ok: true, document: meta, status })
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload document' })
  }
})

// POST /api/hospitals/verification/submit -> mark as pending review
router.post('/verification/submit', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'hospital') return res.status(403).json({ message: 'Forbidden' })
    await User.updateOne({ _id: req.user._id }, { $set: { 'verification.status': 'pending', 'verification.reviewedAt': null, 'verification.notes': '' } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit verification' })
  }
})

// GET /api/hospitals/verification/mine
router.get('/verification/mine', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'hospital') return res.status(403).json({ message: 'Forbidden' })
    const user = await User.findById(req.user._id).select('verification')
    res.json(user?.verification || { status: 'unverified', documents: [] })
  } catch (err) {
    res.status(500).json({ message: 'Failed to load verification' })
  }
})

export default router



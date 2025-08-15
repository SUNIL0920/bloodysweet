import express from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { sendEmail } from '../services/mailer.js'

const router = express.Router()

// Send a test email to the current user's email (or provided `to`)
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const to = (req.body?.to || req.user?.email || '').trim()
    if (!to) return res.status(400).json({ message: 'No destination email found' })

    const subject = 'Blood Alert - Test Email'
    const text = 'This is a test email from Blood Alert to verify SMTP configuration.'
    const html = `<div style="font-family:Inter,Arial,Helvetica,sans-serif;padding:16px"><h2>Blood Alert</h2><p>${text}</p></div>`
    const info = await sendEmail({ to, subject, text, html })

    // Try to extract preview URL (Ethereal only)
    const previewUrl = info?.preview || info?.messageId ? undefined : undefined
    // The actual preview is logged inside sendEmail via nodemailer.getTestMessageUrl

    res.json({ ok: true, messageId: info?.messageId })
  } catch (err) {
    res.status(500).json({ message: 'Failed to send test email' })
  }
})

export default router



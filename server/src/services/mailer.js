import nodemailer from 'nodemailer'

let transportPromise = null

async function createTransport() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = process.env.SMTP_SECURE === 'true'

  if (host && port && user && pass) {
    return nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
  }

  // Fallback: Ethereal test account (emails are viewable via preview URL; not delivered)
  const testAccount = await nodemailer.createTestAccount()
  const transport = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass }
  })
  return transport
}

export async function getTransport() {
  if (!transportPromise) {
    transportPromise = createTransport()
  }
  return transportPromise
}

export async function sendEmail({ to, subject, html, text, from }) {
  const fromHeader = from || process.env.FROM_EMAIL || 'Blood Alert <no-reply@blood-alert.local>'
  const transport = await getTransport()
  const info = await transport.sendMail({ from: fromHeader, to, subject, html, text })
  // If using Ethereal, log preview URL
  const preview = nodemailer.getTestMessageUrl(info)
  if (preview) {
    console.log('Ethereal email preview:', preview)
  }
  return info
}



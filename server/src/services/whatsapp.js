import fetch from 'node-fetch'

// Free option: CallMeBot WhatsApp API (for personal testing). Requires user to create a chat once with the bot.
// Docs: https://www.callmebot.com/blog/free-api-whatsapp-messages/

const ENABLED = process.env.WHATSAPP_ENABLED === 'true'

export async function sendWhatsAppViaCallMeBot({ phone, text }) {
  if (!ENABLED) return { ok: false, reason: 'disabled' }
  if (!phone || !text) return { ok: false, reason: 'missing' }
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(process.env.CALLMEBOT_API_KEY || '123456')}`
    const res = await fetch(url)
    const body = await res.text()
    const ok = res.ok && /Message sent|success/i.test(body)
    return { ok, response: body }
  } catch (e) {
    return { ok: false, error: e?.message }
  }
}

// Optional: Twilio WhatsApp Sandbox support (requires free Twilio trial and user joining sandbox)
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in env to enable.
export async function sendWhatsAppViaTwilio({ phone, text }) {
  if (!ENABLED) return { ok: false, reason: 'disabled' }
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM // e.g., 'whatsapp:+14155238886'
  if (!sid || !token || !from) return { ok: false, reason: 'twilio-not-configured' }
  try {
    const twilio = (await import('twilio')).default
    const client = twilio(sid, token)
    const res = await client.messages.create({ from, to: `whatsapp:${phone}`, body: text })
    return { ok: true, sid: res.sid }
  } catch (e) {
    return { ok: false, error: e?.message }
  }
}

export async function sendWhatsApp({ phone, text }) {
  // Prefer Twilio if configured, else fallback to CallMeBot
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
    return await sendWhatsAppViaTwilio({ phone, text })
  }
  return await sendWhatsAppViaCallMeBot({ phone, text })
}








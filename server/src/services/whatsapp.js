const DEFAULT_CC = (process.env.WHATSAPP_DEFAULT_CC || '+91').trim() // e.g., '+91'

function isEnabled() {
  const v = (process.env.WHATSAPP_ENABLED || '').toString().trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

function normalizePhone(raw) {
  if (!raw) return ''
  let p = String(raw).trim().replace(/^whatsapp:/i, '')
  // remove spaces/dashes
  p = p.replace(/[^0-9+]/g, '')
  if (!p.startsWith('+')) {
    // prepend default country code
    p = `${DEFAULT_CC}${p}`
  }
  return p
}
// Twilio WhatsApp (requires active Twilio credentials and a WhatsApp-enabled from number)
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in env to enable.
export async function sendWhatsAppViaTwilio({ phone, text }) {
  if (!isEnabled()) {
    try { console.warn('[Twilio] disabled via WHATSAPP_ENABLED=false') } catch {}
    return { ok: false, reason: 'disabled' }
  }
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  let from = process.env.TWILIO_WHATSAPP_FROM // e.g., 'whatsapp:+14155238886' or '+1415...'
  if (!sid || !token || !from) {
    try { console.warn('[Twilio] missing config', { hasSid: !!sid, hasToken: !!token, from: from || null }) } catch {}
    return { ok: false, reason: 'twilio-not-configured' }
  }
  if (!/^whatsapp:/i.test(from)) {
    // normalize from to required format
    from = `whatsapp:${normalizePhone(from)}`
  }
  try {
    const twilio = (await import('twilio')).default
    const client = twilio(sid, token)
    const to = normalizePhone(phone)
    try { console.log('[Twilio] sending whatsapp', { to, from, bytes: (text||'').length }) } catch {}
    const res = await client.messages.create({ from, to: `whatsapp:${to}`, body: text })
    try { console.log('[Twilio] sent', { sid: res?.sid, status: res?.status }) } catch {}
    return { ok: true, sid: res.sid }
  } catch (e) {
    try { console.error('[Twilio] send error', e?.message || e) } catch {}
    // Optional fallback to sandbox sender if configured or default present
    const sandboxFromRaw = process.env.TWILIO_WHATSAPP_SANDBOX || '+14155238886'
    const sandboxFrom = `whatsapp:${normalizePhone(sandboxFromRaw)}`
    const errMsg = (e?.message || '').toLowerCase()
    const canRetry = sandboxFrom && from !== sandboxFrom && /channel|from address|whatsapp sender/.test(errMsg)
    if (canRetry) {
      try {
        try { console.warn('[Twilio] retry via sandbox sender', sandboxFrom) } catch {}
        const twilio = (await import('twilio')).default
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        const to = normalizePhone(phone)
        const res = await client.messages.create({ from: sandboxFrom, to: `whatsapp:${to}`, body: text })
        try { console.log('[Twilio] sent via sandbox', { sid: res?.sid, status: res?.status }) } catch {}
        return { ok: true, sid: res.sid }
      } catch (e2) {
        try { console.error('[Twilio] sandbox send error', e2?.message || e2) } catch {}
        return { ok: false, error: e?.message || e2?.message }
      }
    }
    return { ok: false, error: e?.message }
  }
}

export async function sendWhatsApp({ phone, text }) {
  // Twilio-only sending
  const res = await sendWhatsAppViaTwilio({ phone, text })
  if (!res?.ok) {
    try { console.warn('[Twilio] send failed', { phone, reason: res?.reason, error: res?.error }) } catch {}
  }
  return res
}








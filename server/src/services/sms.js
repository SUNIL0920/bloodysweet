import fetch from 'node-fetch'

// Free route: Vonage (formerly Nexmo) trial can send to verified numbers; D7 Networks offers free trial; Textbelt has a free demo.
// We'll integrate Textbelt's demo (1/day per IP) and optionally use Fast2SMS (India) if env vars are present.

export async function sendSMSViaTextbelt({ phone, text }) {
  const key = process.env.TEXTBELT_KEY || 'textbelt' // 'textbelt' = demo quota
  try {
    const res = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: text, key })
    })
    const json = await res.json()
    if (process.env.DEBUG_SMS === 'true') console.log('Textbelt SMS response:', json)
    return { ok: Boolean(json?.success), response: json }
  } catch (e) {
    if (process.env.DEBUG_SMS === 'true') console.log('Textbelt SMS error:', e?.message)
    return { ok: false, error: e?.message }
  }
}

// Optional India-friendly provider: Fast2SMS (requires free account and API key; supports DND/National)
export async function sendSMSViaFast2SMS({ phone, text }) {
  const key = process.env.FAST2SMS_API_KEY
  if (!key) return { ok: false, reason: 'not-configured' }
  try {
    // Fast2SMS expects Indian numbers without country code. Normalize by stripping non-digits and taking last 10 digits.
    const digits = String(phone).replace(/\D/g, '')
    const normalized = digits.length > 10 ? digits.slice(-10) : digits
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(key)}&route=v3&sender_id=TXTIND&message=${encodeURIComponent(text)}&language=english&flash=0&numbers=${encodeURIComponent(normalized)}`
    const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } })
    const json = await res.json().catch(()=>({}))
    if (process.env.DEBUG_SMS === 'true') console.log('Fast2SMS response:', json)
    const ok = res.ok && (json?.return === true || json?.success === true)
    return { ok, response: json }
  } catch (e) {
    if (process.env.DEBUG_SMS === 'true') console.log('Fast2SMS error:', e?.message)
    return { ok: false, error: e?.message }
  }
}

// Optional: Twilio trial fallback (works to verified numbers)
export async function sendSMSViaTwilio({ phone, text }) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_SMS_FROM // e.g., +1XXXXXXXXXX (not whatsapp:)
  if (!sid || !token || !from) return { ok: false, reason: 'twilio-not-configured' }
  try {
    const twilio = (await import('twilio')).default
    const client = twilio(sid, token)
    const res = await client.messages.create({ from, to: phone, body: text })
    if (process.env.DEBUG_SMS === 'true') console.log('Twilio SMS sid:', res?.sid)
    return { ok: true, sid: res?.sid }
  } catch (e) {
    if (process.env.DEBUG_SMS === 'true') console.log('Twilio SMS error:', e?.message)
    return { ok: false, error: e?.message }
  }
}

export async function sendSMS({ phone, text }) {
  // Prefer Fast2SMS for Indian numbers if configured, else fallback to Textbelt
  if (process.env.FAST2SMS_API_KEY) {
    const res = await sendSMSViaFast2SMS({ phone, text })
    if (!res?.ok) {
      if (process.env.DEBUG_SMS === 'true') console.log('Fast2SMS failed, trying Twilio SMS fallback...')
      const tw = await sendSMSViaTwilio({ phone, text })
      if (tw?.ok) return tw
      if (process.env.DEBUG_SMS === 'true') console.log('Twilio SMS not configured/failed, falling back to Textbelt demo...')
      return await sendSMSViaTextbelt({ phone, text })
    }
    return res
  }
  // If no Fast2SMS configured, try Twilio before Textbelt
  const tw2 = await sendSMSViaTwilio({ phone, text })
  if (tw2?.ok) return tw2
  return await sendSMSViaTextbelt({ phone, text })
}



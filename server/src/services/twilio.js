import twilio from "twilio";

let cachedClient = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }
  cachedClient = twilio(accountSid, authToken);
  return cachedClient;
}

export async function sendWhatsApp({
  to,
  body,
  from,
  contentSid,
  contentVariables,
}) {
  if (!to || !body) throw new Error("to and body are required");
  const client = getClient();
  const configuredFrom = from || process.env.TWILIO_WHATSAPP_FROM;
  const sandboxFrom = "+14155238886";
  const fromNumber = configuredFrom || sandboxFrom;

  const payload = {
    from: `whatsapp:${fromNumber.replace(/^whatsapp:/, "")}`,
    to: `whatsapp:${to.replace(/^whatsapp:/, "")}`,
    body,
  };

  if (contentSid) {
    payload.contentSid = contentSid;
    if (contentVariables) {
      payload.contentVariables =
        typeof contentVariables === "string"
          ? contentVariables
          : JSON.stringify(contentVariables);
    }
  }

  try {
    const msg = await client.messages.create(payload);
    return msg;
  } catch (err) {
    // Fallback to Twilio WhatsApp Sandbox if primary number fails and wasn't sandbox
    if ((configuredFrom || "").replace(/^whatsapp:/, "") !== sandboxFrom) {
      try {
        const fallbackMsg = await client.messages.create({
          ...payload,
          from: `whatsapp:${sandboxFrom}`,
        });
        return fallbackMsg;
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
    throw err;
  }
}

export default { sendWhatsApp };

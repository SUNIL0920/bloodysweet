# Twilio WhatsApp Setup

Add these env vars to `server/.env`:

```
TWILIO_ACCOUNT_SID=AC896c3778782fb789b97896d8c9dc81ef
TWILIO_AUTH_TOKEN=79bfb5579c51f02c60574968ef077a05
TWILIO_WHATSAPP_FROM=+18156620697
```

Run the server with PowerShell:

```
cd server
$env:MONGO_URI="mongodb://127.0.0.1:27017/"
$env:JWT_SECRET="replace_me"
$env:TWILIO_ACCOUNT_SID="AC896c3778782fb789b97896d8c9dc81ef"
$env:TWILIO_AUTH_TOKEN="79bfb5579c51f02c60574968ef077a05"
$env:TWILIO_WHATSAPP_FROM="+18156620697"
node src/server.js
```

Ensure donor users have a `phone` in E.164 format (e.g., `+15551234567`).



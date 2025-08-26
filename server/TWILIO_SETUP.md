# Twilio WhatsApp Setup

Add these env vars to `server/.env`:

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_FROM=your_twilio_whatsapp_number_here
```

Run the server with PowerShell:

```
cd server
$env:MONGO_URI="mongodb://127.0.0.1:27017/"
$env:JWT_SECRET="replace_me"
$env:TWILIO_ACCOUNT_SID="your_twilio_account_sid_here"
$env:TWILIO_AUTH_TOKEN="your_twilio_auth_token_here"
$env:TWILIO_WHATSAPP_FROM="your_twilio_whatsapp_number_here"
node src/server.js
```

Ensure donor users have a `phone` in E.164 format (e.g., `+15551234567`).

**IMPORTANT**: Never commit real credentials to version control. Use environment variables and keep your `.env` file in `.gitignore`.



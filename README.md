#  Full-Stack Blood Alert App

A monorepo containing a React + Vite client and a Node.js + Express + MongoDB server with Socket.IO.

### Tech Stack
- Client: React 19, Vite, React Router, Tailwind CSS, Leaflet
- Server: Node.js, Express, MongoDB (Mongoose), Socket.IO, JWT auth

### Prerequisites
- Node.js 18+ and npm
- A MongoDB connection string (Atlas or local)

---

## 1) Quick Start

Clone or download the repository, then in separate terminals:

- Server
  ```bash
  cd server
  npm install
  # Create .env file
  cat > .env << 'EOF'
  MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/blood_alert_mvp?retryWrites=true&w=majority
  CORS_ORIGIN=http://localhost:5173
  PORT=5000
  EOF

  npm run dev   # nodemon, or use: npm start
  ```

- Client
  ```bash
  cd client
  npm install
  npm run dev   # starts Vite dev server (default: http://localhost:5173)
  ```

The server will be available at `http://localhost:5000` and exposes:
- `GET /` — health check
- `POST /api/auth/...` — auth routes
- `GET/POST /api/requests/...` — blood requests

Ensure `CORS_ORIGIN` matches your client URL.

---

## 2) Environment Variables (server/.env)
Create `server/.env` with at least:
```env
MONGO_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:5173
PORT=5000
JWT_SECRET=change-me-dev

# SMTP (pick your provider and fill these)
# SendGrid
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASS=YOUR_SENDGRID_API_KEY
# SMTP_SECURE=false

# Gmail (App Password required)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=465
# SMTP_USER=your@gmail.com
# SMTP_PASS=YOUR_GMAIL_APP_PASSWORD
# SMTP_SECURE=true

# Office365
# SMTP_HOST=smtp.office365.com
# SMTP_PORT=587
# SMTP_USER=your@yourdomain.com
# SMTP_PASS=YOUR_O365_PASSWORD_OR_APP_PASSWORD
# SMTP_SECURE=false

# Amazon SES (SMTP interface)
# SMTP_HOST=email-smtp.YOUR-REGION.amazonaws.com
# SMTP_PORT=587
# SMTP_USER=YOUR_SES_SMTP_USERNAME
# SMTP_PASS=YOUR_SES_SMTP_PASSWORD
# SMTP_SECURE=false

FROM_EMAIL=Blood Alert <no-reply@yourdomain.com>
```

### SMS / WhatsApp additions
Append these to `server/.env` to enable SMS and optional WhatsApp alerts:

```env
# SMS (primary)
TEXTBELT_KEY=textbelt
# FAST2SMS_API_KEY=YOUR_FAST2SMS_API_KEY

# WhatsApp (optional)
WHATSAPP_ENABLED=false
# CALLMEBOT_API_KEY=YOUR_CALLMEBOT_KEY
# TWILIO_ACCOUNT_SID=your_twilio_sid
# TWILIO_AUTH_TOKEN=your_twilio_token
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```
Notes:
- If `MONGO_URI` ends with `/`, the server will append `blood_alert_mvp?retryWrites=true&w=majority`.
- Update `CORS_ORIGIN` to your client origin in production.

---

## 3) Scripts
- Server (`server/package.json`):
  - `npm run dev` — Start with nodemon
  - `npm start` — Start with node
- Client (`client/package.json`):
  - `npm run dev` — Vite dev server
  - `npm run build` — Build for production
  - `npm run preview` — Preview built client

---

## 4) Production Build (client)
```bash
cd client
npm install
npm run build
```
The output is in `client/dist/`.

---

## 5) API Base URL
The client expects the API at the same origin during development, or you can configure your client code to point to `http://localhost:5000`.

---

## 6) Push to GitHub (manual fallback)
If the GitHub CLI is not available or not authenticated, you can push manually:
```bash
# From the repository root
git init
git add .
git commit -m "Initial commit"

# Create a repo named "bajaj" in your GitHub account first,
# then replace <YOUR_USERNAME> below
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/bajaj.git
git push -u origin main
```

---

## 7) Notes
- Tailwind CSS is already configured in the client.
- Socket.IO server is enabled and ready for realtime features.
- Update environment variables before running the server. 

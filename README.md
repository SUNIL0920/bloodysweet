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



## 2) Scripts
- Server (`server/package.json`):
  - `npm run dev` — Start with nodemon
  - `npm start` — Start with node
- Client (`client/package.json`):
  - `npm run dev` — Vite dev server
  - `npm run build` — Build for production
  - `npm run preview` — Preview built client

---


## 3) API Base URL
The client expects the API at the same origin during development, or you can configure your client code to point to `http://localhost:5000`.

---


## 4) Notes
- Tailwind CSS is already configured in the client.
- Socket.IO server is enabled and ready for realtime features.
- Update environment variables before running the server. 
# blood-donation
# blood-donation

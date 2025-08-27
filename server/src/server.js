import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import morgan from "morgan";
import { Server as SocketIOServer } from "socket.io";
import authRoutes from "./routes/auth.js";
import hospitalRoutes from "./routes/hospitals.js";
import notificationRoutes from "./routes/notifications.js";
import requestRoutes from "./routes/requests.js";
import path from "path";
import fs from "fs";
// Ensure models are initialized so indexes are created on startup
import BloodRequest from "./models/BloodRequest.js";
import Pledge from "./models/Pledge.js";
import SwapRequest from "./models/SwapRequest.js";
import User from "./models/User.js";

dotenv.config();
// Log critical WhatsApp env flags on startup
try {
  console.log('[WA] env', {
    enabled: (process.env.WHATSAPP_ENABLED || '').toString(),
    from: process.env.TWILIO_WHATSAPP_FROM || null,
    hasSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasToken: !!process.env.TWILIO_AUTH_TOKEN,
  });
} catch {}

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { 
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:5175'
    ],
    credentials: true
  },
});

app.set("io", io);

// Middleware - Simplified CORS for production
app.use(cors({ 
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:3000',
    'http://localhost:5175',
    process.env.CORS_ORIGIN,
    'https://bloodyfro.vercel.app'
  ].filter(Boolean),
  credentials: true 
}));
app.use(express.json());
app.use(morgan("dev"));
// Serve uploads statically
try {
  const up = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(up)) fs.mkdirSync(up, { recursive: true });
  const certs = path.join(up, "certificates");
  if (!fs.existsSync(certs)) fs.mkdirSync(certs, { recursive: true });
  app.use("/uploads", express.static(up));
} catch {}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/hospitals", hospitalRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Blood Alert API" });
});

// Health check endpoint for Vercel
app.get("/health", (_req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Database connection test endpoint
app.get("/test-db", async (_req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statusMap = {
      0: "disconnected",
      1: "connected", 
      2: "connecting",
      3: "disconnecting"
    };
    
    res.json({
      status: "ok",
      database: statusMap[dbStatus] || "unknown",
      readyState: dbStatus,
      timestamp: new Date().toISOString(),
      mongoUri: process.env.MONGO_URI ? "Set" : "Not Set"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/blood_alert_mvp";
    console.log("Connecting to MongoDB...");
    const finalUri = mongoUri.endsWith("/")
      ? `${mongoUri}blood_alert_mvp?retryWrites=true&w=majority`
      : mongoUri;
    await mongoose.connect(finalUri, { autoIndex: true });
    console.log("Connected to MongoDB successfully");

    // Create indexes before serving traffic
    await Promise.all([
      User.init(),
      BloodRequest.init(),
      Pledge.init(),
      SwapRequest.init(),
    ]);

    io.on("connection", (socket) => {
      console.log("Client connected to socket");
      // Allow clients to join a private room keyed by userId for targeted events
      socket.on("auth", (userId) => {
        try {
          if (typeof userId === "string" && userId.trim()) {
            socket.join(userId.trim());
          }
        } catch {}
      });
    });

    // Only start HTTP server if not in Vercel environment
    if (process.env.VERCEL !== "1") {
      httpServer.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
        console.log(`API available at http://localhost:${PORT}`);
      });
    } else {
      console.log("Running in Vercel serverless environment");
    }
  } catch (err) {
    console.error("Failed to start server", err);
    console.log(
      "If MongoDB is not running, please start it or set MONGO_URI environment variable"
    );
    if (process.env.VERCEL !== "1") {
      process.exit(1);
    }
  }
}

// For Vercel serverless, export the app
export default app;

// Only call start() if not in Vercel
if (process.env.VERCEL !== "1") {
  start();
}

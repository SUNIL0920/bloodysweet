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

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://localhost:3000',
  'http://localhost:5175'
];

app.use(cors({ 
  origin: function (origin, callback) {
    // Debug: Log the origin being requested
    console.log('CORS request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('No origin, allowing request');
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('Origin blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
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

    httpServer.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    console.log(
      "If MongoDB is not running, please start it or set MONGO_URI environment variable"
    );
    process.exit(1);
  }
}

start();

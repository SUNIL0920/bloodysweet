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
// Ensure models are initialized so indexes are created on startup
import BloodRequest from "./models/BloodRequest.js";
import Pledge from "./models/Pledge.js";
import SwapRequest from "./models/SwapRequest.js";
import User from "./models/User.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || "*" },
});

app.set("io", io);

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

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

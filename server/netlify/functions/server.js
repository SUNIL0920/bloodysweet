import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import authRoutes from "../../src/routes/auth.js";
import hospitalRoutes from "../../src/routes/hospitals.js";
import notificationRoutes from "../../src/routes/notifications.js";
import requestRoutes from "../../src/routes/requests.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/hospitals", hospitalRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Blood Alert API" });
});

app.get("/health", (_req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production"
  });
});

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

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/blood_alert";
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri, { 
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB successfully");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}

// Initialize database connection
connectDB();

// Export for Netlify
export default app;

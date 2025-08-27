import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

// Import routes
import authRoutes from '../src/routes/auth.js';
import hospitalRoutes from '../src/routes/hospitals.js';
import notificationRoutes from '../src/routes/notifications.js';
import requestRoutes from '../src/routes/requests.js';

// Import models
import BloodRequest from '../src/models/BloodRequest.js';
import Pledge from '../src/models/Pledge.js';
import SwapRequest from '../src/models/SwapRequest.js';
import User from '../src/models/User.js';

dotenv.config();

const app = express();

// CORS configuration for Vercel
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://localhost:3000',
  'http://localhost:5175',
  process.env.CORS_ORIGIN,
  'https://*.vercel.app',
  'https://*.vercel.com'
].filter(Boolean);

app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const domain = allowed.replace('*.', '');
        return origin.endsWith(domain);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
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

app.get("/health", (_req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production"
  });
});

// Initialize MongoDB connection
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not found in environment variables");
      return;
    }
    
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri, { 
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log("Connected to MongoDB successfully");
    isConnected = true;
    
    // Create indexes
    await Promise.all([
      User.init(),
      BloodRequest.init(),
      Pledge.init(),
      SwapRequest.init(),
    ]);
    
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    isConnected = false;
  }
}

// Connect to DB on first request
app.use(async (req, res, next) => {
  if (!isConnected) {
    await connectDB();
  }
  next();
});

export default app;

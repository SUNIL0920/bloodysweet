import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || '*' }
});

app.set('io', io);

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Blood Alert API' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined');
    }
    const finalUri = mongoUri.endsWith('/') ? `${mongoUri}blood_alert_mvp?retryWrites=true&w=majority` : mongoUri;
    await mongoose.connect(finalUri, {});

    io.on('connection', () => {});

    httpServer.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start(); 
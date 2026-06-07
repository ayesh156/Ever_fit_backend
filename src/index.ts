import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

const allowedOrigins = [
  frontendUrl,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Security headers with env-based CSP
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          `http://localhost:${PORT}`,
          ...allowedOrigins,
          ...allowedOrigins.map(o => o.replace(/^http/, 'ws')),
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://fonts.googleapis.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'blob:', `http://localhost:${PORT}`],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'", ...allowedOrigins],
      },
    },
  })
);

app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Fallback static file serving
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(__dirname, '../public', req.path);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'EverFit API is running' });
});

// Routes
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import settingsRoutes from './routes/settingsRoutes';
import subscriberRoutes from './routes/subscriberRoutes';
import orderRoutes from './routes/orderRoutes';

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/orders', orderRoutes);

// Socket.IO for real-time updates
import { Server } from 'socket.io';
export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

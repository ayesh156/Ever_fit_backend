import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import settingsRoutes from './routes/settingsRoutes';
import subscriberRoutes from './routes/subscriberRoutes';
import orderRoutes from './routes/orderRoutes';

dotenv.config();

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ].filter(Boolean) as string[],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
].filter(Boolean) as string[];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Helmet with cross-origin resource sharing enabled for receipt previews
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
          'http://localhost:5000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175',
          'ws://localhost:5173',
          'ws://localhost:5174',
          'ws://localhost:5175',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://fonts.googleapis.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'http://localhost:5000'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'", 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
      },
    },
  })
);

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../public/uploads')));
// Fallback: also serve from project root for receipt uploads
const staticPaths = [
  path.join(__dirname, '../public'),
];
app.use('/uploads', (req, res, next) => {
  const served = staticPaths.some(basePath => {
    const filePath = path.join(basePath, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
      return true;
    }
    return false;
  });
  if (!served) next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'EverFit API is running' });
});

// Debug endpoint — hit http://localhost:5000/api/debug/orders in browser to verify DB connection
app.get('/api/debug/orders', async (_req, res) => {
  try {
    const { prisma } = await import('./lib/prisma');
    const count = await prisma.order.count();
    const latest = await prisma.order.findMany({ take: 3, orderBy: { createdAt: 'desc' }, select: { id: true, customerName: true, totalAmount: true, status: true, createdAt: true } });
    res.json({ ok: true, totalOrders: count, latest });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/orders', orderRoutes);

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
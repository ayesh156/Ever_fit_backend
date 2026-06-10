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

// Test status page (HTML UI for server health check)
app.get('/test', (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server Status | Ever Fit</title>
  <style>
    body { margin: 0; padding: 0; background-color: #09090b; color: #f4f4f5; font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
    .card { background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .status-dot { display: inline-block; width: 12px; height: 12px; background-color: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; margin-right: 8px; }
    h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
    p { color: #a1a1aa; font-size: 14px; margin: 4px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1><span class="status-dot"></span> Ever Fit Backend Server is LIVE</h1>
    <p>The Node.js Express server is running successfully.</p>
    <br/>
    <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    <p><strong>Uptime:</strong> ${Math.floor(process.uptime())} seconds</p>
  </div>
</body>
</html>`;
  res.send(html);
});

// Routes
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import settingsRoutes from './routes/settingsRoutes';
import subscriberRoutes from './routes/subscriberRoutes';
import orderRoutes from './routes/orderRoutes';
import customerRoutes from './routes/customerRoutes';
import cityRoutes from './routes/cityRoutes';
import reportRoutes from './routes/reportRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import authRoutes from './routes/authRoutes';

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);

// Socket.IO for real-time updates
// The io instance is managed via the singleton in lib/socket.ts to avoid
// circular imports when route handlers need to call io.emit().
import { initIO } from './lib/socket';
export const io = initIO(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

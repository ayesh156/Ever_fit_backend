"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 5000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
const allowedOrigins = [
    frontendUrl,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
// Security headers with env-based CSP
app.use((0, helmet_1.default)({
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
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Serve uploaded files
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads')));
app.use('/api/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads')));
// Fallback static file serving
app.use('/uploads', (req, res, next) => {
    const filePath = path_1.default.join(__dirname, '../public', req.path);
    if (fs_1.default.existsSync(filePath)) {
        res.sendFile(filePath);
    }
    else {
        next();
    }
});
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'EverFit API is running' });
});
// Routes
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const subscriberRoutes_1 = __importDefault(require("./routes/subscriberRoutes"));
app.use('/api/products', productRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
app.use('/api/subscribers', subscriberRoutes_1.default);
httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map
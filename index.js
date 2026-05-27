import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { sequelize } from './db.js';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import './models/index.js';
import notificationService from './services/notification.js';
import PaymentController from './controllers/payment.js';
import { setupOAuthProviders } from './services/oauthProviders.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5500;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DEFAULT_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];
const normalizeOrigin = (origin) => (origin ? origin.trim().replace(/\/$/, '') : origin);
const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS || FRONTEND_URL)
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean)
        .concat(DEFAULT_ORIGINS.map(normalizeOrigin))
);

// Get __dirname equivalent in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Security middleware - Configure Helmet with cross-origin resource policy
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: null,
    }
  }
}));
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        if (allowedOrigins.has(normalizedOrigin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    optionsSuccessStatus: 204
}));
app.use(morgan('combined'));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 300 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health'
});
app.use('/api/', limiter);

// PayPal webhook requires raw body for signature verification
app.post('/api/payments/paypal/webhook', express.raw({ type: 'application/json' }), PaymentController.handlePayPalWebhook);
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), PaymentController.flutterwaveWebhook);
app.post('/api/payments/flutterwave/webhook', express.raw({ type: 'application/json' }), PaymentController.flutterwaveWebhook);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

setupOAuthProviders();
app.use(passport.initialize());

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// Serve uploaded files with proper path mapping
// Files are stored in public/uploads/ but should be accessible at /uploads/
app.use('/uploads', express.static(join(__dirname, 'public/uploads')));

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import taskRoutes from './routes/tasks.js';
import paymentRoutes from './routes/payments.js';
import payoutRoutes from './routes/payouts.js';
import messageRoutes from './routes/messages.js';
import profileRoutes from './routes/profile.js';
import dashboardRoutes from './routes/dashboard.js';
import guideRoutes from './routes/guides.js';
import scheduleRoutes from './routes/schedules.js';
import ratingRoutes from './routes/ratings.js';
import uploadRoutes from './routes/upload.js';
import certificateRoutes from './routes/certificates.js';
import travellerRoutes from './routes/traveller.js';
import tripRoutes from './routes/trips.js';
import complaintRoutes from './routes/complaints.js';
import adminRoutes from './routes/admin.js';
import mediaRoutes from './routes/media.js';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api', uploadRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/traveller', travellerRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Voya Backend'
    });
});

app.get('/', (req, res) => {
    // In production, serve the React frontend at the root
    if (process.env.NODE_ENV === 'production') {
        return res.sendFile(join(__dirname, 'public', 'index.html'));
    }
    res.status(200).json({
        success: true,
        message: 'Backend API is running successfully!',
        environment: 'Development'
    });
});

// ========================================
// In production, serve frontend SPA for non-API routes
// ========================================
// Catch all HTTP methods (GET, POST, PUT, DELETE, etc.)
app.all('*', (req, res) => {
    // For undefined API routes, return JSON 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint not found'
        });
    }
    // For all other routes, serve the React SPA
    if (process.env.NODE_ENV === 'production') {
        return res.sendFile(join(__dirname, 'public', 'index.html'));
    }
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Initialize database and start server
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Keep startup sync safe; alter mode can overflow MySQL key limits over repeated runs.
           await sequelize.sync();
        console.log('Database synchronized without dropping data.');

        const httpServer = http.createServer(app);

        const io = new SocketIOServer(httpServer, {
            cors: {
                origin: allowedOrigins,
                credentials: true
            }
        });

        io.use((socket, next) => {
            try {
                const rawToken = socket.handshake?.auth?.token;
                if (!rawToken) {
                    return next(new Error('Authentication token missing'));
                }

                const token = String(rawToken).startsWith('Bearer ')
                    ? String(rawToken).slice(7)
                    : String(rawToken);
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                socket.userId = decoded.id;
                socket.userRole = decoded.role || null;
                return next();
            } catch (error) {
                return next(new Error('Invalid socket token'));
            }
        });

        notificationService.setSocketIO(io);
        app.set('io', io);

        // Handle server listen errors (e.g., port already in use)
        httpServer.on('error', (err) => {
            if (err && err.code === 'EADDRINUSE') {
                const healthReq = http.get(`http://127.0.0.1:${PORT}/api/health`, (healthRes) => {
                    let body = '';
                    healthRes.on('data', (chunk) => {
                        body += chunk;
                    });

                    healthRes.on('end', () => {
                        let parsed = null;
                        try {
                            parsed = JSON.parse(body);
                        } catch (parseError) {
                            parsed = null;
                        }

                        if (healthRes.statusCode === 200 && parsed?.service === 'Voya Backend') {
                            console.log(`Port ${PORT} is already in use by an active Voya backend instance.`);
                            console.log('Startup skipped because backend is already running.');
                            process.exit(0);
                        }

                        console.error(`Port ${PORT} is already in use. Another process is listening on this port.`);
                        console.error('Options to resolve:');
                        console.error(`  - Stop the other process (Windows: "netstat -ano | findstr :${PORT}" then "taskkill /PID <pid> /F").`);
                        console.error('  - Change the PORT environment variable before starting this server.');
                        console.error('  - Restart your machine if you cannot identify the blocking process.');
                        process.exit(1);
                    });
                });

                healthReq.on('error', () => {
                    console.error(`Port ${PORT} is already in use. Another process is listening on this port.`);
                    console.error('Options to resolve:');
                    console.error(`  - Stop the other process (Windows: "netstat -ano | findstr :${PORT}" then "taskkill /PID <pid> /F").`);
                    console.error('  - Change the PORT environment variable before starting this server.');
                    console.error('  - Restart your machine if you cannot identify the blocking process.');
                    process.exit(1);
                });

                return;
            }

            console.error('HTTP server error:', err);
            process.exit(1);
        });

        io.on('connection', (socket) => {
            console.log(`Socket connected: ${socket.id}`);
            if (socket.userId) {
                socket.join(`user:${socket.userId}`);
            }
            if (socket.userRole) {
                socket.join(`role:${socket.userRole}`);
            }

            socket.on('join', (room) => {
                socket.join(room);
            });

            socket.on('send_message', (payload = {}) => {
                const targetUserId = payload.receiver_id || payload.recipientId || payload.toUserId;
                if (!targetUserId) {
                    return;
                }

                io.to(`user:${targetUserId}`).emit('new_message', {
                    sender_id: socket.userId,
                    receiver_id: targetUserId,
                    content: payload.content,
                    conversationId: String(socket.userId),
                    createdAt: new Date().toISOString()
                });
            });

            socket.on('typing', (payload = {}) => {
                const targetUserId = payload.toUserId || payload.recipientId || payload.conversationId;
                if (!targetUserId) {
                    return;
                }

                io.to(`user:${targetUserId}`).emit('typing', {
                    fromUserId: socket.userId,
                    isTyping: Boolean(payload.isTyping)
                });
            });

            socket.on('start_call', (payload = {}) => {
                const targetUserId = payload.toUserId || payload.recipientId || payload.conversationId;
                if (!targetUserId) {
                    return;
                }

                io.to(`user:${targetUserId}`).emit('incoming_call', {
                    fromUserId: socket.userId,
                    type: payload.type || 'audio',
                    startedAt: new Date().toISOString()
                });
            });

            socket.on('accept_call', (payload = {}) => {
                const targetUserId = payload.toUserId || payload.fromUserId;
                if (!targetUserId) {
                    return;
                }

                io.to(`user:${targetUserId}`).emit('call_accepted', {
                    byUserId: socket.userId,
                    acceptedAt: new Date().toISOString()
                });
            });

            socket.on('reject_call', (payload = {}) => {
                const targetUserId = payload.toUserId || payload.fromUserId;
                if (!targetUserId) {
                    return;
                }

                io.to(`user:${targetUserId}`).emit('call_rejected', {
                    byUserId: socket.userId,
                    rejectedAt: new Date().toISOString()
                });
            });

            socket.on('end_call', (payload = {}) => {
                const targetUserId = payload.toUserId || payload.fromUserId;
                if (!targetUserId) {
                    return;
                }

                io.to(`user:${targetUserId}`).emit('call_ended', {
                    byUserId: socket.userId,
                    endedAt: new Date().toISOString()
                });
            });

            socket.on('disconnect', () => {
                console.log(`Socket disconnected: ${socket.id}`);
            });
        });

        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}

startServer();

// Global process handlers to avoid unhandled crashes
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection:', reason);
});









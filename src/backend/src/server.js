import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import rideRoutes from './routes/rides.js';
import bookingRoutes from './routes/bookings.js';
import chatRoutes from './routes/chat.js';
import paymentRoutes from './routes/payments.js';
import bankAccountRoutes from './routes/bankAccount.js';
import profileRoutes from './routes/profile.js';
import ratingRoutes from './routes/ratings.js';
import alertRoutes from './routes/alerts.js';
import tripChatRoutes from './routes/trip_chat.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { setupMetrics, metricsMiddleware } from './utils/metrics.js';

// Import database
import { sequelize, testConnection } from './config/database.js';

// Import WebSocket handler
import { setupWebSocket } from './websocket/index.js';

// Import logger
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://127.0.0.1:3001',
      'http://localhost:3001',
      'http://127.0.0.1:5173',
      'http://localhost:5173'
    ],
    credentials: true
  }
});

// Setup WebSocket handlers
setupWebSocket(io);

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://127.0.0.1:3001',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Prometheus metrics
setupMetrics(app);
app.use(metricsMiddleware);

// Setup avatar directory
const AVATAR_DIR = process.env.AVATAR_DIR || 'data/avatars';
const avatarPath = path.isAbsolute(AVATAR_DIR) 
  ? AVATAR_DIR 
  : path.join(__dirname, '..', AVATAR_DIR);

if (!fs.existsSync(avatarPath)) {
  fs.mkdirSync(avatarPath, { recursive: true });
  logger.info(`✅ Created avatar directory: ${avatarPath}`);
} else {
  logger.info(`✅ Avatar directory exists: ${avatarPath}`);
}

// Serve static files (avatars)
app.use('/static/avatars', express.static(avatarPath));
app.use('/avatars', express.static(avatarPath)); // Also serve without /static prefix

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: sequelize.options.database
  });
});

// Debug endpoint
app.get('/debug/config', (req, res) => {
  res.json({
    environment: NODE_ENV,
    port: PORT,
    database: sequelize.options.database,
    stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    email_backend: process.env.EMAIL_BACKEND,
    cors_origins: process.env.CORS_ORIGINS?.split(',') || []
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bank-account', bankAccountRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/trip-chat', tripChatRoutes);
app.use('/api/me', profileRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    logger.info('=' .repeat(70));
    logger.info('🚀 Starting UniGO Backend (Node.js/Express)');
    logger.info('=' .repeat(70));
    logger.info(`📧 Email Configuration:`);
    logger.info(`   Backend: ${process.env.EMAIL_BACKEND}`);
    logger.info(`   Provider: ${process.env.EMAIL_PROVIDER}`);
    logger.info(`   From: ${process.env.EMAIL_FROM}`);
    logger.info(`   SMTP Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    logger.info('=' .repeat(70));
    logger.info(`💳 Stripe Configuration:`);
    logger.info(`   Enabled: ${!!process.env.STRIPE_SECRET_KEY}`);
    logger.info(`   Commission: ${process.env.APP_COMMISSION_PERCENT || 15}%`);
    logger.info('=' .repeat(70));
    
    server.listen(PORT, () => {
      logger.info(`✅ Server running on http://0.0.0.0:${PORT}`);
      logger.info(`✅ Environment: ${NODE_ENV}`);
      logger.info(`✅ WebSocket server ready`);
      logger.info(`✅ Swagger docs: http://127.0.0.1:${PORT}/api-docs`);
      logger.info('=' .repeat(70));
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    sequelize.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    sequelize.close();
    process.exit(0);
  });
});

startServer();

export default app;

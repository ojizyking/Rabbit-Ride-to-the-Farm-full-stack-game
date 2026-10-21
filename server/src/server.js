require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const shopRoutes = require('./routes/shop');
const walletRoutes = require('./routes/wallet');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - support Vercel preview domains and production URLs
const configuredFrontend = process.env.FRONTEND_URL || '';
const allowedOrigins = configuredFrontend
  ? configuredFrontend.split(',').map(u => u.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile, server-to-server, curl, health checks)
    if (!origin) return callback(null, true);
    // Allow localhost during development
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    // In production: if FRONTEND_URL is not configured yet, allow all
    if (allowedOrigins.length === 0) return callback(null, true);
    // Allow configured origins or any vercel.app deployment
    const isAllowed = allowedOrigins.includes(origin) ||
                      origin.endsWith('.vercel.app') ||
                      origin.includes('localhost');
    if (isAllowed) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import telemetry service
const telemetry = require('./services/telemetry');

// Telemetry & hit tracking middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    telemetry.recordHit(req, res, duration);
  });
  next();
});

// Telemetry heartbeat endpoint for active online presence
app.post(['/api/telemetry/heartbeat', '/api/telemetry/ping'], (req, res) => {
  const { userId, email, role, activity } = req.body || {};
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '127.0.0.1';
  telemetry.recordHeartbeat({ userId, email, role, activity, ip });
  res.json({ success: true, online: telemetry.getOnlineStats().totalOnline });
});

app.get('/api/telemetry/public-stats', (req, res) => {
  const stats = telemetry.getOnlineStats();
  res.json({
    success: true,
    onlineUsers: stats.totalOnline,
    ridersInGame: stats.inGameCount,
    totalHitsToday: telemetry.hitsToday
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoints for Railway / monitoring
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    app: 'Rabbit Ride to the Farm API',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'online',
    app: 'Rabbit Ride to the Farm API',
    db: require('mongoose').connection.readyState === 1 ? 'mongodb_atlas' : 'memory_store',
    time: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Connect to DB and start server
connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(` 🐇 Rabbit Ride to the Farm Backend Running!   `);
      console.log(` 🚀 Server listening on port ${PORT} (0.0.0.0)  `);
      console.log(` 🌐 Health: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

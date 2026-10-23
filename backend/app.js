const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { env } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/error');
const { UPLOAD_DIR } = require('./middleware/upload');

const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://i.ytimg.com', 'https://images.unsplash.com'],
        frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com'],
        connectSrc: ["'self'", 'http://localhost:*', 'http://127.0.0.1:*', 'https://*.tile.openstreetmap.org'],
        mediaSrc: ["'self'", 'blob:'],
      },
    },
  })
);
const allowedOrigins = (env.clientOrigin || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, native apps)
      if (!origin) return callback(null, true);
      const normalized = origin.trim().replace(/\/+$/, '');
      if (allowedOrigins.includes('*') || allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      // Allow localhost and 127.0.0.1 on any port during development
      if (env.nodeEnv === 'development' || /^https?:\/\/localhost(:\d+)?$/.test(normalized) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalized)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

if (env.nodeEnv !== 'test') {
  // Request bodies and query strings are never logged, so confirmation tokens cannot leak into logs.
  app.use(morgan(':method :url :status :response-time ms', { skip: (req) => req.url.startsWith('/uploads') }));
}
app.use(express.json({ limit: '100kb' }));

// URL normalization middleware: collapses double slashes and removes duplicate /api prefixes
app.use((req, _res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api\//, '/api/');
  }
  next();
});

app.use('/uploads', express.static(UPLOAD_DIR, { index: false, dotfiles: 'deny', setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));

const healthResponse = (_req, res) => {
  const mongoose = require('mongoose');
  const dbConnected = mongoose.connection.readyState === 1;
  return res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'CivicSolve AI API',
      database: dbConnected ? 'connected' : 'disconnected',
      environment: env.nodeEnv,
      time: new Date().toISOString(),
    },
  });
};

app.get('/api/health', healthResponse);
app.get('/health', healthResponse);

app.use('/api', apiLimiter);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/authority', require('./routes/authorityRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api', notFoundHandler);

// Optional: serve the built frontend from the same origin (npm run build in /frontend)
const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  // Clean informational root route when frontend is hosted separately
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      name: 'CivicSolve AI API',
      status: 'online',
      version: '1.0.0',
      message: 'CivicSolve AI backend is active and serving API requests.',
      health: '/api/health',
      documentation: 'https://github.com/vivekjogdande/CivicSolve-AI',
    });
  });
}

app.use(errorHandler);

module.exports = app;

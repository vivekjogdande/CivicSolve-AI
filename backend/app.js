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
        connectSrc: ["'self'"],
        mediaSrc: ["'self'", 'blob:'],
      },
    },
  })
);
app.use(cors({ origin: env.clientOrigin.split(','), credentials: false }));
if (env.nodeEnv !== 'test') {
  // Request bodies and query strings are never logged, so confirmation tokens cannot leak into logs.
  app.use(morgan(':method :url :status :response-time ms', { skip: (req) => req.url.startsWith('/uploads') }));
}
app.use(express.json({ limit: '100kb' }));

app.use('/uploads', express.static(UPLOAD_DIR, { index: false, dotfiles: 'deny', setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));

app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

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
}

app.use(errorHandler);

module.exports = app;

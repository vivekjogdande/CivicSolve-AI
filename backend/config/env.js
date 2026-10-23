require('dotenv').config();

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 5001),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/CivicSolveDB',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  clientOrigin:
    process.env.CLIENT_ORIGIN ||
    'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:4173,https://civic-solve-ai-eight.vercel.app',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_VISION_MODEL || 'llava',
  ollamaTimeoutMs: num(process.env.OLLAMA_TIMEOUT_MS, 15000),
  confirmationDays: num(process.env.RESOLUTION_CONFIRMATION_DAYS, 7),
  maxUploadMb: num(process.env.MAX_UPLOAD_SIZE_MB, 10),
  evidenceRadiusMeters: num(process.env.EVIDENCE_RADIUS_METERS, 100),
  ipHashSalt: process.env.IP_HASH_SALT || process.env.JWT_SECRET || 'civicsolve',
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminName: process.env.ADMIN_NAME || 'CivicSolve Administrator',
};

function assertEnv() {
  if (env.nodeEnv === 'test') return;
  if (!env.jwtSecret || env.jwtSecret.length < 16 || env.jwtSecret.startsWith('replace_with')) {
    throw new Error('JWT_SECRET is missing or too weak. Set a random value of 32+ characters in backend/.env');
  }
}

module.exports = { env, assertEnv };

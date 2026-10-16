const crypto = require('crypto');
const { env } = require('../config/env');

/** 192-bit random confirmation token, shown to the anonymous reporter exactly once. */
const generateConfirmationToken = () => crypto.randomBytes(24).toString('hex');

/** Tokens are high-entropy random values, so a fast SHA-256 digest is appropriate for storage. */
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

function verifyToken(token, storedHash) {
  if (!token || !storedHash) return false;
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const hashIp = (ip) => crypto.createHash('sha256').update(`${env.ipHashSalt}:${ip || 'unknown'}`).digest('hex');

function generateComplaintId() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `RC-${year}-${rand}`;
}

const randomFileName = (ext) => `${crypto.randomBytes(16).toString('hex')}${ext}`;
const sha256File = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

module.exports = { generateConfirmationToken, hashToken, verifyToken, hashIp, generateComplaintId, randomFileName, sha256File };

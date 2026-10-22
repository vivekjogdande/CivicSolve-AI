const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { UPLOAD_DIR } = require('../middleware/upload');

/**
 * Resolves a URL or relative path to a local file inside UPLOAD_DIR.
 * Prevents directory traversal attacks.
 */
function resolveImagePath(fileUrlOrPath) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') {
    throw new Error('Invalid image path or URL provided');
  }

  // Extract the filename (basename)
  const cleanBasename = path.basename(fileUrlOrPath);
  const targetPath = path.join(UPLOAD_DIR, cleanBasename);

  // Security check: ensure path is strictly within UPLOAD_DIR
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    throw new Error('Access to path outside upload directory is forbidden');
  }

  if (!fs.existsSync(resolved)) {
    throw new Error(`Image file not found: ${cleanBasename}`);
  }

  return resolved;
}

/**
 * Reads image file buffer safely.
 */
function readImageBuffer(fileUrlOrPath) {
  const filePath = resolveImagePath(fileUrlOrPath);
  return fs.readFileSync(filePath);
}

/**
 * Computes cryptographic SHA-256 hash of a buffer.
 */
function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Computes difference hash (dHash) for perceptual similarity check.
 * Normalizes image to 9x8 grayscale, then compares adjacent pixel intensities.
 * Produces a 64-bit binary representation.
 */
async function computeDHash(buffer) {
  try {
    const raw = await sharp(buffer)
      .grayscale()
      .resize(9, 8, { fit: 'fill' })
      .raw()
      .toBuffer();

    let hash = '';
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const left = raw[row * 9 + col];
        const right = raw[row * 9 + col + 1];
        hash += left > right ? '1' : '0';
      }
    }
    return hash;
  } catch (err) {
    throw new Error(`Failed to compute perceptual hash: ${err.message}`);
  }
}

/**
 * Computes Hamming distance between two binary hash strings.
 */
function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let dist = 0;
  for (let i = 0; i < hash1.length; i += 1) {
    if (hash1[i] !== hash2[i]) dist += 1;
  }
  return dist;
}

/**
 * Computes normalized structural similarity / Mean Absolute Difference (MAD)
 * between two image buffers downscaled to a 32x32 grayscale grid (1024 pixels).
 * Returns percentage similarity score between 0 and 100.
 */
async function computePixelSimilarity(buffer1, buffer2) {
  try {
    const [raw1, raw2] = await Promise.all([
      sharp(buffer1).grayscale().resize(32, 32, { fit: 'fill' }).raw().toBuffer(),
      sharp(buffer2).grayscale().resize(32, 32, { fit: 'fill' }).raw().toBuffer(),
    ]);

    let totalDiff = 0;
    const len = raw1.length;
    for (let i = 0; i < len; i += 1) {
      totalDiff += Math.abs(raw1[i] - raw2[i]);
    }

    const meanDiff = totalDiff / (len * 255);
    const similarity = Math.max(0, Math.min(100, (1 - meanDiff) * 100));
    return Math.round(similarity * 10) / 10;
  } catch (err) {
    return 0;
  }
}

/**
 * Deterministically analyzes before/after images for exact or near-identical duplication.
 * Returns match metadata and whether Ollama inference should be skipped.
 */
async function compareImageFiles(beforeUrlOrPath, afterUrlOrPath) {
  let beforeBuf;
  let afterBuf;

  try {
    beforeBuf = readImageBuffer(beforeUrlOrPath);
    afterBuf = readImageBuffer(afterUrlOrPath);
  } catch (err) {
    return {
      success: false,
      error: err.message,
      isIdentical: false,
      isNearIdentical: false,
      matchType: 'UNREADABLE',
      similarityScore: 0,
    };
  }

  // 1. Exact cryptographic comparison (SHA-256)
  const beforeSha256 = computeSha256(beforeBuf);
  const afterSha256 = computeSha256(afterBuf);

  if (beforeSha256 === afterSha256) {
    return {
      success: true,
      isIdentical: true,
      isNearIdentical: true,
      matchType: 'EXACT_SHA256',
      similarityScore: 100,
      hammingDistance: 0,
      beforeSha256,
      afterSha256,
      summary: 'Exact identical image file detected (SHA-256 match). No visual improvement demonstrated.',
    };
  }

  // 2. Perceptual and structural similarity check (detects resized, recompressed, re-encoded copies)
  let dHash1;
  let dHash2;
  let dist = 64;
  let similarityScore = 0;

  try {
    [dHash1, dHash2, similarityScore] = await Promise.all([
      computeDHash(beforeBuf),
      computeDHash(afterBuf),
      computePixelSimilarity(beforeBuf, afterBuf),
    ]);
    dist = hammingDistance(dHash1, dHash2);
  } catch (_e) {
    // If perceptual check encounters unsupported format, continue with safe fallback
  }

  // Thresholds:
  // dHash distance <= 2 (out of 64 bits) AND pixel similarity >= 96% indicates near-identical image
  // (e.g. recompressed JPEG, PNG re-saved as WebP, slight resize).
  const isNearIdentical = dist <= 2 && similarityScore >= 96;

  return {
    success: true,
    isIdentical: false,
    isNearIdentical,
    matchType: isNearIdentical ? 'PERCEPTUAL_NEAR_IDENTICAL' : 'DIFFERENT',
    similarityScore,
    hammingDistance: dist,
    beforeSha256,
    afterSha256,
    summary: isNearIdentical
      ? `Near-identical image detected (${similarityScore}% visual match, dHash distance ${dist}). The uploaded proof appears to be a recompressed or resized version of the complaint photo without physical changes.`
      : `Images differ visually (${similarityScore}% baseline similarity, dHash distance ${dist}).`,
  };
}

module.exports = {
  resolveImagePath,
  readImageBuffer,
  computeSha256,
  computeDHash,
  hammingDistance,
  computePixelSimilarity,
  compareImageFiles,
};

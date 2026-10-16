const exifr = require('exifr');
const { haversineMeters } = require('../utils/geo');
const { env } = require('../config/env');

const TZ_TOLERANCE_MS = 14 * 60 * 60 * 1000; // EXIF timestamps carry no timezone; allow for that ambiguity
const EDITING_SOFTWARE = /photoshop|gimp|lightroom|snapseed|canva|picsart|pixlr|facetune/i;

/** Reads capture time, GPS and software tag from a photo. Never throws; missing data returns nulls. */
async function extractMetadata(buffer) {
  const out = { capturedAt: null, lat: null, lng: null, software: null };
  try {
    const tags = await exifr.parse(buffer, ['DateTimeOriginal', 'CreateDate', 'Software']);
    if (tags) {
      const d = tags.DateTimeOriginal || tags.CreateDate;
      if (d instanceof Date && !Number.isNaN(d.getTime())) out.capturedAt = d;
      if (tags.Software) out.software = String(tags.Software);
    }
  } catch {
    /* no EXIF block */
  }
  try {
    const gps = await exifr.gps(buffer);
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      out.lat = gps.latitude;
      out.lng = gps.longitude;
    }
  } catch {
    /* no GPS block */
  }
  return out;
}

/**
 * Pure function: judges evidence metadata against the complaint.
 *  - Hard failures (rejected): identical to a "before" photo, captured before the complaint was filed
 *    (beyond timezone tolerance), captured in the future, or GPS farther than the allowed radius.
 *  - Missing or suspicious metadata is accepted but FLAGGED for review. EXIF/GPS can be forged or stripped,
 *    so a VERIFIED status means "no inconsistency found", never "proven authentic".
 */
function evaluateEvidence({ complaintCreatedAt, complaintLat, complaintLng, metadata, evidenceSha256, originalHashes = [], now = new Date(), radius = env.evidenceRadiusMeters }) {
  const checks = [];
  const rejectReasons = [];
  const flagReasons = [];
  const push = (key, label, result, detail) => checks.push({ key, label, result, detail });

  // 1. Duplicate of an original photo
  if (evidenceSha256 && originalHashes.includes(evidenceSha256)) {
    push('DUPLICATE', 'Different from original photo', 'FAIL', 'The file is identical to a photo submitted with the complaint.');
    rejectReasons.push('The evidence photo is identical to a "before" photo. Upload a new photograph taken after the cleanup.');
  } else {
    push('DUPLICATE', 'Different from original photo', 'PASS', 'File differs from the originally submitted photos.');
  }

  // 2. Capture timestamp
  const capturedAt = metadata && metadata.capturedAt ? new Date(metadata.capturedAt) : null;
  if (!capturedAt) {
    push('TIMESTAMP', 'Capture time after complaint', 'UNVERIFIABLE', 'No capture timestamp found in the photo metadata.');
    flagReasons.push('Photo has no capture timestamp, so timing could not be verified.');
  } else if (capturedAt.getTime() > now.getTime() + TZ_TOLERANCE_MS) {
    push('TIMESTAMP', 'Capture time after complaint', 'FAIL', `Capture time ${capturedAt.toISOString()} is in the future.`);
    rejectReasons.push('The photo capture time is in the future, so it cannot be valid evidence.');
  } else if (capturedAt.getTime() < new Date(complaintCreatedAt).getTime()) {
    const gap = new Date(complaintCreatedAt).getTime() - capturedAt.getTime();
    if (gap <= TZ_TOLERANCE_MS) {
      push('TIMESTAMP', 'Capture time after complaint', 'WARN', 'Captured slightly before the complaint was filed; this may be a timezone offset in the photo metadata.');
      flagReasons.push('Capture time is slightly earlier than the complaint (possible timezone offset).');
    } else {
      push('TIMESTAMP', 'Capture time after complaint', 'FAIL', `Captured ${capturedAt.toISOString()}, before the complaint was submitted.`);
      rejectReasons.push('The photo was taken before the complaint was submitted, so it cannot show the cleanup result.');
    }
  } else {
    push('TIMESTAMP', 'Capture time after complaint', 'PASS', `Captured ${capturedAt.toISOString()}, after the complaint was submitted.`);
  }

  // 3. GPS proximity
  let distance = null;
  if (metadata && Number.isFinite(metadata.lat) && Number.isFinite(metadata.lng)) {
    distance = Math.round(haversineMeters(complaintLat, complaintLng, metadata.lat, metadata.lng));
    if (distance > radius) {
      push('GPS', `Within ${radius} m of complaint`, 'FAIL', `Photo GPS is about ${distance} m from the reported location.`);
      rejectReasons.push(`The photo was captured about ${distance} m from the reported location (limit ${radius} m).`);
    } else {
      push('GPS', `Within ${radius} m of complaint`, 'PASS', `Photo GPS is about ${distance} m from the reported location.`);
    }
  } else {
    push('GPS', `Within ${radius} m of complaint`, 'UNVERIFIABLE', 'No GPS coordinates found in the photo metadata.');
    flagReasons.push('Photo has no GPS data, so location could not be verified.');
  }

  // 4. Editing software hint
  if (metadata && metadata.software && EDITING_SOFTWARE.test(metadata.software)) {
    push('SOFTWARE', 'No editing software tag', 'WARN', `Photo metadata names editing software: ${metadata.software}.`);
    flagReasons.push(`Photo metadata mentions editing software (${metadata.software}).`);
  } else {
    push('SOFTWARE', 'No editing software tag', 'PASS', 'No editing software recorded in metadata.');
  }

  return {
    rejected: rejectReasons.length > 0,
    rejectReasons,
    flagReasons,
    validation: {
      status: flagReasons.length ? 'FLAGGED' : 'VERIFIED',
      capturedAt: capturedAt || undefined,
      gps: metadata && Number.isFinite(metadata.lat) ? { lat: metadata.lat, lng: metadata.lng } : undefined,
      distanceMeters: distance === null ? undefined : distance,
      checks,
      flagReasons,
    },
  };
}

module.exports = { extractMetadata, evaluateEvidence };

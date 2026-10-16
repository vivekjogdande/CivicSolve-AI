process.env.NODE_ENV = 'test';
const { evaluateEvidence } = require('../services/evidenceService');
const { haversineMeters } = require('../utils/geo');

const created = new Date('2026-10-01T10:00:00Z');
const base = { complaintCreatedAt: created, complaintLat: 18.6, complaintLng: 73.8, evidenceSha256: 'after', originalHashes: ['before'], now: new Date('2026-10-05T10:00:00Z'), radius: 100 };
const good = { capturedAt: new Date('2026-10-04T09:00:00Z'), lat: 18.6003, lng: 73.8003, software: 'Pixel Camera' };
const result = (meta, extra = {}) => evaluateEvidence({ ...base, metadata: meta, ...extra });
const check = (r, key) => r.validation.checks.find((c) => c.key === key);

describe('haversine', () => {
  test('is ~0 for identical points and ~111 km per degree of latitude', () => {
    expect(haversineMeters(18.6, 73.8, 18.6, 73.8)).toBeCloseTo(0, 3);
    expect(haversineMeters(18, 73, 19, 73)).toBeGreaterThan(110000);
    expect(haversineMeters(18, 73, 19, 73)).toBeLessThan(112000);
  });
});

describe('evidence validation', () => {
  test('valid photo (later time, within radius) passes and is VERIFIED', () => {
    const r = result(good);
    expect(r.rejected).toBe(false);
    expect(r.validation.status).toBe('VERIFIED');
    expect(r.validation.distanceMeters).toBeLessThan(100);
    expect(check(r, 'GPS').result).toBe('PASS');
    expect(check(r, 'TIMESTAMP').result).toBe('PASS');
  });

  test('rejects a photo taken far from the complaint location', () => {
    const r = result({ ...good, lat: 18.61, lng: 73.81 });
    expect(r.rejected).toBe(true);
    expect(check(r, 'GPS').result).toBe('FAIL');
    expect(r.rejectReasons.join(' ')).toMatch(/limit 100 m/);
  });

  test('rejects a photo captured long before the complaint', () => {
    const r = result({ ...good, capturedAt: new Date('2026-09-20T09:00:00Z') });
    expect(r.rejected).toBe(true);
    expect(check(r, 'TIMESTAMP').result).toBe('FAIL');
  });

  test('a small negative gap is a timezone warning, flagged but not rejected', () => {
    const r = result({ ...good, capturedAt: new Date('2026-10-01T06:00:00Z') });
    expect(r.rejected).toBe(false);
    expect(check(r, 'TIMESTAMP').result).toBe('WARN');
    expect(r.validation.status).toBe('FLAGGED');
  });

  test('rejects capture times in the future', () => {
    const r = result({ ...good, capturedAt: new Date('2026-12-01T00:00:00Z') });
    expect(r.rejected).toBe(true);
  });

  test('missing EXIF is accepted but flagged as unverifiable', () => {
    const r = result({ capturedAt: null, lat: null, lng: null, software: null });
    expect(r.rejected).toBe(false);
    expect(r.validation.status).toBe('FLAGGED');
    expect(check(r, 'GPS').result).toBe('UNVERIFIABLE');
    expect(check(r, 'TIMESTAMP').result).toBe('UNVERIFIABLE');
    expect(r.flagReasons.length).toBe(2);
  });

  test('rejects an after-photo identical to a before-photo', () => {
    const r = result(good, { evidenceSha256: 'before' });
    expect(r.rejected).toBe(true);
    expect(check(r, 'DUPLICATE').result).toBe('FAIL');
  });

  test('editing software in metadata flags the photo', () => {
    const r = result({ ...good, software: 'Adobe Photoshop 25' });
    expect(r.rejected).toBe(false);
    expect(r.validation.status).toBe('FLAGGED');
  });

  test('radius is configurable', () => {
    const r = result({ ...good, lat: 18.6007, lng: 73.8 }, { radius: 50 });
    expect(r.rejected).toBe(true);
  });
});

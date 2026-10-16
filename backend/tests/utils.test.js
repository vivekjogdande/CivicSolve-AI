process.env.NODE_ENV = 'test';
const { computeRates, pct } = require('../services/metrics');
const { generateConfirmationToken, hashToken, verifyToken, generateComplaintId, hashIp } = require('../utils/tokens');
const { detectFileType } = require('../utils/fileSignature');
const { parseModelJson, normalise } = require('../services/ollamaService');
const { approx } = require('../utils/geo');
const s = require('../utils/schemas');

describe('transparency metrics', () => {
  test('rates use the documented denominators', () => {
    const r = computeRates({ attempted: 10, eligible: 8, confirmed: 6, rejectedAtLeastOnce: 3, closedUnconfirmed: 2 });
    expect(r.confirmationRate).toMatchObject({ value: 75, numerator: 6, denominator: 8 });
    expect(r.reopenRate).toMatchObject({ value: 30, numerator: 3, denominator: 10 });
    expect(r.unconfirmedClosureRate).toMatchObject({ value: 25, numerator: 2, denominator: 8 });
  });
  test('empty data yields null, never an invented figure', () => {
    const r = computeRates({});
    expect(r.confirmationRate.value).toBeNull();
    expect(r.reopenRate.value).toBeNull();
    expect(pct(0, 0)).toBeNull();
  });
  test('unconfirmed closures are not counted as confirmed', () => {
    const r = computeRates({ attempted: 4, eligible: 4, confirmed: 1, closedUnconfirmed: 3 });
    expect(r.confirmationRate.value).toBe(25);
  });
});

describe('anonymous tokens', () => {
  test('token is random, long, hashed and verifiable', () => {
    const t = generateConfirmationToken();
    expect(t).toHaveLength(48);
    expect(generateConfirmationToken()).not.toBe(t);
    const h = hashToken(t);
    expect(h).not.toContain(t);
    expect(verifyToken(t, h)).toBe(true);
    expect(verifyToken('x'.repeat(48), h)).toBe(false);
    expect(verifyToken(undefined, h)).toBe(false);
    expect(verifyToken(t, undefined)).toBe(false);
  });
  test('complaint ids and ip hashes', () => {
    expect(generateComplaintId()).toMatch(/^RC-\d{4}-[0-9A-F]{6}$/);
    expect(hashIp('1.2.3.4')).not.toContain('1.2.3.4');
  });
});

describe('file signatures', () => {
  test('detects real image types and rejects fakes', () => {
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).mime).toBe('image/jpeg');
    expect(detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])).mime).toBe('image/png');
    expect(detectFileType(Buffer.from('<?php echo 1; ?> not an image at all'))).toBeNull();
    expect(detectFileType(Buffer.from('MZ executable header bytes here'))).toBeNull();
  });
});

describe('ollama output handling', () => {
  test('parses JSON wrapped in prose and normalises unknown outcomes to UNCERTAIN', () => {
    const raw = parseModelJson('Sure! ```json\n{"outcome":"BANANA","confidence":"high","apparent_change":"cleaner"}\n```');
    const n = normalise(raw);
    expect(n.outcome).toBe('UNCERTAIN');
    expect(n.confidence).toBe('HIGH');
  });
  test('MODEL_UNAVAILABLE cannot be claimed by the model, invalid JSON gives null', () => {
    expect(normalise({ outcome: 'MODEL_UNAVAILABLE' }).outcome).toBe('UNCERTAIN');
    expect(parseModelJson('no json here')).toBeNull();
  });
  test('valid outcomes pass through', () => {
    expect(normalise({ outcome: 'POLLUTION_REDUCED', confidence: 'MEDIUM' }).outcome).toBe('POLLUTION_REDUCED');
  });
});

describe('privacy helpers', () => {
  test('public coordinates are rounded to ~110 m', () => {
    expect(approx(18.604567)).toBe(18.605);
  });
});

describe('request schemas', () => {
  const reg = { name: 'Asha Patil', email: 'ASHA@Example.com', password: 'river2026', confirmPassword: 'river2026' };
  test('registration accepts valid data and lowercases email', () => {
    const r = s.registerSchema.safeParse(reg);
    expect(r.success).toBe(true);
    expect(r.data.email).toBe('asha@example.com');
  });
  test('registration rejects a role field (no self-service privilege escalation)', () => {
    expect(s.registerSchema.safeParse({ ...reg, role: 'ADMIN' }).success).toBe(false);
    expect(s.registerSchema.safeParse({ ...reg, role: 'OFFICER' }).success).toBe(false);
  });
  test('registration rejects mismatched or weak passwords', () => {
    expect(s.registerSchema.safeParse({ ...reg, confirmPassword: 'other1234' }).success).toBe(false);
    expect(s.registerSchema.safeParse({ ...reg, password: 'short1', confirmPassword: 'short1' }).success).toBe(false);
    expect(s.registerSchema.safeParse({ ...reg, password: 'onlyletters', confirmPassword: 'onlyletters' }).success).toBe(false);
  });
  test('complaint creation coerces multipart strings', () => {
    const r = s.createComplaintSchema.safeParse({ title: 'Plastic near bridge', description: 'Lots of plastic bags floating', category: 'PLASTIC_WASTE', lat: '18.6', lng: '73.8', isAnonymous: 'true', severity: '' });
    expect(r.success).toBe(true);
    expect(r.data.isAnonymous).toBe(true);
    expect(r.data.severity).toBeUndefined();
    expect(s.createComplaintSchema.safeParse({ title: 'Plastic near bridge', description: 'Lots of plastic bags', category: 'NOPE', lat: 1, lng: 1 }).success).toBe(false);
    expect(s.createComplaintSchema.safeParse({ title: 'Plastic near bridge', description: 'Lots of plastic bags', category: 'OTHER', lat: 200, lng: 1 }).success).toBe(false);
  });
  test('reject needs a meaningful reason', () => {
    expect(s.rejectBody.safeParse({ reason: 'bad' }).success).toBe(false);
    expect(s.rejectBody.safeParse({ reason: 'Garbage is still floating at the bank' }).success).toBe(true);
  });
});

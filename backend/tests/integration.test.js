/**
 * End-to-end workflow test against a REAL MongoDB.
 * Skipped unless MONGODB_TEST_URI is set, e.g.
 *   MONGODB_TEST_URI=mongodb://127.0.0.1:27017/CivicSolveTest npm run test:integration
 * It creates a throw-away database and drops it afterwards.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-secret-integration-secret-123';
process.env.OLLAMA_AUTO_COMPARE = 'false';

const BASE_URI = process.env.MONGODB_TEST_URI;
const suite = BASE_URI ? describe : describe.skip;

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { makeJpeg } = require('./helpers/makeJpeg');

const LAT = 18.6;
const LNG = 73.8;
const pad = (n) => String(n).padStart(2, '0');
const exifTime = (d) => `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const soon = () => exifTime(new Date(Date.now() + 60 * 1000));

suite('CivicSolve AI workflows (real MongoDB)', () => {
  let app;
  let Complaint;
  let User;
  let Department;
  let Notification;
  let svc;
  let adminToken;
  let officerToken;
  let citizenToken;
  let otherCitizenToken;
  let dbName;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });
  const before = (salt) => makeJpeg({ takenAt: exifTime(new Date(Date.now() - 3600 * 1000)), lat: LAT, lng: LNG, salt });
  const good = (salt) => makeJpeg({ takenAt: soon(), lat: LAT, lng: LNG, salt: `after-${salt}` });

  async function report({ token, anonymous = false, salt = Math.random().toString(36), category = 'PLASTIC_WASTE' } = {}) {
    let req = request(app).post('/api/complaints');
    if (token) req = req.set(auth(token));
    const r = await req
      .field('title', 'Plastic waste near the ghat')
      .field('description', 'A lot of plastic bags floating near the ghat steps')
      .field('category', category)
      .field('lat', String(LAT))
      .field('lng', String(LNG))
      .field('landmark', 'Alandi ghat')
      .field('isAnonymous', String(anonymous))
      .attach('media', before(salt), { filename: 'before.jpg', contentType: 'image/jpeg' });
    expect(r.status).toBe(201);
    return r.body.data;
  }

  const officerMove = (id, status, note) => request(app).post(`/api/authority/complaints/${id}/status`).set(auth(officerToken)).send({ status, note });
  const resolve = (id, buf, desc = 'Removed all plastic waste and cleaned the bank') =>
    request(app).post(`/api/authority/complaints/${id}/resolution`).set(auth(officerToken)).field('description', desc).attach('photo', buf, { filename: 'after.jpg', contentType: 'image/jpeg' });

  async function inProgress(id) {
    expect((await officerMove(id, 'UNDER_REVIEW')).status).toBe(200);
    expect((await officerMove(id, 'IN_PROGRESS')).status).toBe(200);
  }

  beforeAll(async () => {
    dbName = `CivicSolveTest_${Date.now()}`;
    await mongoose.connect(BASE_URI, { dbName });
    app = require('../app');
    Complaint = require('../models/Complaint');
    User = require('../models/User');
    Department = require('../models/Department');
    Notification = require('../models/Notification');
    svc = require('../services/complaintService');
    await Complaint.init();

    const dept = await Department.create({ name: 'Municipal Corporation - Environment Department', code: 'MUNICIPAL' });
    await Department.create({ name: 'Maharashtra Pollution Control Board', code: 'MPCB' });
    await User.create({ name: 'Admin', email: 'admin@test.dev', passwordHash: await bcrypt.hash('adminpass123', 10), role: 'ADMIN' });

    const a = await request(app).post('/api/auth/authority/login').send({ email: 'admin@test.dev', password: 'adminpass123' });
    adminToken = a.body.data.token;
    const o = await request(app)
      .post('/api/admin/users').set(auth(adminToken))
      .send({ name: 'Officer One', email: 'officer@test.dev', password: 'officerpass1', role: 'OFFICER', department: String(dept._id) });
    expect(o.status).toBe(201);
    officerToken = (await request(app).post('/api/auth/authority/login').send({ email: 'officer@test.dev', password: 'officerpass1' })).body.data.token;

    const reg = (name, email) => request(app).post('/api/auth/register').send({ name, email, password: 'citizen1234', confirmPassword: 'citizen1234' });
    citizenToken = (await reg('Asha Patil', 'asha@test.dev')).body.data.token;
    otherCitizenToken = (await reg('Ravi Kumar', 'ravi@test.dev')).body.data.token;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('portals are separated: citizens cannot use the authority login and vice versa', async () => {
    expect((await request(app).post('/api/auth/authority/login').send({ email: 'asha@test.dev', password: 'citizen1234' })).status).toBe(401);
    expect((await request(app).post('/api/auth/citizen/login').send({ email: 'officer@test.dev', password: 'officerpass1' })).status).toBe(401);
    expect((await request(app).post('/api/auth/citizen/login').send({ email: 'asha@test.dev', password: 'wrongpass1' })).status).toBe(401);
    expect((await request(app).post('/api/auth/citizen/login').send({ email: 'asha@test.dev', password: 'citizen1234' })).status).toBe(200);
  });

  test('role-based access control on the backend', async () => {
    expect((await request(app).get('/api/authority/summary').set(auth(citizenToken))).status).toBe(403);
    expect((await request(app).get('/api/admin/overview').set(auth(officerToken))).status).toBe(403);
    expect((await request(app).get('/api/authority/senior/queue').set(auth(officerToken))).status).toBe(403);
    expect((await request(app).get('/api/authority/summary').set(auth(officerToken))).status).toBe(200);
    expect((await request(app).get('/api/admin/overview').set(auth(adminToken))).status).toBe(200);
  });

  test('empty database gives zero statistics, not invented numbers', async () => {
    const r = await request(app).get('/api/public/stats');
    expect(r.body.data).toEqual({ totalReports: 0, underInvestigation: 0, citizenConfirmedResolutions: 0, locationsMonitored: 0 });
  });

  test('registered complaint is stored, routed to a department and visible privately only to its owner', async () => {
    const { complaintId } = await report({ token: citizenToken });
    const doc = await Complaint.findOne({ complaintId }).populate('department');
    expect(doc.department.code).toBe('MUNICIPAL');
    expect(doc.location.coordinates).toEqual([LNG, LAT]);
    expect(doc.media[0].url).toMatch(/^\/uploads\/[0-9a-f]{32}\.jpg$/);

    const owner = await request(app).get(`/api/complaints/${complaintId}`).set(auth(citizenToken));
    expect(owner.status).toBe(200);
    expect(owner.body.data.complaint.media).toHaveLength(1);
    expect((await request(app).get(`/api/complaints/${complaintId}`).set(auth(otherCitizenToken))).status).toBe(404);

    const pub = await request(app).get(`/api/complaints/track/${complaintId}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.complaint.media).toBeUndefined();
    expect(JSON.stringify(pub.body)).not.toMatch(/asha@test.dev|Asha/);

    const mine = await request(app).get('/api/complaints/mine').set(auth(citizenToken));
    expect(mine.body.data.total).toBeGreaterThanOrEqual(1);
  });

  test('anonymous report: token shown once, only its hash is stored, map exposes no private data', async () => {
    const { complaintId, confirmationToken } = await report({ anonymous: true });
    expect(confirmationToken).toHaveLength(48);
    const doc = await Complaint.findOne({ complaintId }).select('+anonymousTokenHash');
    expect(doc.anonymousTokenHash).toBeTruthy();
    expect(doc.anonymousTokenHash).not.toBe(confirmationToken);
    expect(doc.reporter).toBeUndefined();

    const map = await request(app).get('/api/public/map');
    const text = JSON.stringify(map.body);
    expect(text).not.toContain(confirmationToken);
    expect(text).not.toContain(doc.anonymousTokenHash);
    expect(text).not.toMatch(/reporter|anonymousTokenHash|\/uploads\//);
    const item = map.body.data.items.find((i) => i.complaintId === complaintId);
    expect(item.location).toEqual({ lat: 18.6, lng: 73.8 });

    const missing = await request(app).post(`/api/complaints/${complaintId}/anonymous/view`).send({ token: 'a'.repeat(48) });
    expect(missing.status).toBe(403);
    const ok = await request(app).post(`/api/complaints/${complaintId}/anonymous/view`).send({ token: confirmationToken });
    expect(ok.status).toBe(200);
    expect(ok.body.data.complaint.access).toBe('TOKEN');
    expect(JSON.stringify(ok.body)).not.toContain(doc.anonymousTokenHash);
  });

  test('full verified-resolution flow: invalid proof rejected, valid proof requests confirmation, citizen confirms', async () => {
    const { complaintId } = await report({ token: citizenToken });

    // Authorities can never mark it confirmed, nor skip the proof step
    await inProgress(complaintId);
    expect((await officerMove(complaintId, 'RESOLVED_CITIZEN_CONFIRMED')).status).toBe(403);
    expect((await officerMove(complaintId, 'AWAITING_CITIZEN_CONFIRMATION')).status).toBe(400);

    // Photo taken ~1.1 km away -> rejected with the reason
    const far = await resolve(complaintId, makeJpeg({ takenAt: soon(), lat: LAT + 0.01, lng: LNG, salt: 'far' }));
    expect(far.status).toBe(400);
    expect(far.body.error.message).toMatch(/from the reported location/);
    // Photo taken before the complaint -> rejected
    const old = await resolve(complaintId, makeJpeg({ takenAt: '2020:01:01 10:00:00', lat: LAT, lng: LNG, salt: 'old' }));
    expect(old.status).toBe(400);
    expect(old.body.error.message).toMatch(/before the complaint/);
    expect((await Complaint.findOne({ complaintId })).status).toBe('IN_PROGRESS');

    // Valid proof
    const ok = await resolve(complaintId, good('flow'));
    expect(ok.status).toBe(201);
    expect(ok.body.data.complaint.status).toBe('AWAITING_CITIZEN_CONFIRMATION');
    expect(ok.body.data.complaint.resolutionAttempts[0].validation.status).toBe('VERIFIED');
    expect(new Date(ok.body.data.complaint.confirmationDeadline) - Date.now()).toBeGreaterThan(6.9 * 86400000);

    // A second submission is not allowed while waiting for the citizen
    expect((await resolve(complaintId, good('flow2'))).status).toBe(400);

    // Someone else cannot confirm
    expect((await request(app).post(`/api/complaints/${complaintId}/confirm`).set(auth(otherCitizenToken))).status).toBe(404);

    const conf = await request(app).post(`/api/complaints/${complaintId}/confirm`).set(auth(citizenToken));
    expect(conf.status).toBe(200);
    expect(conf.body.data.complaint.status).toBe('RESOLVED_CITIZEN_CONFIRMED');
    const doc = await Complaint.findOne({ complaintId });
    expect(doc.resolutionAttempts[0].citizenDecision.decision).toBe('CONFIRMED');
    expect(doc.resolutionAttempts[0].evidence.url).toBeTruthy(); // history preserved

    // Cannot confirm twice
    expect((await request(app).post(`/api/complaints/${complaintId}/confirm`).set(auth(citizenToken))).status).toBe(409);

    // Officer notified; dashboard stats reflect it
    const officer = await User.findOne({ email: 'officer@test.dev' });
    expect(await Notification.countDocuments({ user: officer._id, type: 'CITIZEN_CONFIRMED' })).toBeGreaterThanOrEqual(1);
    const stats = await request(app).get('/api/public/stats');
    expect(stats.body.data.citizenConfirmedResolutions).toBeGreaterThanOrEqual(1);
  });

  test('citizen rejection requires photo + reason, reopens, increments reopen count and flags senior review', async () => {
    const { complaintId } = await report({ token: citizenToken });
    await inProgress(complaintId);
    expect((await resolve(complaintId, good('rej1'))).status).toBe(201);

    const noPhoto = await request(app).post(`/api/complaints/${complaintId}/reject`).set(auth(citizenToken)).field('reason', 'Garbage is still lying on the bank');
    expect(noPhoto.status).toBe(400);
    const noReason = await request(app).post(`/api/complaints/${complaintId}/reject`).set(auth(citizenToken)).field('reason', 'no').attach('media', before('r1'), { filename: 'now.jpg', contentType: 'image/jpeg' });
    expect(noReason.status).toBe(400);

    const rej = await request(app).post(`/api/complaints/${complaintId}/reject`).set(auth(citizenToken)).field('reason', 'Garbage is still lying on the bank').attach('media', before('r2'), { filename: 'now.jpg', contentType: 'image/jpeg' });
    expect(rej.status).toBe(200);
    expect(rej.body.data.complaint.status).toBe('REOPENED');
    const doc = await Complaint.findOne({ complaintId });
    expect(doc.reopenCount).toBe(1);
    expect(doc.needsSeniorReview).toBe(true);
    expect(doc.resolutionAttempts[0].evidence.url).toBeTruthy(); // previous evidence preserved
    expect(doc.resolutionAttempts[0].citizenDecision.media).toHaveLength(1);

    const queue = await request(app).get('/api/authority/senior/queue').set(auth(adminToken));
    expect(queue.body.data.items.map((i) => i.complaintId)).toContain(complaintId);

    // A second attempt is possible, and a second rejection auto-escalates
    expect((await resolve(complaintId, good('rej3'))).status).toBe(201);
    const rej2 = await request(app).post(`/api/complaints/${complaintId}/reject`).set(auth(citizenToken)).field('reason', 'Still there after second cleanup').attach('media', before('r4'), { filename: 'now.jpg', contentType: 'image/jpeg' });
    expect(rej2.body.data.complaint.status).toBe('ESCALATED');
    expect((await Complaint.findOne({ complaintId })).reopenCount).toBe(2);
    // Officers cannot resolve escalated complaints; senior officers can
    expect((await resolve(complaintId, good('rej5'))).status).toBe(403);
  });

  test('anonymous confirmation needs the right token', async () => {
    const { complaintId, confirmationToken } = await report({ anonymous: true });
    await inProgress(complaintId);
    expect((await resolve(complaintId, good('anon'))).status).toBe(201);

    expect((await request(app).post(`/api/complaints/${complaintId}/anonymous/confirm`).send({ token: 'b'.repeat(48) })).status).toBe(403);
    const ok = await request(app).post(`/api/complaints/${complaintId}/anonymous/confirm`).send({ token: confirmationToken });
    expect(ok.status).toBe(200);
    expect(ok.body.data.complaint.status).toBe('RESOLVED_CITIZEN_CONFIRMED');
  });

  test('timeout closes unconfirmed complaints, which never count as confirmed', async () => {
    const { complaintId } = await report({ token: citizenToken });
    await inProgress(complaintId);
    expect((await resolve(complaintId, good('timeout'))).status).toBe(201);
    await Complaint.updateOne({ complaintId }, { $set: { confirmationDeadline: new Date(Date.now() - 1000), 'resolutionAttempts.0.confirmationDeadline': new Date(Date.now() - 1000) } });

    // a confirmation after the deadline is refused
    expect((await request(app).post(`/api/complaints/${complaintId}/confirm`).set(auth(citizenToken))).status).toBe(409);

    const n = await svc.closeExpiredConfirmations();
    expect(n).toBeGreaterThanOrEqual(1);
    const doc = await Complaint.findOne({ complaintId });
    expect(doc.status).toBe('CLOSED_UNCONFIRMED');
    expect(doc.resolutionAttempts[0].closedUnconfirmedAt).toBeTruthy();
    expect(await svc.closeExpiredConfirmations()).toBe(0); // idempotent

    const t = await request(app).get('/api/public/transparency');
    expect(t.body.data.rates.unconfirmedClosureRate.numerator).toBeGreaterThanOrEqual(1);
    const confirmed = await Complaint.countDocuments({ status: 'RESOLVED_CITIZEN_CONFIRMED' });
    expect(t.body.data.rates.confirmationRate.numerator).toBe(confirmed);
  });

  test('community observations are rate-limited per person and never change status', async () => {
    const { complaintId } = await report({ token: citizenToken });
    const r = await request(app).post('/api/public/observations').send({ complaintId, type: 'STILL_POLLUTED', note: 'Smell is strong today' });
    expect(r.status).toBe(201);
    expect((await request(app).post('/api/public/observations').send({ complaintId, type: 'STILL_POLLUTED' })).status).toBe(409);
    const doc = await Complaint.findOne({ complaintId });
    expect(doc.status).toBe('SUBMITTED');
    expect(doc.observationCount).toBe(1);
    expect((await request(app).post('/api/public/observations').send({ complaintId: 'RC-2026-NOPE00', type: 'STILL_POLLUTED' })).status).toBe(404);
  });

  test('AI comparison degrades gracefully when Ollama is unavailable', async () => {
    process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:1'; // nothing listens here
    const { env } = require('../config/env');
    env.ollamaBaseUrl = 'http://127.0.0.1:1';
    const { complaintId } = await report({ token: citizenToken });
    await inProgress(complaintId);
    expect((await resolve(complaintId, good('ai'))).status).toBe(201);
    const r = await request(app).post(`/api/authority/complaints/${complaintId}/ai-compare`).set(auth(officerToken)).send({});
    expect(r.status).toBe(200);
    expect(r.body.data.ai.outcome).toBe('MODEL_UNAVAILABLE');
    const stored = (await Complaint.findOne({ complaintId })).resolutionAttempts[0].ai;
    expect(stored.outcome).toBe('MODEL_UNAVAILABLE');
    // application still works and the complaint is still awaiting the citizen
    expect((await Complaint.findOne({ complaintId })).status).toBe('AWAITING_CITIZEN_CONFIRMATION');
  });

  test('admin-only authority account creation; duplicate emails refused', async () => {
    const dup = await request(app).post('/api/admin/users').set(auth(adminToken)).send({ name: 'Dup', email: 'officer@test.dev', password: 'officerpass1', role: 'OFFICER' });
    expect(dup.status).toBe(409);
    const asOfficer = await request(app).post('/api/admin/users').set(auth(officerToken)).send({ name: 'X Officer', email: 'x@test.dev', password: 'officerpass1', role: 'OFFICER' });
    expect(asOfficer.status).toBe(403);
    const asCitizen = await request(app).post('/api/admin/users').set(auth(citizenToken)).send({ name: 'X Officer', email: 'x@test.dev', password: 'officerpass1', role: 'ADMIN' });
    expect(asCitizen.status).toBe(403);
  });
});

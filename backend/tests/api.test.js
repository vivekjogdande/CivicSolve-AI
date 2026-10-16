process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

// These tests exercise validation, authentication and routing, which all run before any database access.
describe('API guards (no database needed)', () => {
  test('health check', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  test('unknown API route returns a consistent JSON 404', async () => {
    const r = await request(app).get('/api/nope');
    expect(r.status).toBe(404);
    expect(r.body).toMatchObject({ success: false, error: { message: expect.any(String) } });
  });

  test.each([
    ['get', '/api/auth/me'],
    ['get', '/api/complaints/mine'],
    ['get', '/api/authority/summary'],
    ['get', '/api/authority/senior/queue'],
    ['get', '/api/admin/overview'],
    ['get', '/api/notifications'],
  ])('%s %s requires authentication', async (method, url) => {
    const r = await request(app)[method](url);
    expect(r.status).toBe(401);
  });

  test('forged or expired tokens are rejected', async () => {
    const forged = jwt.sign({ sub: '64b000000000000000000000', role: 'ADMIN' }, 'wrong-secret');
    const r = await request(app).get('/api/admin/overview').set('Authorization', `Bearer ${forged}`);
    expect(r.status).toBe(401);
    const expired = jwt.sign({ sub: '64b000000000000000000000', role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const r2 = await request(app).get('/api/admin/overview').set('Authorization', `Bearer ${expired}`);
    expect(r2.status).toBe(401);
  });

  test('registration cannot set a role', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'Evil User', email: 'evil@example.com', password: 'password123', confirmPassword: 'password123', role: 'ADMIN' });
    expect(r.status).toBe(400);
  });

  test('registration validates password confirmation', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'Asha Patil', email: 'asha@example.com', password: 'password123', confirmPassword: 'different123' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/match/i);
  });

  test('login validates input before touching the database', async () => {
    const r = await request(app).post('/api/auth/citizen/login').send({ email: 'not-an-email', password: 'x' });
    expect(r.status).toBe(400);
  });

  test('complaint creation rejects invalid fields before saving any file', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0]);
    const r = await request(app)
      .post('/api/complaints')
      .field('title', 'x')
      .field('description', 'short')
      .field('category', 'PLASTIC_WASTE')
      .field('lat', '18.6')
      .field('lng', '73.8')
      .attach('media', png, { filename: 'a.png', contentType: 'image/png' });
    expect(r.status).toBe(400);
  });

  test('disallowed upload types are rejected', async () => {
    const r = await request(app)
      .post('/api/complaints')
      .field('title', 'Plastic near bridge')
      .field('description', 'Plenty of plastic bags floating here')
      .field('category', 'PLASTIC_WASTE')
      .field('lat', '18.6')
      .field('lng', '73.8')
      .attach('media', Buffer.from('<script>alert(1)</script>'), { filename: 'x.html', contentType: 'text/html' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/Unsupported file type/);
  });

  test('a renamed non-image is rejected by magic-byte check', async () => {
    const r = await request(app)
      .post('/api/complaints')
      .field('title', 'Plastic near bridge')
      .field('description', 'Plenty of plastic bags floating here')
      .field('category', 'PLASTIC_WASTE')
      .field('lat', '18.6')
      .field('lng', '73.8')
      .attach('media', Buffer.from('this is not really a jpeg file at all'), { filename: 'fake.jpg', contentType: 'image/jpeg' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/not a valid image/);
  });

  test('anonymous token endpoints validate the token format', async () => {
    const r = await request(app).post('/api/complaints/RC-2026-ABCDEF/anonymous/view').send({ token: 'short' });
    expect(r.status).toBe(400);
  });

  test('public map rejects invalid filters', async () => {
    const r = await request(app).get('/api/public/map?status=HACKED');
    expect(r.status).toBe(400);
  });

  test('malformed JSON gives a clean 400', async () => {
    const r = await request(app).post('/api/auth/citizen/login').set('Content-Type', 'application/json').send('{bad json');
    expect(r.status).toBe(400);
  });
});

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

// These tests exercise validation, authentication and routing, which all run before any database access.
describe('API guards (no database needed)', () => {
  test('health check on /api/health and /health alias', async () => {
    const r1 = await request(app).get('/api/health');
    expect(r1.status).toBe(200);
    expect(r1.body.success).toBe(true);

    const r2 = await request(app).get('/health');
    expect(r2.status).toBe(200);
    expect(r2.body.success).toBe(true);
  });

  test('root endpoint / returns clean response without 404', async () => {
    const r = await request(app).get('/');
    expect([200, 304]).toContain(r.status);
    if (r.headers['content-type']?.includes('application/json')) {
      expect(r.body.success).toBe(true);
    }
  });

  test('normalizes double slashes and duplicate /api prefixes', async () => {
    const r1 = await request(app).get('//api/health');
    expect(r1.status).toBe(200);
    expect(r1.body.success).toBe(true);

    const r2 = await request(app).get('/api/api/health');
    expect(r2.status).toBe(200);
    expect(r2.body.success).toBe(true);
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

  describe('CORS and Preflight guards', () => {
    test('allows preflight OPTIONS from production Vercel deployment', async () => {
      const res = await request(app)
        .options('/api/auth/authority/login')
        .set('Origin', 'https://civic-solve-ai-eight.vercel.app')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('https://civic-solve-ai-eight.vercel.app');
      expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
      expect(res.headers['access-control-allow-headers']).toMatch(/Content-Type/);
    });

    test('allows preflight OPTIONS from Vercel preview deployments', async () => {
      const res = await request(app)
        .options('/api/auth/authority/login')
        .set('Origin', 'https://civic-solve-ai-git-fix-login.vercel.app')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('https://civic-solve-ai-git-fix-login.vercel.app');
    });

    test('allows requests from local development origins', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5174')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5174');
    });

    test('disallows unauthorized origins', async () => {
      const res = await request(app)
        .options('/api/auth/authority/login')
        .set('Origin', 'https://malicious-attacker.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Configuration and safe authentication diagnostics', () => {
    const { assertEnv, env } = require('../config/env');

    test('assertEnv emits warning if ADMIN_EMAIL or ADMIN_PASSWORD is missing', () => {
      const origNodeEnv = env.nodeEnv;
      const origEmail = env.adminEmail;
      const origPass = env.adminPassword;
      const origSecret = env.jwtSecret;

      env.nodeEnv = 'production';
      env.jwtSecret = 'valid-long-secret-for-testing-purposes-123';
      env.adminEmail = '';
      env.adminPassword = '';

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      assertEnv();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[config] ADMIN_EMAIL or ADMIN_PASSWORD is not set'));

      // Test short password
      env.adminEmail = 'admin@civicsolve.gov';
      env.adminPassword = 'short';
      assertEnv();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[config] ADMIN_PASSWORD configured in environment is shorter'));

      // Test valid config
      env.adminPassword = 'ValidPassword123';
      assertEnv();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[config] Administrator credentials configured in environment variables.'));

      warnSpy.mockRestore();
      logSpy.mockRestore();
      env.nodeEnv = origNodeEnv;
      env.adminEmail = origEmail;
      env.adminPassword = origPass;
      env.jwtSecret = origSecret;
    });

    test('authority login rejects invalid credentials format before DB call', async () => {
      const res = await request(app).post('/api/auth/authority/login').send({ email: 'not-an-email', password: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});



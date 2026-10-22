process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
const request = require('supertest');
const app = require('../app');
const { heuristicAnalysis } = require('../services/civicAiService');

describe('CivicSolve AI Intelligence Services', () => {
  test('correctly categorizes pothole reports and flags vehicle accident hazards', () => {
    const res = heuristicAnalysis({
      title: 'Deep crater pothole on highway',
      description: 'Dangerous pothole causing two-wheeler accidents and traffic delays.',
    });
    expect(res.category).toBe('POTHOLES_ROAD_DAMAGE');
    expect(['HIGH', 'CRITICAL']).toContain(res.priority);
    expect(res.recommendedDepartment).toBe('PWD');
    expect(res.safetyHazards.some((h) => /skidding|accident/i.test(h))).toBe(true);
    expect(res.isAiGenerated).toBe(false);
    expect(res.isFallback).toBe(true);
  });

  test('correctly categorizes garbage accumulation and recommends sanitation action', () => {
    const res = heuristicAnalysis({
      title: 'Massive garbage pileup',
      description: 'Decomposed organic waste and plastic containers with foul stench near market.',
    });
    expect(res.category).toBe('GARBAGE_ACCUMULATION');
    expect(res.recommendedDepartment).toBe('MUNICIPAL');
    expect(res.safetyHazards.some((h) => /health|disease|waste/i.test(h))).toBe(true);
  });

  test('escalates open manholes to CRITICAL with life-safety warnings', () => {
    const res = heuristicAnalysis({
      title: 'Missing manhole cover on footpath',
      description: 'Open manhole chamber 6 feet deep right near school entrance.',
    });
    expect(res.category).toBe('OPEN_MANHOLE');
    expect(res.priority).toBe('CRITICAL');
    expect(res.safetyHazards.some((h) => /fatal|fall/i.test(h))).toBe(true);
  });

  test('POST /api/complaints/ai-analyze validates inputs and returns structured AI triage', async () => {
    const res = await request(app)
      .post('/api/complaints/ai-analyze')
      .send({
        title: 'Broken streetlight with sparking wire',
        description: 'Streetlight pole dark for 3 days and sparking live wire near pedestrian crossing.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { analysis } = res.body.data;
    expect(analysis.category).toBe('STREETLIGHT_FAULT');
    expect(analysis.priority).toBe('CRITICAL');
    expect(analysis.recommendedDepartment).toBe('ELECTRICITY');
    expect(analysis.confidenceScore).toBeGreaterThanOrEqual(70);
  });

  test('POST /api/complaints/ai-analyze rejects empty requests', async () => {
    const res = await request(app)
      .post('/api/complaints/ai-analyze')
      .send({});
    expect(res.status).toBe(400);
  });

  test('GET /api/complaints/check-duplicates handles coordinate queries', async () => {
    const res = await request(app)
      .get('/api/complaints/check-duplicates?lat=18.5204&lng=73.8567&category=POTHOLES_ROAD_DAMAGE&title=pothole');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.duplicates)).toBe(true);
  });

  test('GET /api/authority/complaints/:id/responders enforces authority authentication', async () => {
    const res = await request(app).get('/api/authority/complaints/CS-2026-DEMO01/responders');
    expect(res.status).toBe(401);
  });
});

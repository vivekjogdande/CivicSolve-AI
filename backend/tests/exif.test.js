process.env.NODE_ENV = 'test';
const { makeJpeg } = require('./helpers/makeJpeg');
const { extractMetadata } = require('../services/evidenceService');
const { detectFileType } = require('../utils/fileSignature');
const { haversineMeters } = require('../utils/geo');

describe('EXIF extraction from real JPEG bytes', () => {
  test('reads GPS, capture time and software', async () => {
    const buf = makeJpeg({ takenAt: '2026:10:04 09:30:00', lat: 18.6, lng: 73.8, software: 'Pixel Camera' });
    expect(detectFileType(buf).mime).toBe('image/jpeg');
    const m = await extractMetadata(buf);
    expect(haversineMeters(18.6, 73.8, m.lat, m.lng)).toBeLessThan(5);
    expect(m.capturedAt).toBeInstanceOf(Date);
    expect(m.capturedAt.getFullYear()).toBe(2026);
    expect(m.software).toBe('Pixel Camera');
  });

  test('a photo without EXIF yields nulls instead of throwing', async () => {
    const m = await extractMetadata(makeJpeg({}));
    expect(m.lat).toBeNull();
    expect(m.capturedAt).toBeNull();
  });

  test('garbage bytes yield nulls instead of throwing', async () => {
    const m = await extractMetadata(Buffer.from('definitely not an image'));
    expect(m).toEqual({ capturedAt: null, lat: null, lng: null, software: null });
  });
});

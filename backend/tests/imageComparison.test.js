const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { UPLOAD_DIR } = require('../middleware/upload');
const {
  compareImageFiles,
  computeSha256,
  computeDHash,
  hammingDistance,
  computePixelSimilarity,
} = require('../services/imageComparisonService');
const {
  compareImages,
  buildComparisonPrompt,
  parseModelJson,
  normaliseResponse,
} = require('../services/ollamaService');

describe('Civic Before/After Image Comparison & Verification Suite', () => {
  const testFileA = path.join(UPLOAD_DIR, 'test_fixture_before.jpg');
  const testFileB_identical = path.join(UPLOAD_DIR, 'test_fixture_identical.jpg');
  const testFileC_recompressed = path.join(UPLOAD_DIR, 'test_fixture_recompressed.jpg');
  const testFileD_different = path.join(UPLOAD_DIR, 'test_fixture_different.jpg');
  const testCorruptFile = path.join(UPLOAD_DIR, 'test_fixture_corrupt.jpg');

  beforeAll(async () => {
    // Generate synthetic image fixtures for testing
    // Image A: Municipal garbage pile scene (grey asphalt with multi-colored debris)
    const svgA = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#4a5568" />
        <circle cx="150" cy="200" r="60" fill="#718096" />
        <rect x="180" y="160" width="80" height="70" fill="#2d3748" />
        <circle cx="210" cy="190" r="25" fill="#e53e3e" />
        <circle cx="160" cy="220" r="20" fill="#ecc94b" />
        <rect x="120" y="170" width="40" height="30" fill="#3182ce" />
      </svg>`;
    const bufA = await sharp(Buffer.from(svgA)).jpeg({ quality: 90 }).toBuffer();
    fs.writeFileSync(testFileA, bufA);

    // Image B: Exact identical file (byte-for-byte copy of Image A)
    fs.writeFileSync(testFileB_identical, bufA);

    // Image C: Recompressed version of Image A (different SHA-256, but near-identical visually)
    const bufC = await sharp(bufA).jpeg({ quality: 75 }).toBuffer();
    fs.writeFileSync(testFileC_recompressed, bufC);

    // Image D: Distinctly different scene (clean paved road with green verge)
    const svgD = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#2f855a" />
        <rect x="0" y="80" width="400" height="140" fill="#cbd5e0" />
        <line x1="0" y1="150" x2="400" y2="150" stroke="#f6e05e" stroke-width="6" stroke-dasharray="20,15" />
      </svg>`;
    const bufD = await sharp(Buffer.from(svgD)).jpeg({ quality: 90 }).toBuffer();
    fs.writeFileSync(testFileD_different, bufD);

    // Corrupt / truncated file
    fs.writeFileSync(testCorruptFile, Buffer.from('NOT_A_VALID_JPEG_HEADER_CORRUPT_BYTES'));
  });

  afterAll(() => {
    [testFileA, testFileB_identical, testFileC_recompressed, testFileD_different, testCorruptFile].forEach((f) => {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (_e) {}
    });
  });

  // -------------------------------------------------------------------------
  // 1. Exact same file uploaded as before and after
  // -------------------------------------------------------------------------
  test('Case 1: Exact identical files detect IDENTICAL_IMAGE without calling Ollama', async () => {
    const diff = await compareImageFiles('/uploads/test_fixture_before.jpg', '/uploads/test_fixture_identical.jpg');
    expect(diff.success).toBe(true);
    expect(diff.isIdentical).toBe(true);
    expect(diff.matchType).toBe('EXACT_SHA256');
    expect(diff.similarityScore).toBe(100);

    const result = await compareImages({
      beforeUrl: '/uploads/test_fixture_before.jpg',
      afterUrl: '/uploads/test_fixture_identical.jpg',
      complaintTitle: 'Garbage pileup near vegetable market',
      complaintDescription: 'Severe organic waste spilling onto road.',
      complaintCategory: 'GARBAGE_ACCUMULATION',
    });

    expect(result.comparisonStatus).toBe('IDENTICAL_IMAGE');
    expect(result.outcome).toBe('UNCERTAIN');
    expect(result.isIdenticalImage).toBe(true);
    expect(result.matchType).toBe('EXACT_SHA256');
    expect(result.similarityScore).toBe(100);
    expect(result.observableChanges[0]).toMatch(/identical/i);
    expect(result.reasoningSummary).toMatch(/identical/i);
    // Crucial: Must NOT report visual improvement
    expect(result.comparisonStatus).not.toBe('IMPROVED');
  });

  // -------------------------------------------------------------------------
  // 2. Same image resized or recompressed
  // -------------------------------------------------------------------------
  test('Case 2: Recompressed/resized near-identical copy detected with high visual similarity warning', async () => {
    const diff = await compareImageFiles('/uploads/test_fixture_before.jpg', '/uploads/test_fixture_recompressed.jpg');
    expect(diff.success).toBe(true);
    // Cryptographic hashes differ due to recompression
    expect(diff.beforeSha256).not.toBe(diff.afterSha256);
    // But perceptual and structural check catches it!
    expect(diff.isNearIdentical).toBe(true);
    expect(diff.matchType).toBe('PERCEPTUAL_NEAR_IDENTICAL');
    expect(diff.similarityScore).toBeGreaterThanOrEqual(96);

    const result = await compareImages({
      beforeUrl: '/uploads/test_fixture_before.jpg',
      afterUrl: '/uploads/test_fixture_recompressed.jpg',
      complaintTitle: 'Garbage pileup near vegetable market',
      complaintDescription: 'Severe organic waste spilling onto road.',
      complaintCategory: 'GARBAGE_ACCUMULATION',
    });

    expect(result.comparisonStatus).toBe('IDENTICAL_IMAGE');
    expect(result.isIdenticalImage).toBe(true);
    expect(result.matchType).toBe('PERCEPTUAL_NEAR_IDENTICAL');
    expect(result.reasoningSummary).toMatch(/near-identical/i);
    expect(result.comparisonStatus).not.toBe('IMPROVED');
  });

  // -------------------------------------------------------------------------
  // 3. Genuine cleanup with clearly less visible garbage
  // -------------------------------------------------------------------------
  test('Case 3: Genuine cleanup supported by evidence normalises to IMPROVED with observable changes', () => {
    const rawModelOutput = {
      comparison_status: 'IMPROVED',
      before_observations: ['Massive garbage mound covering asphalt', 'Scattered plastic bags and decomposed organics'],
      after_observations: ['Road surface fully cleared', 'Freshly swept concrete sidewalk'],
      observable_changes: ['Complete removal of 3-ton waste heap', 'Ground swept and bleached'],
      remaining_problems: ['None visible'],
      complaint_relevance: 'RELEVANT',
      confidence: 'HIGH',
      reasoning_summary: 'The garbage pile has been completely cleared and the road surface is clean.',
      limitations: ['Photograph taken from slightly different angle'],
    };

    const normalised = normaliseResponse(rawModelOutput, {
      matchType: 'DIFFERENT',
      similarityScore: 45.2,
      isIdentical: false,
    });

    expect(normalised.comparisonStatus).toBe('IMPROVED');
    expect(normalised.outcome).toBe('POLLUTION_REDUCED');
    expect(normalised.confidence).toBe('HIGH');
    expect(normalised.observableChanges).toHaveLength(2);
    expect(normalised.isIdenticalImage).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 4. Partial cleanup with garbage still remaining
  // -------------------------------------------------------------------------
  test('Case 4: Partial cleanup with remaining garbage reports PARTIALLY_IMPROVED and lists remaining issues', () => {
    const rawModelOutput = {
      comparison_status: 'PARTIALLY_IMPROVED',
      before_observations: ['Overflowing municipal dumpster and large perimeter waste pile'],
      after_observations: ['Dumpster emptied, but litter and cardboard remnants still scattered on kerb'],
      observable_changes: ['Main dumpster bin was emptied'],
      remaining_problems: ['Cardboard scraps and plastic debris still scattered within 5 meters of bin'],
      complaint_relevance: 'RELEVANT',
      confidence: 'MEDIUM',
      reasoning_summary: 'Dumpster was emptied, but ground-level waste surrounding the bin has not been fully cleared.',
      limitations: ['Evening lighting cast shadows near corner'],
    };

    const normalised = normaliseResponse(rawModelOutput);
    expect(normalised.comparisonStatus).toBe('PARTIALLY_IMPROVED');
    expect(normalised.outcome).toBe('POLLUTION_STILL_VISIBLE');
    expect(normalised.remainingProblems[0]).toMatch(/cardboard/i);
    expect(normalised.recommendedAction).toMatch(/remaining cleanup/i);
  });

  // -------------------------------------------------------------------------
  // 5. After image showing more garbage or worse damage
  // -------------------------------------------------------------------------
  test('Case 5: After image with worse conditions reports WORSENED', () => {
    const rawModelOutput = {
      comparison_status: 'WORSENED',
      before_observations: ['Small pile of domestic waste bags'],
      after_observations: ['Substantially larger commercial dumping spanning the entire lane'],
      observable_changes: ['Waste volume increased significantly'],
      remaining_problems: ['Massive blockage across traffic lane'],
      complaint_relevance: 'RELEVANT',
      confidence: 'HIGH',
      reasoning_summary: 'Garbage accumulation has intensified rather than being resolved.',
      limitations: [],
    };

    const normalised = normaliseResponse(rawModelOutput);
    expect(normalised.comparisonStatus).toBe('WORSENED');
    expect(normalised.outcome).toBe('POLLUTION_STILL_VISIBLE');
    expect(normalised.recommendedAction).toMatch(/reject/i);
  });

  // -------------------------------------------------------------------------
  // 6. Unrelated before and after photographs
  // -------------------------------------------------------------------------
  test('Case 6: Unrelated before/after photographs are forced to INCONCLUSIVE (not fabricated improvement)', () => {
    const rawModelOutput = {
      comparison_status: 'IMPROVED', // Model erroneously claims improved
      before_observations: ['Pothole on urban street'],
      after_observations: ['A park bench in a garden'],
      observable_changes: [],
      remaining_problems: [],
      complaint_relevance: 'IRRELEVANT', // But detected as irrelevant!
      confidence: 'LOW',
      reasoning_summary: 'Image shows a park instead of the reported street pothole.',
      limitations: ['Completely different locations depicted'],
    };

    const normalised = normaliseResponse(rawModelOutput);
    // Cross-validation MUST reject the IMPROVED claim
    expect(normalised.comparisonStatus).toBe('INCONCLUSIVE');
    expect(normalised.outcome).toBe('UNCERTAIN');
    expect(normalised.confidence).toBe('LOW');
  });

  // -------------------------------------------------------------------------
  // 7. Complaint about municipal garbage: no river hallucination in prompt
  // -------------------------------------------------------------------------
  test('Case 7: Comparison prompt for municipal garbage contains category-specific criteria and anti-river rules', () => {
    const prompt = buildComparisonPrompt({
      complaintTitle: 'Massive garbage pileup near vegetable market',
      complaintDescription: 'Decomposed organic waste and plastic containers spilling onto walkway.',
      complaintCategory: 'GARBAGE_ACCUMULATION',
      attemptDescription: 'Sanitation crew cleared 3.5 tons of garbage.',
    });

    // Contains complaint details
    expect(prompt).toContain('Garbage Accumulation & Solid Waste');
    expect(prompt).toContain('Massive garbage pileup near vegetable market');
    // Contains strict anti-river and anti-water directives
    expect(prompt).toMatch(/NEVER mention rivers, canals, streams, lakes, or water bodies/i);
    expect(prompt).toContain('municipal waste volume');
    expect(prompt).toContain('STRICT ANTI-HALLUCINATION RULES');
  });

  // -------------------------------------------------------------------------
  // 8. Missing, corrupt or inaccessible images
  // -------------------------------------------------------------------------
  test('Case 8: Inaccessible or corrupt image returns explicit error and INCONCLUSIVE', async () => {
    const resultMissing = await compareImages({
      beforeUrl: '/uploads/definitely_non_existent_before.jpg',
      afterUrl: '/uploads/definitely_non_existent_after.jpg',
      complaintTitle: 'Missing streetlight',
      complaintCategory: 'STREETLIGHT_FAULT',
    });

    expect(resultMissing.comparisonStatus).toBe('MODEL_UNAVAILABLE');
    expect(resultMissing.error).toMatch(/not found/i);
    expect(resultMissing.confidence).toBe('UNKNOWN');
  });

  // -------------------------------------------------------------------------
  // 9. Ollama unavailable or invalid model output
  // -------------------------------------------------------------------------
  test('Case 9: Malformed JSON from model parses gracefully to INCONCLUSIVE without crashing', () => {
    const invalidJson = 'Hello inspector, the after image looks clean! (no valid json)';
    const parsed = parseModelJson(invalidJson);
    expect(parsed).toBeNull();

    // With markdown wrapping:
    const markdownWrapped = 'Here is the report:\n```json\n{"comparison_status": "NO_CLEAR_IMPROVEMENT", "before_observations": ["pothole"], "after_observations": ["pothole still open"], "observable_changes": [], "remaining_problems": ["pothole not filled"], "complaint_relevance": "RELEVANT", "confidence": "HIGH", "reasoning_summary": "No work performed."}\n```';
    const parsedMd = parseModelJson(markdownWrapped);
    expect(parsedMd).not.toBeNull();
    expect(parsedMd.comparison_status).toBe('NO_CLEAR_IMPROVEMENT');
  });

  // -------------------------------------------------------------------------
  // 10. Multiple complaints and resolution attempts pairing
  // -------------------------------------------------------------------------
  test('Case 10: compareImageFiles accurately isolates pairs and distinguishes different files', async () => {
    const diffIdentical = await compareImageFiles('/uploads/test_fixture_before.jpg', '/uploads/test_fixture_identical.jpg');
    const diffDifferent = await compareImageFiles('/uploads/test_fixture_before.jpg', '/uploads/test_fixture_different.jpg');

    expect(diffIdentical.isIdentical).toBe(true);
    expect(diffDifferent.isIdentical).toBe(false);
    expect(diffDifferent.matchType).toBe('DIFFERENT');
    expect(diffDifferent.similarityScore).toBeLessThan(90);
  });
});

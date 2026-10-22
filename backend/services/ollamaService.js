const { env } = require('../config/env');
const { AI_OUTCOMES, CATEGORY_LABELS } = require('../utils/constants');
const { compareImageFiles, readImageBuffer } = require('./imageComparisonService');

/** Category-specific inspection guidance to eliminate hallucinations */
const CATEGORY_GUIDANCE = {
  GARBAGE_ACCUMULATION:
    'Focus on: municipal waste volume, overflowing trash bins, scattered litter/plastic/organic debris, ground surface cleanliness, sanitation. DO NOT mention rivers or water bodies unless the complaint or photograph explicitly shows a natural water body.',
  POTHOLES_ROAD_DAMAGE:
    'Focus on: asphalt road surface, crater or pothole depth and width, asphalt patching, tar smoothness, remaining cracks or hazardous depressions.',
  OPEN_MANHOLE:
    'Focus on: manhole chamber opening, presence of heavy-duty ductile cover or concrete lid, safety barricading, fall hazards for pedestrians.',
  STREETLIGHT_FAULT:
    'Focus on: lamppost pole, luminaire/fixture condition, exposed wiring, physical damage, daylight vs night illumination.',
  WATER_LEAKAGE:
    'Focus on: municipal water pipeline rupture, water pooling or gushing on roadway, standing water vs dry ground surface.',
  SEWAGE_OVERFLOW:
    'Focus on: domestic sewage discharge, drain canal blockage, sludge, standing blackwater, overflow cessation.',
  PUBLIC_FACILITY_DAMAGE:
    'Focus on: public footpaths, benches, railings, bus shelters, safety barriers, physical structural repairs.',
  ENVIRONMENTAL_POLLUTION:
    'Focus strictly on the specific environmental issue reported in the complaint. DO NOT invent or assume water/river presence unless the complaint text or photograph depicts one.',
};

/**
 * Builds an objective, complaint-specific prompt for the local vision model.
 */
function buildComparisonPrompt({ complaintTitle, complaintDescription, complaintCategory, attemptDescription }) {
  const categoryLabel = CATEGORY_LABELS[complaintCategory] || complaintCategory || 'Civic Issue';
  const categoryGuide = CATEGORY_GUIDANCE[complaintCategory] || 'Focus on the physical civic issue described in the complaint.';

  return `You are an objective municipal civic inspector verifying if a reported civic problem has genuinely been fixed.
Two photographs of the location are provided:
- Image 1 is the BEFORE photo taken when the citizen reported the issue.
- Image 2 is the AFTER photo submitted as evidence of resolution.

COMPLAINT CONTEXT:
- Issue Category: ${categoryLabel}
- Complaint Title: "${complaintTitle || 'Not specified'}"
- Citizen Report Description: "${complaintDescription || 'Not specified'}"
${attemptDescription ? `- Claimed Resolution Work: "${attemptDescription}"` : ''}

INSPECTION GUIDANCE:
${categoryGuide}

STRICT ANTI-HALLUCINATION RULES:
1. ONLY describe objects and conditions that are visually obvious in the photographs.
2. DO NOT assume Image 2 is cleaner simply because it was submitted as resolution proof. If the problem is still visible, state that clearly.
3. NEVER mention rivers, canals, streams, lakes, or water bodies unless the complaint is specifically about a water body or water is clearly visible in the photos. This is a municipal civic complaint.
4. Do NOT infer that an entire area is clean from a tightly cropped or unrelated photograph.
5. If the two photos show different angles, different locations, or cannot be correlated, mark comparison_status as "INCONCLUSIVE".

Answer the following questions through the required JSON structure:
1. What relevant objects or conditions are visible in Image 1 (BEFORE)?
2. What relevant objects or conditions are visible in Image 2 (AFTER)?
3. What specific physical differences can be observed between the two?
4. Is there visible evidence that the reported problem has improved?
5. Is the problem still visible in Image 2?
6. What cannot be determined from the photographs (limitations)?

Respond with ONLY a valid JSON object matching this exact schema:
{
  "comparison_status": "IMPROVED" | "PARTIALLY_IMPROVED" | "NO_CLEAR_IMPROVEMENT" | "WORSENED" | "INCONCLUSIVE",
  "before_observations": ["specific visible objects or conditions in image 1"],
  "after_observations": ["specific visible objects or conditions in image 2"],
  "observable_changes": ["specific differences observed between image 1 and image 2"],
  "remaining_problems": ["specific issues, waste, or damage still visible in image 2, or 'None visible'"],
  "complaint_relevance": "RELEVANT" | "PARTIALLY_RELEVANT" | "IRRELEVANT" | "UNCERTAIN",
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "reasoning_summary": "1-2 sentence factual summary of the visible evidence",
  "limitations": ["factors like lighting, different camera angles, crops, or unverified areas"]
}`;
}

/** Pulls the first valid JSON object out of a model response string. */
function parseModelJson(text) {
  if (!text || typeof text !== 'string') return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (_e) {
    // Attempt minor regex cleanup if JSON contained trailing commas
    try {
      const sanitized = text
        .slice(start, end + 1)
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

/** Maps modern comparison status to legacy outcome for backwards compatibility */
function mapToLegacyOutcome(status) {
  switch (status) {
    case 'IMPROVED':
      return 'POLLUTION_REDUCED';
    case 'PARTIALLY_IMPROVED':
    case 'NO_CLEAR_IMPROVEMENT':
    case 'WORSENED':
      return 'POLLUTION_STILL_VISIBLE';
    case 'IDENTICAL_IMAGE':
    case 'INCONCLUSIVE':
    default:
      return 'UNCERTAIN';
  }
}

/** Validates and normalizes raw model output against the structured schema */
function normaliseResponse(raw, diffInfo = {}) {
  const cleanStr = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const cleanArr = (arr, maxItems = 6, maxLen = 300) =>
    Array.isArray(arr)
      ? arr
          .filter((x) => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim().slice(0, maxLen))
          .slice(0, maxItems)
      : [];

  const ALLOWED_STATUSES = ['IMPROVED', 'PARTIALLY_IMPROVED', 'NO_CLEAR_IMPROVEMENT', 'WORSENED', 'INCONCLUSIVE', 'IDENTICAL_IMAGE'];
  const ALLOWED_RELEVANCE = ['RELEVANT', 'PARTIALLY_RELEVANT', 'IRRELEVANT', 'UNCERTAIN'];
  const ALLOWED_CONFIDENCE = ['LOW', 'MEDIUM', 'HIGH'];

  let comparisonStatus = ALLOWED_STATUSES.includes(raw.comparison_status) ? raw.comparison_status : 'INCONCLUSIVE';
  let complaintRelevance = ALLOWED_RELEVANCE.includes(raw.complaint_relevance) ? raw.complaint_relevance : 'UNCERTAIN';
  let confidence = ALLOWED_CONFIDENCE.includes(String(raw.confidence).toUpperCase()) ? String(raw.confidence).toUpperCase() : 'UNKNOWN';

  // Support legacy input { outcome: '...' }
  if (!raw.comparison_status && raw.outcome) {
    if (raw.outcome === 'POLLUTION_REDUCED') {
      comparisonStatus = 'IMPROVED';
    } else if (raw.outcome === 'POLLUTION_STILL_VISIBLE') {
      comparisonStatus = 'PARTIALLY_IMPROVED';
    } else {
      comparisonStatus = 'INCONCLUSIVE';
    }
  }

  const beforeObs = cleanArr(raw.before_observations);
  const afterObs = cleanArr(raw.after_observations);
  const changes = cleanArr(raw.observable_changes);
  const remaining = cleanArr(raw.remaining_problems);
  const limitations = cleanArr(raw.limitations);
  let summary = cleanStr(raw.reasoning_summary);

  // Cross-validation checks (for structured model responses)
  if (raw.comparison_status) {
    // 1. If complaint relevance is IRRELEVANT or UNCERTAIN, status cannot be claimed as IMPROVED
    if ((complaintRelevance === 'IRRELEVANT' || complaintRelevance === 'UNCERTAIN') && comparisonStatus === 'IMPROVED') {
      comparisonStatus = 'INCONCLUSIVE';
      confidence = 'LOW';
      limitations.push('Complaint relevance uncertain; cannot confirm cleanup without clear location match.');
    }

    // 2. If no observable changes were detected, comparison cannot be IMPROVED
    if (changes.length === 0 && comparisonStatus === 'IMPROVED') {
      comparisonStatus = 'NO_CLEAR_IMPROVEMENT';
      confidence = 'LOW';
    }

    // 3. If remaining problems exist and status is IMPROVED, adjust to PARTIALLY_IMPROVED
    const hasRemainingIssues = remaining.some((r) => !/none|no (remaining|debris|waste|issues)/i.test(r));
    if (hasRemainingIssues && comparisonStatus === 'IMPROVED') {
      comparisonStatus = 'PARTIALLY_IMPROVED';
    }
  }

  if (!summary) {
    if (comparisonStatus === 'IMPROVED') summary = 'Visible improvement detected in target area.';
    else if (comparisonStatus === 'PARTIALLY_IMPROVED') summary = 'Partial improvement observed, but some issues remain visible.';
    else if (comparisonStatus === 'NO_CLEAR_IMPROVEMENT') summary = 'No clear visual improvement observed in comparison photos.';
    else if (comparisonStatus === 'WORSENED') summary = 'Condition appears worsened in after-resolution photograph.';
    else summary = 'Inconclusive comparison. Visual evidence does not allow definitive resolution assessment.';
  }

  // Generate suggested municipal action based on validated status
  let recommendedAction = 'Review photographs manually on-site before closing complaint.';
  if (comparisonStatus === 'IMPROVED') {
    recommendedAction = 'Visual improvement substantiated. Ready for citizen verification and confirmation.';
  } else if (comparisonStatus === 'PARTIALLY_IMPROVED') {
    recommendedAction = 'Instruct field crew to complete remaining cleanup before citizen re-inspection.';
  } else if (comparisonStatus === 'NO_CLEAR_IMPROVEMENT' || comparisonStatus === 'WORSENED') {
    recommendedAction = 'Reject resolution proof and re-dispatch response team to rectify issues.';
  }

  const legacyOutcome = mapToLegacyOutcome(comparisonStatus);

  return {
    comparisonStatus,
    outcome: legacyOutcome,
    model: env.ollamaModel,
    beforeObservations: beforeObs,
    afterObservations: afterObs,
    observableChanges: changes,
    remainingProblems: remaining,
    complaintRelevance,
    confidence,
    reasoningSummary: summary,
    limitations,
    recommendedAction,
    // Visual-difference layer
    isIdenticalImage: !!diffInfo.isIdentical || !!diffInfo.isNearIdentical,
    matchType: diffInfo.matchType || 'DIFFERENT',
    similarityScore: diffInfo.similarityScore != null ? diffInfo.similarityScore : null,
    beforeSha256: diffInfo.beforeSha256 || undefined,
    afterSha256: diffInfo.afterSha256 || undefined,
    // Legacy schema compatibility
    pollutionBefore: beforeObs.join('; ') || 'Reported civic issue photograph.',
    pollutionAfter: afterObs.join('; ') || 'Claimed cleanup photograph.',
    apparentChange: changes.join('; ') || summary,
    remainingWaste: remaining.join('; ') || (comparisonStatus === 'IMPROVED' ? 'none visible' : 'Visible issues remain'),
    comparedAt: new Date(),
  };
}

/** Standard fallback when model is unreachable, times out, or fails */
function unavailableResult(reason, diffInfo = {}) {
  return {
    comparisonStatus: 'MODEL_UNAVAILABLE',
    outcome: 'MODEL_UNAVAILABLE',
    model: env.ollamaModel,
    confidence: 'UNKNOWN',
    error: reason,
    beforeObservations: [],
    afterObservations: [],
    observableChanges: [],
    remainingProblems: ['Vision model unreachable or timed out; cannot verify.'],
    complaintRelevance: 'UNCERTAIN',
    reasoning_summary: `AI advisory unavailable: ${reason}`,
    reasoningSummary: `AI advisory unavailable: ${reason}`,
    limitations: [reason],
    recommendedAction: 'AI comparison unavailable. Manually review resolution photographs.',
    isIdenticalImage: !!diffInfo.isIdentical,
    matchType: diffInfo.matchType || 'UNKNOWN',
    similarityScore: diffInfo.similarityScore || 0,
    comparedAt: new Date(),
  };
}

/**
 * Compares before/after civic photos using:
 * 1. Deterministic file comparison (exact SHA-256 and perceptual similarity)
 * 2. Category-specific Ollama vision inference when files genuinely differ
 * Never throws: always returns structured advisory object.
 */
async function compareImages(optionsOrBeforeUrl, afterUrlArg) {
  // Support both object signature { beforeUrl, afterUrl, complaintTitle, ... }
  // and legacy two-argument signature compareImages(beforeUrl, afterUrl)
  let beforeUrl;
  let afterUrl;
  let complaintTitle = '';
  let complaintDescription = '';
  let complaintCategory = 'OTHER';
  let attemptDescription = '';

  if (typeof optionsOrBeforeUrl === 'object' && optionsOrBeforeUrl !== null) {
    beforeUrl = optionsOrBeforeUrl.beforeUrl;
    afterUrl = optionsOrBeforeUrl.afterUrl;
    complaintTitle = optionsOrBeforeUrl.complaintTitle || '';
    complaintDescription = optionsOrBeforeUrl.complaintDescription || '';
    complaintCategory = optionsOrBeforeUrl.complaintCategory || 'OTHER';
    attemptDescription = optionsOrBeforeUrl.attemptDescription || '';
  } else {
    beforeUrl = optionsOrBeforeUrl;
    afterUrl = afterUrlArg;
  }

  if (!beforeUrl || !afterUrl) {
    return unavailableResult('Missing before or after image reference.');
  }

  // =========================================================================
  // STEP 1: DETERMINISTIC IDENTICAL-IMAGE CHECK (No Ollama inference)
  // =========================================================================
  const diff = await compareImageFiles(beforeUrl, afterUrl);

  if (!diff.success) {
    return unavailableResult(`Could not read image files from disk: ${diff.error}`, diff);
  }

  // Exact file cryptographic match (SHA-256)
  if (diff.isIdentical) {
    return {
      comparisonStatus: 'IDENTICAL_IMAGE',
      outcome: 'UNCERTAIN',
      model: 'DETERMINISTIC_HASH_CHECK',
      confidence: 'HIGH',
      isIdenticalImage: true,
      matchType: 'EXACT_SHA256',
      similarityScore: 100,
      beforeSha256: diff.beforeSha256,
      afterSha256: diff.afterSha256,
      beforeObservations: ['Original complaint photograph.'],
      afterObservations: ['Exact identical photograph file uploaded as resolution evidence.'],
      observableChanges: ['None. Before and after photographs are byte-for-byte identical.'],
      remainingProblems: ['Cannot verify resolution: duplicate image submitted without demonstrating cleanup.'],
      complaintRelevance: 'RELEVANT',
      reasoningSummary: 'Identical images — no change demonstrated. The uploaded proof is byte-for-byte identical to the complaint photo (SHA-256 match).',
      limitations: ['Exact cryptographic match detected. Vision model inference skipped to prevent false claims of improvement.'],
      recommendedAction: 'Reject resolution evidence: identical photo submitted. Request fresh proof taken after actual cleanup.',
      // Legacy compatibility
      pollutionBefore: 'Original complaint photo.',
      pollutionAfter: 'Duplicate copy of complaint photo.',
      apparentChange: 'None. Exact duplicate file uploaded.',
      remainingWaste: 'Identical photograph submitted.',
      comparedAt: new Date(),
    };
  }

  // Visually near-identical copy (recompressed, resized, or near-identical duplicate)
  if (diff.isNearIdentical) {
    return {
      comparisonStatus: 'IDENTICAL_IMAGE',
      outcome: 'UNCERTAIN',
      model: 'PERCEPTUAL_HASH_CHECK',
      confidence: 'HIGH',
      isIdenticalImage: true,
      matchType: 'PERCEPTUAL_NEAR_IDENTICAL',
      similarityScore: diff.similarityScore,
      beforeSha256: diff.beforeSha256,
      afterSha256: diff.afterSha256,
      beforeObservations: ['Original complaint photograph.'],
      afterObservations: ['Visually identical or recompressed copy of complaint photograph.'],
      observableChanges: ['No physical improvements or cleanup changes observed.'],
      remainingProblems: ['Uploaded proof is a duplicate or slight recompression of the complaint photograph.'],
      complaintRelevance: 'RELEVANT',
      reasoningSummary: `Near-identical image detected (${diff.similarityScore}% visual match). No cleanup demonstrated.`,
      limitations: ['Perceptual and structural similarity check detected a near-duplicate image without physical changes.'],
      recommendedAction: 'Warning: uploaded evidence appears to be a duplicate or recompressed version of the original photo. Inspect on-site.',
      // Legacy compatibility
      pollutionBefore: 'Original complaint photo.',
      pollutionAfter: 'Near-identical duplicate photo.',
      apparentChange: 'No physical change detected between images.',
      remainingWaste: 'Near-duplicate photo submitted.',
      comparedAt: new Date(),
    };
  }

  // =========================================================================
  // STEP 2: LOAD ENCODED IMAGES FOR OLLAMA INFERENCE
  // =========================================================================
  let images;
  try {
    const beforeBuf = readImageBuffer(beforeUrl);
    const afterBuf = readImageBuffer(afterUrl);
    images = [beforeBuf.toString('base64'), afterBuf.toString('base64')];
  } catch (err) {
    return unavailableResult(`Failed to encode images for vision model: ${err.message}`, diff);
  }

  // =========================================================================
  // STEP 3: CALL OLLAMA WITH COMPLAINT-SPECIFIC STRUCTURED PROMPT
  // =========================================================================
  const prompt = buildComparisonPrompt({
    complaintTitle,
    complaintDescription,
    complaintCategory,
    attemptDescription,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.ollamaTimeoutMs);

  try {
    const res = await fetch(`${env.ollamaBaseUrl.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.ollamaModel,
        prompt,
        images,
        stream: false,
        format: 'json',
        options: { temperature: 0.1 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return unavailableResult(`Ollama returned HTTP ${res.status}. ${body.slice(0, 200)}`, diff);
    }

    const data = await res.json();
    const parsed = parseModelJson(data.response);

    if (!parsed) {
      return {
        ...unavailableResult('Model reply was not valid JSON.', diff),
        comparisonStatus: 'INCONCLUSIVE',
        outcome: 'UNCERTAIN',
        recommendedAction: 'AI output could not be parsed. Review the photographs manually.',
      };
    }

    return normaliseResponse(parsed, diff);
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'Ollama request timed out.' : `Ollama is not reachable at ${env.ollamaBaseUrl}.`;
    return unavailableResult(reason, diff);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  compareImages,
  buildComparisonPrompt,
  parseModelJson,
  normaliseResponse,
  normalise: normaliseResponse,
  CATEGORY_GUIDANCE,
};

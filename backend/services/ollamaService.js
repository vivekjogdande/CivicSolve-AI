const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');
const { AI_OUTCOMES } = require('../utils/constants');
const { UPLOAD_DIR } = require('../middleware/upload');

const PROMPT = `You are assisting an environmental inspector. Two river-pollution photographs are provided.
Image 1 is the BEFORE photo (original complaint). Image 2 is the AFTER photo (claimed cleanup).
Compare only what is visibly present. Do not guess about things you cannot see.
Respond with ONLY a JSON object with exactly these keys:
{
  "pollution_before": "short description of visible pollution in image 1",
  "pollution_after": "short description of visible pollution in image 2",
  "apparent_change": "what visibly changed between the two",
  "remaining_waste": "visible waste still present in image 2, or 'none visible'",
  "outcome": "POLLUTION_REDUCED" | "POLLUTION_STILL_VISIBLE" | "UNCERTAIN",
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "recommended_action": "one sentence next step for the officer"
}
If the images look like different places or the comparison is unclear, use outcome "UNCERTAIN".`;

const readB64 = (url) => {
  const file = path.join(UPLOAD_DIR, path.basename(url));
  return fs.readFileSync(file).toString('base64');
};

function unavailable(reason) {
  return { outcome: 'MODEL_UNAVAILABLE', model: env.ollamaModel, confidence: 'UNKNOWN', error: reason, comparedAt: new Date() };
}

/** Pulls the first JSON object out of a model reply (models sometimes wrap it in prose or code fences). */
function parseModelJson(text) {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalise(raw) {
  const s = (v) => (typeof v === 'string' ? v.slice(0, 600) : v == null ? '' : String(v).slice(0, 600));
  const outcome = AI_OUTCOMES.includes(raw.outcome) && raw.outcome !== 'MODEL_UNAVAILABLE' ? raw.outcome : 'UNCERTAIN';
  const confidence = ['LOW', 'MEDIUM', 'HIGH'].includes(String(raw.confidence).toUpperCase()) ? String(raw.confidence).toUpperCase() : 'UNKNOWN';
  return {
    outcome,
    model: env.ollamaModel,
    pollutionBefore: s(raw.pollution_before),
    pollutionAfter: s(raw.pollution_after),
    apparentChange: s(raw.apparent_change),
    remainingWaste: s(raw.remaining_waste),
    confidence,
    recommendedAction: s(raw.recommended_action),
    comparedAt: new Date(),
  };
}

/**
 * Compares before/after photos with a local Ollama vision model. Never throws:
 * any failure returns outcome MODEL_UNAVAILABLE so the rest of the app keeps working.
 * The result is advisory only.
 */
async function compareImages(beforeUrl, afterUrl) {
  let images;
  try {
    images = [readB64(beforeUrl), readB64(afterUrl)];
  } catch (e) {
    return unavailable('Could not read image files from disk.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.ollamaTimeoutMs);
  try {
    const res = await fetch(`${env.ollamaBaseUrl.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.ollamaModel, prompt: PROMPT, images, stream: false, format: 'json', options: { temperature: 0.1 } }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return unavailable(`Ollama returned HTTP ${res.status}. ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const parsed = parseModelJson(data.response);
    if (!parsed) return { ...unavailable('Model reply was not valid JSON.'), outcome: 'UNCERTAIN', recommendedAction: 'AI output could not be interpreted. Review the photos manually.' };
    return normalise(parsed);
  } catch (e) {
    const reason = e.name === 'AbortError' ? 'Ollama request timed out.' : `Ollama is not reachable at ${env.ollamaBaseUrl}.`;
    return unavailable(reason);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { compareImages, parseModelJson, normalise };

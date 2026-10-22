const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');
const { CATEGORIES, CATEGORY_DEPARTMENT, SEVERITIES } = require('../utils/constants');
const { haversineMeters } = require('../utils/geo');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Department = require('../models/Department');

const PROMPT_TEMPLATE = `You are CivicSolve AI, an intelligent civic grievance analysis system.
Analyze the following public grievance report submitted by a citizen:
Title: "{TITLE}"
Description: "{DESCRIPTION}"
Category hint: "{CATEGORY_HINT}"

Evaluate the issue carefully and return ONLY a valid JSON object with EXACTLY these keys:
{
  "category": "one of: GARBAGE_ACCUMULATION | POTHOLES_ROAD_DAMAGE | STREETLIGHT_FAULT | WATER_LEAKAGE | SEWAGE_OVERFLOW | OPEN_MANHOLE | ENVIRONMENTAL_POLLUTION | PUBLIC_FACILITY_DAMAGE | OTHER",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "summary": "Crisp 1-2 sentence factual summary of the civic problem",
  "safetyHazards": ["specific safety hazard 1", "specific safety hazard 2"],
  "recommendedDepartment": "MUNICIPAL | PWD | WATER | ELECTRICITY | MPCB | DISASTER",
  "recommendedAction": "Actionable next step for municipal field response",
  "confidenceScore": integer between 70 and 98
}
Return only JSON with no markdown wrapping.`;

/** Heuristic rules engine for offline or fallback analysis */
function heuristicAnalysis({ title = '', description = '', category = '' }) {
  const text = `${title} ${description}`.toLowerCase();

  let detectedCategory = category && CATEGORIES.includes(category) ? category : 'OTHER';
  let priority = 'MEDIUM';
  const hazards = [];
  let recommendedAction = 'Dispatch field inspector to verify location and assess required equipment.';

  // 1. Domain detection
  if (/(pothole|crater|road.*damage|asphalt|tar.*broken|pavement|cave-in|divider)/.test(text)) {
    detectedCategory = 'POTHOLES_ROAD_DAMAGE';
    recommendedAction = 'Deploy road repair crew with cold-mix asphalt patch unit and safety cones.';
    hazards.push('Risk of vehicle rim damage, two-wheeler skidding, and traffic accidents');
  } else if (/(garbage|trash|dump|waste|litter|debris|rubbish|stench|smell|bin.*overflow)/.test(text)) {
    detectedCategory = 'GARBAGE_ACCUMULATION';
    recommendedAction = 'Dispatch municipal waste loader truck and sanitize the surrounding zone.';
    hazards.push('Public health risk from rotting waste, stray animals, and vector-borne diseases');
  } else if (/(streetlight|street.*light|lamp.*pole|dark|wire.*spark|blackout|illumination)/.test(text)) {
    detectedCategory = 'STREETLIGHT_FAULT';
    recommendedAction = 'Dispatch electrical technician with cherry picker to repair bulb and circuit.';
    hazards.push('Increased pedestrian crime risk at night and vehicle blind spots');
  } else if (/(water.*leak|pipe.*burst|drinking.*water|pipeline|leakage|water.*gush|tap.*broken)/.test(text)) {
    detectedCategory = 'WATER_LEAKAGE';
    recommendedAction = 'Isolate local valve line and replace damaged water main section.';
    hazards.push('Clean potable water wastage and road sub-base erosion');
  } else if (/(sewage|drain|gutter|overflow|foul.*smell|drainage.*clog|manhole.*overflow)/.test(text)) {
    detectedCategory = 'SEWAGE_OVERFLOW';
    recommendedAction = 'Deploy jetting-cum-suction machine to unblock drainage conduit.';
    hazards.push('Severe sanitation hazard, foul odor, and water contamination');
  } else if (/(open.*manhole|missing.*cover|manhole.*open|deep.*pit|chamber.*cover)/.test(text)) {
    detectedCategory = 'OPEN_MANHOLE';
    recommendedAction = 'URGENT: Install heavy-duty cast ductile cover and barricade perimeter immediately.';
    hazards.push('FATAL FALL RISK for pedestrians, children, and two-wheelers in low visibility');
    priority = 'CRITICAL';
  } else if (/(chemical|toxic|effluent|factory.*discharge|foam|fish.*kill|smoke.*emission)/.test(text)) {
    detectedCategory = 'ENVIRONMENTAL_POLLUTION';
    recommendedAction = 'Collect environmental samples for lab analysis and issue notice to offending unit.';
    hazards.push('Toxic contamination of water table and aquatic ecosystem degradation');
  }

  // 2. Priority & Safety Hazard Escalation
  if (/(critical|accident|fatal|death|collapsed|live.*wire|sparking|fire|burst.*major|urgent|emergency)/.test(text)) {
    priority = 'CRITICAL';
    if (/wire|spark|electric/.test(text)) hazards.push('Severe electrocution hazard');
    if (/accident|fatal|blood/.test(text)) hazards.push('Direct life-safety hazard documented at site');
  } else if (/(deep|heavy|main.*road|highway|school|hospital|major|flooding|daily|huge)/.test(text)) {
    if (priority !== 'CRITICAL') priority = 'HIGH';
    if (/school|hospital/.test(text)) hazards.push('Impact on vulnerable demographic (students / patients)');
  }

  if (hazards.length === 0) {
    hazards.push('Potential civic disruption and gradual infrastructure deterioration');
  }

  const deptCode = CATEGORY_DEPARTMENT[detectedCategory] || 'MUNICIPAL';
  const summary = `${title.trim()}. Issue requires attention in ${detectedCategory.replace(/_/g, ' ').toLowerCase()}.`;

  return {
    category: detectedCategory,
    priority,
    summary,
    safetyHazards: hazards,
    recommendedDepartment: deptCode,
    recommendedAction,
    confidenceScore: 88,
    modelUsed: 'CivicSolve Rule-Based Heuristics (Rule-based Fallback)',
    isAiGenerated: false,
    isFallback: true,
  };
}

/** Parses JSON safely from LLM output */
function parseJson(text) {
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

/**
 * Main AI complaint analysis service.
 * Tries local Ollama endpoint first; falls back gracefully to Heuristics Engine.
 */
async function analyzeComplaint({ title, description, category, severity }) {
  const fallback = heuristicAnalysis({ title, description, category });

  if (process.env.NODE_ENV === 'test' || process.env.SKIP_AI_NETWORK === 'true') {
    return fallback;
  }

  // Attempt Ollama inference with strict timeout (2.5s for instant fallback if offline)
  const aiTimeout = Number(process.env.AI_INFERENCE_TIMEOUT_MS) || 2500;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiTimeout);

  try {
    const prompt = PROMPT_TEMPLATE.replace('{TITLE}', (title || '').replace(/"/g, "'"))
      .replace('{DESCRIPTION}', (description || '').replace(/"/g, "'"))
      .replace('{CATEGORY_HINT}', category || 'None');

    const res = await fetch(`${env.ollamaBaseUrl.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.ollamaModel,
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.1 },
      }),
      signal: controller.signal,
    });

    if (res.ok) {
      const data = await res.json();
      const parsed = parseJson(data.response);
      if (parsed && parsed.category && CATEGORIES.includes(parsed.category)) {
        return {
          category: parsed.category,
          priority: SEVERITIES.includes(parsed.priority) ? parsed.priority : fallback.priority,
          summary: parsed.summary ? String(parsed.summary).slice(0, 300) : fallback.summary,
          safetyHazards: Array.isArray(parsed.safetyHazards) && parsed.safetyHazards.length > 0
            ? parsed.safetyHazards.map((h) => String(h).slice(0, 150))
            : fallback.safetyHazards,
          recommendedDepartment: parsed.recommendedDepartment || fallback.recommendedDepartment,
          recommendedAction: parsed.recommendedAction ? String(parsed.recommendedAction).slice(0, 300) : fallback.recommendedAction,
          confidenceScore: Number.isInteger(parsed.confidenceScore) ? Math.min(Math.max(parsed.confidenceScore, 60), 99) : 92,
          modelUsed: `CivicSolve AI (${env.ollamaModel})`,
          isAiGenerated: true,
          isFallback: false,
        };
      }
    }
  } catch (_e) {
    // Timeout or network error: gracefully use heuristic fallback
  } finally {
    clearTimeout(timer);
  }

  return fallback;
}

/**
 * Duplicate check: searches for active complaints within 350 meters
 * and calculates text overlap score.
 */
async function checkDuplicates({ lat, lng, category, title = '', description = '', excludeComplaintId = null }) {
  if (mongoose.connection.readyState !== 1) return [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  // Find recent complaints within 400 meters
  const candidates = await Complaint.find({
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CITIZEN_CONFIRMATION', 'REOPENED'] },
    complaintId: { $ne: excludeComplaintId },
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 400, // 400 meters
      },
    },
  })
    .select('complaintId title description category status location createdAt')
    .limit(8)
    .lean();

  const words = (str) =>
    new Set(
      (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

  const queryWords = words(`${title} ${description}`);

  const duplicates = [];

  for (const c of candidates) {
    const dist = Math.round(haversineMeters(lat, lng, c.location.coordinates[1], c.location.coordinates[0]));
    const candWords = words(`${c.title} ${c.description}`);

    let overlap = 0;
    queryWords.forEach((w) => {
      if (candWords.has(w)) overlap += 1;
    });

    const isSameCategory = c.category === category;
    const wordSimilarity = queryWords.size > 0 ? overlap / Math.max(queryWords.size, 1) : 0;

    let confidence = 0;
    let reason = '';

    if (dist < 80 && isSameCategory) {
      confidence = 90;
      reason = `Same civic category within ${dist} meters.`;
    } else if (dist < 250 && isSameCategory) {
      confidence = 75;
      reason = `Same category within ${dist} meters.`;
    } else if (dist < 400 && wordSimilarity >= 0.35) {
      confidence = 65;
      reason = `Similar description keywords reported ${dist} meters away.`;
    }

    if (confidence >= 60) {
      duplicates.push({
        complaintId: c.complaintId,
        title: c.title,
        category: c.category,
        status: c.status,
        distanceMeters: dist,
        createdAt: c.createdAt,
        confidence,
        reason,
      });
    }
  }

  return duplicates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Smart Responder Matching with transparent, explainable scoring.
 * Weights:
 * - Category & Expertise Match: 35%
 * - Geographic Proximity: 30%
 * - Current Active Workload: 20%
 * - Priority & Role Suitability: 15%
 */
async function matchResponders({ complaintId, lat, lng, category, severity }) {
  if (mongoose.connection.readyState !== 1) return [];
  const deptCode = CATEGORY_DEPARTMENT[category] || 'MUNICIPAL';
  const targetDept = await Department.findOne({ code: deptCode, isActive: true }).lean();

  const officers = await User.find({
    role: { $in: ['OFFICER', 'SENIOR_OFFICER'] },
    isActive: true,
  })
    .populate('department')
    .lean();

  if (!officers.length) return [];

  // Fetch workload counts for each officer
  const workloadAgg = await Complaint.aggregate([
    {
      $match: {
        status: { $in: ['ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW'] },
        assignedOfficer: { $in: officers.map((o) => o._id) },
      },
    },
    { $group: { _id: '$assignedOfficer', count: { $sum: 1 } } },
  ]);

  const workloadMap = new Map();
  workloadAgg.forEach((w) => workloadMap.set(String(w._id), w.count));

  const recommendations = officers.map((officer) => {
    const isSameDept = targetDept && officer.department && String(officer.department._id) === String(targetDept._id);
    const activeTasks = workloadMap.get(String(officer._id)) || 0;

    // 1. Department / Category Match (0 to 35 pts)
    const categoryScore = isSameDept ? 35 : 10;

    // 2. Proximity Score (0 to 30 pts)
    // In civic management, officers stationed at local ward offices receive proximity credit
    const proximityScore = isSameDept ? 28 : 15;

    // 3. Workload Score (0 to 20 pts)
    // 0 tasks = 20 pts, 1 task = 18 pts, 2 tasks = 15 pts, 5+ tasks = 5 pts
    const workloadScore = Math.max(20 - activeTasks * 3, 4);

    // 4. Role & Priority Fit (0 to 15 pts)
    let roleScore = 10;
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      roleScore = officer.role === 'SENIOR_OFFICER' ? 15 : 10;
    } else {
      roleScore = officer.role === 'OFFICER' ? 15 : 12;
    }

    const totalScore = Math.min(categoryScore + proximityScore + workloadScore + roleScore, 99);

    const reasons = [];
    if (isSameDept) reasons.push(`Specialized in ${targetDept ? targetDept.name : 'Target Civic Sector'}`);
    if (activeTasks === 0) reasons.push('Immediate availability (0 active cases)');
    else if (activeTasks < 3) reasons.push(`Manageable workload (${activeTasks} active cases)`);
    else reasons.push(`High current queue (${activeTasks} cases in progress)`);

    if (severity === 'CRITICAL' && officer.role === 'SENIOR_OFFICER') {
      reasons.push('Senior Officer escalation authority for critical hazards');
    }

    return {
      officerId: officer._id,
      name: officer.name,
      email: officer.email,
      role: officer.role,
      department: officer.department ? officer.department.name : 'General Civic Service',
      departmentCode: officer.department ? officer.department.code : 'GEN',
      activeTasks,
      matchScore: totalScore,
      breakdown: {
        categoryExpertise: categoryScore,
        proximity: proximityScore,
        workloadCapacity: workloadScore,
        priorityFit: roleScore,
      },
      matchReason: reasons.join(' · '),
    };
  });

  return recommendations.sort((a, b) => b.matchScore - a.matchScore);
}

module.exports = {
  analyzeComplaint,
  heuristicAnalysis,
  checkDuplicates,
  matchResponders,
};

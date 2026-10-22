/**
 * CivicSolve AI - Demo Dataset Seeder
 * Safe, idempotent seed script that populates realistic civic issues across
 * municipal departments, demonstrating the entire lifecycle:
 * SUBMITTED -> ASSIGNED -> IN_PROGRESS -> AWAITING_CONFIRMATION -> RESOLVED -> REOPENED
 *
 * Usage: `node scripts/seed-civicsolve.js`
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { env } = require('../config/env');
const { connectDB } = require('../config/db');
const Department = require('../models/Department');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const { ROLES, STATUS } = require('../utils/constants');

const DEPARTMENTS = [
  { code: 'MUNICIPAL', name: 'Municipal Corporation - Solid Waste & Sanitation', description: 'Solid waste management, garbage accumulation, open manholes and public hygiene' },
  { code: 'PWD', name: 'Public Works Department (PWD) - Roads & Bridges', description: 'Pothole repairs, asphalt resurfacing, road cave-ins and civic infrastructure' },
  { code: 'WATER', name: 'Water Supply & Sewerage Drainage Board', description: 'Pipeline leakages, sewage overflow, storm drain unclogging and water distribution' },
  { code: 'ELECTRICITY', name: 'Electricity & Streetlight Infrastructure Board', description: 'Damaged streetlights, live wire hazards, transformer faults and public illumination' },
  { code: 'MPCB', name: 'Pollution Control & Environmental Safety Board', description: 'Industrial effluent, toxic dumping, water body pollution and wildlife incidents' },
  { code: 'DISASTER', name: 'Disaster Management & Civic Safety Response', description: 'Emergency public safety hazards, structural collapse risks, and rapid response' },
];

async function seed() {
  await connectDB();
  console.log('[CivicSolve AI Seed] Connected to database.');

  // 1. Seed Departments
  const deptMap = {};
  for (const d of DEPARTMENTS) {
    const doc = await Department.findOneAndUpdate(
      { code: d.code },
      { $setOnInsert: d },
      { upsert: true, new: true }
    );
    deptMap[d.code] = doc;
    console.log(`[seed] Department ${d.code} verified.`);
  }

  // 2. Seed Demo Accounts
  const defaultPw = await bcrypt.hash('DemoPass123', 10);

  const DEMO_USERS = [
    {
      name: 'Ramesh Kadam (Admin)',
      email: 'admin@civicsolve.gov',
      role: ROLES.ADMIN,
      passwordHash: defaultPw,
    },
    {
      name: 'Priya Sharma (Senior Officer)',
      email: 'senior.sharma@civicsolve.gov',
      role: ROLES.SENIOR_OFFICER,
      department: deptMap.MUNICIPAL._id,
      passwordHash: defaultPw,
    },
    {
      name: 'Anil Deshmukh (PWD Roads Lead)',
      email: 'officer.pwd@civicsolve.gov',
      role: ROLES.OFFICER,
      department: deptMap.PWD._id,
      passwordHash: defaultPw,
    },
    {
      name: 'Sunita Patil (Sanitation Officer)',
      email: 'officer.sanitation@civicsolve.gov',
      role: ROLES.OFFICER,
      department: deptMap.MUNICIPAL._id,
      passwordHash: defaultPw,
    },
    {
      name: 'Vikram Joshi (Water Board Engineer)',
      email: 'officer.water@civicsolve.gov',
      role: ROLES.OFFICER,
      department: deptMap.WATER._id,
      passwordHash: defaultPw,
    },
    {
      name: 'Aarav Mehta (Citizen)',
      email: 'citizen.aarav@gmail.com',
      role: ROLES.CITIZEN,
      passwordHash: defaultPw,
    },
  ];

  const userMap = {};
  for (const u of DEMO_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const created = await User.create(u);
      userMap[u.email] = created;
      console.log(`[seed] Created demo user: ${u.email} (${u.role})`);
    } else {
      userMap[u.email] = existing;
      console.log(`[seed] User ${u.email} already exists.`);
    }
  }

  // 3. Seed Realistic Civic Complaints Across Lifecycle
  const citizen = userMap['citizen.aarav@gmail.com'];
  const pwdOfficer = userMap['officer.pwd@civicsolve.gov'];
  const sanOfficer = userMap['officer.sanitation@civicsolve.gov'];
  const waterOfficer = userMap['officer.water@civicsolve.gov'];

  const DEMO_COMPLAINTS = [
    {
      complaintId: 'CS-2026-DEMO01',
      title: 'Deep crater potholes causing two-wheeler accidents near Metro station',
      description: 'Multiple deep potholes spanning 2 meters across the main junction near Shivaji Chowk Metro pillar 42. Two motorcyclists slipped in waterlogged depression during evening peak hours.',
      category: 'POTHOLES_ROAD_DAMAGE',
      severity: 'HIGH',
      landmark: 'Shivaji Chowk, Metro Pillar 42, Hinjewadi Link Road',
      location: { type: 'Point', coordinates: [73.7621, 18.5912] },
      reporter: citizen ? citizen._id : undefined,
      department: deptMap.PWD._id,
      assignedOfficer: pwdOfficer ? pwdOfficer._id : undefined,
      status: STATUS.IN_PROGRESS,
      media: [{ url: '/uploads/demo-pothole.jpg', kind: 'image' }],
      intakeAiAnalysis: {
        analyzedAt: new Date(Date.now() - 36 * 3600 * 1000),
        suggestedCategory: 'POTHOLES_ROAD_DAMAGE',
        suggestedPriority: 'HIGH',
        summary: 'Deep potholes on major arterial road near Metro junction posing immediate traffic collision risk.',
        safetyHazards: [
          'High risk of two-wheeler skidding and severe injury',
          'Traffic congestion and lane deviation during peak commuting hours',
        ],
        recommendedDepartment: 'PWD',
        recommendedAction: 'Deploy road repair crew with cold-mix asphalt patch unit and safety cones.',
        confidenceScore: 94,
        isAiGenerated: true,
        modelUsed: 'CivicSolve AI (Vision & Text Intelligence)',
      },
    },
    {
      complaintId: 'CS-2026-DEMO02',
      title: 'Open drainage manhole cover missing on public pedestrian sidewalk',
      description: 'The circular ductile iron cover of the stormwater manhole has been missing for over 24 hours. The chamber is over 6 feet deep and located right in front of the primary school gate.',
      category: 'OPEN_MANHOLE',
      severity: 'CRITICAL',
      landmark: 'Opposite Model English Primary School, Ward 14',
      location: { type: 'Point', coordinates: [73.8015, 18.5524] },
      reporter: citizen ? citizen._id : undefined,
      department: deptMap.MUNICIPAL._id,
      assignedOfficer: sanOfficer ? sanOfficer._id : undefined,
      status: STATUS.UNDER_REVIEW,
      media: [{ url: '/uploads/demo-manhole.jpg', kind: 'image' }],
      intakeAiAnalysis: {
        analyzedAt: new Date(Date.now() - 12 * 3600 * 1000),
        suggestedCategory: 'OPEN_MANHOLE',
        suggestedPriority: 'CRITICAL',
        summary: 'Uncovered 6-foot drainage chamber on pedestrian path directly outside school gate.',
        safetyHazards: [
          'FATAL FALL RISK for pedestrians, school children, and visually impaired citizens',
          'Flooding hazard during unexpected rain with concealed pit',
        ],
        recommendedDepartment: 'MUNICIPAL',
        recommendedAction: 'URGENT: Install heavy-duty cast ductile cover and barricade perimeter immediately.',
        confidenceScore: 98,
        isAiGenerated: true,
        modelUsed: 'CivicSolve AI (Vision & Text Intelligence)',
      },
    },
    {
      complaintId: 'CS-2026-DEMO03',
      title: 'Massive garbage pileup and overflowing municipal bins near vegetable market',
      description: 'Decomposed organic waste and plastic containers have spilled over 30 feet onto the road. Foul stench and stray animals are preventing vendors and citizens from using the walkway.',
      category: 'GARBAGE_ACCUMULATION',
      severity: 'HIGH',
      landmark: 'Behind Old Mandi Market Gate 3, Sector 8',
      location: { type: 'Point', coordinates: [73.8245, 18.5204] },
      reporter: citizen ? citizen._id : undefined,
      department: deptMap.MUNICIPAL._id,
      assignedOfficer: sanOfficer ? sanOfficer._id : undefined,
      status: STATUS.AWAITING_CITIZEN_CONFIRMATION,
      confirmationDeadline: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      media: [{ url: '/uploads/demo-garbage-before.jpg', kind: 'image' }],
      resolutionAttempts: [
        {
          attemptNumber: 1,
          submittedBy: sanOfficer ? sanOfficer._id : undefined,
          submittedAt: new Date(Date.now() - 8 * 3600 * 1000),
          description: 'Municipal sanitation team deployed compactor truck #MH-12-8821. 3.5 tons of garbage cleared and lime bleaching powder spread.',
          actionsTaken: 'Waste removed, area disinfected with sodium hypochlorite, new 1100L HDPE bin placed.',
          evidence: { url: '/uploads/demo-garbage-after.jpg', kind: 'image' },
          validation: {
            status: 'VERIFIED',
            distanceMeters: 28,
            checks: [
              { key: 'DUPLICATE', label: 'Different from original photo', result: 'PASS', detail: 'File differs from initial report.' },
              { key: 'TIMESTAMP', label: 'Capture time after complaint', result: 'PASS', detail: 'Captured after report submission.' },
              { key: 'GPS', label: 'Within 100 m of complaint', result: 'PASS', detail: 'Photo GPS is ~28 m from reported spot.' },
            ],
            flagReasons: [],
          },
          ai: {
            outcome: 'POLLUTION_REDUCED',
            confidence: 'HIGH',
            apparentChange: 'Entire road clear of garbage pile; area sanitised and clean.',
            remainingWaste: 'none visible',
            recommendedAction: 'Ready for citizen verification and confirmation.',
          },
          confirmationDeadline: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        },
      ],
      intakeAiAnalysis: {
        analyzedAt: new Date(Date.now() - 48 * 3600 * 1000),
        suggestedCategory: 'GARBAGE_ACCUMULATION',
        suggestedPriority: 'HIGH',
        summary: 'Commercial vegetable market waste overflow obstructing transit corridor.',
        safetyHazards: [
          'Vector-borne disease vector breeding and bacterial contamination',
          'Pedestrian walkway blockage forcing people into moving traffic',
        ],
        recommendedDepartment: 'MUNICIPAL',
        recommendedAction: 'Dispatch municipal waste loader truck and sanitize the surrounding zone.',
        confidenceScore: 92,
        isAiGenerated: true,
        modelUsed: 'CivicSolve AI (Vision & Text Intelligence)',
      },
    },
    {
      complaintId: 'CS-2026-DEMO04',
      title: 'Pressurized drinking water pipeline burst flooding residential lane',
      description: 'Potable water main cracked near building 12, gushing thousands of liters per hour. Sub-base road is beginning to cave in and low water pressure across 150 households.',
      category: 'WATER_LEAKAGE',
      severity: 'HIGH',
      landmark: 'Lane 4, Near Ganpati Temple, Kothrud',
      location: { type: 'Point', coordinates: [73.8112, 18.5074] },
      reporter: citizen ? citizen._id : undefined,
      department: deptMap.WATER._id,
      assignedOfficer: waterOfficer ? waterOfficer._id : undefined,
      status: STATUS.RESOLVED_CITIZEN_CONFIRMED,
      resolvedAt: new Date(Date.now() - 24 * 3600 * 1000),
      media: [{ url: '/uploads/demo-water-burst.jpg', kind: 'image' }],
      intakeAiAnalysis: {
        analyzedAt: new Date(Date.now() - 72 * 3600 * 1000),
        suggestedCategory: 'WATER_LEAKAGE',
        suggestedPriority: 'HIGH',
        summary: 'Pressurized potable pipeline rupture causing local flooding and supply disruption.',
        safetyHazards: [
          'Potable drinking water wastage and potential sub-surface road erosion',
          'Household supply cut-off in residential community',
        ],
        recommendedDepartment: 'WATER',
        recommendedAction: 'Isolate local valve line and replace damaged water main section.',
        confidenceScore: 95,
        isAiGenerated: true,
        modelUsed: 'CivicSolve AI (Vision & Text Intelligence)',
      },
    },
  ];

  for (const c of DEMO_COMPLAINTS) {
    const existing = await Complaint.findOne({ complaintId: c.complaintId });
    if (!existing) {
      await Complaint.create(c);
      await AuditLog.create({
        complaint: c._id,
        action: 'COMPLAINT_SUBMITTED',
        toStatus: c.status,
        message: `Seeded demo issue: ${c.title}`,
        actorType: 'SYSTEM',
        isPublic: true,
      });
      console.log(`[seed] Created demo complaint: ${c.complaintId} (${c.status})`);
    } else {
      console.log(`[seed] Complaint ${c.complaintId} already exists.`);
    }
  }

  console.log('\n=============================================');
  console.log('✅ CivicSolve AI Demo Seeding Completed!');
  console.log('Demo Credentials:');
  console.log('  Citizen:   citizen.aarav@gmail.com    / DemoPass123');
  console.log('  Officer:   officer.pwd@civicsolve.gov / DemoPass123');
  console.log('  Officer:   officer.sanitation@civicsolve.gov / DemoPass123');
  console.log('  Admin:     admin@civicsolve.gov       / DemoPass123');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] Error seeding CivicSolve AI:', err.message);
  process.exit(1);
});

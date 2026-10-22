/**
 * One-time bootstrap: creates the default departments and the first administrator.
 * Usage: set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env, then `npm run seed`.
 * Safe to run repeatedly; existing records are left untouched (the admin password is never overwritten).
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { env } = require('../config/env');
const { connectDB } = require('../config/db');
const Department = require('../models/Department');
const User = require('../models/User');
const { ROLES } = require('../utils/constants');

const DEPARTMENTS = [
  { code: 'MUNICIPAL', name: 'Municipal Corporation - Solid Waste & Sanitation', description: 'Solid waste management, garbage accumulation, open manholes and public hygiene' },
  { code: 'PWD', name: 'Public Works Department (PWD) - Roads & Bridges', description: 'Pothole repairs, asphalt resurfacing, road cave-ins and civic infrastructure' },
  { code: 'WATER', name: 'Water Supply & Sewerage Drainage Board', description: 'Pipeline leakages, sewage overflow, storm drain unclogging and water distribution' },
  { code: 'ELECTRICITY', name: 'Electricity & Streetlight Infrastructure Board', description: 'Damaged streetlights, live wire hazards, transformer faults and public illumination' },
  { code: 'MPCB', name: 'Pollution Control & Environmental Safety Board', description: 'Industrial effluent, toxic dumping, water body pollution and wildlife incidents' },
  { code: 'DISASTER', name: 'Disaster Management & Civic Safety Response', description: 'Emergency public safety hazards, structural collapse risks, and rapid response' },
  { code: 'WRD', name: 'Water Resources & Canal Department', description: 'River channels, embankments, canals and water quality coordination' },
  { code: 'GRAMPANCHAYAT', name: 'Gram Panchayat / Zilla Parishad', description: 'Rural civic issues, rural road connectivity and village sanitation' },
];

(async () => {
  await connectDB();
  for (const d of DEPARTMENTS) {
    const r = await Department.updateOne({ code: d.code }, { $setOnInsert: d }, { upsert: true });
    console.log(`[seed] department ${d.code}: ${r.upsertedCount ? 'created' : 'exists'}`);
  }
  if (!env.adminEmail || !env.adminPassword) {
    console.log('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set; skipped admin creation.');
  } else if (env.adminPassword.length < 8) {
    console.log('[seed] ADMIN_PASSWORD must be at least 8 characters; skipped admin creation.');
  } else if (await User.exists({ email: env.adminEmail.toLowerCase() })) {
    console.log('[seed] admin already exists; password not changed.');
  } else {
    await User.create({ name: env.adminName, email: env.adminEmail.toLowerCase(), passwordHash: await bcrypt.hash(env.adminPassword, 12), role: ROLES.ADMIN });
    console.log(`[seed] admin created: ${env.adminEmail}`);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error('[seed] failed:', e.message);
  process.exit(1);
});

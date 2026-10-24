const bcrypt = require('bcryptjs');
const { env } = require('../config/env');
const User = require('../models/User');
const Department = require('../models/Department');
const { ROLES } = require('../utils/constants');

const DEFAULT_DEPARTMENTS = [
  { code: 'MUNICIPAL', name: 'Municipal Corporation - Solid Waste & Sanitation', description: 'Solid waste management, garbage accumulation, open manholes and public hygiene' },
  { code: 'PWD', name: 'Public Works Department (PWD) - Roads & Bridges', description: 'Pothole repairs, asphalt resurfacing, road cave-ins and civic infrastructure' },
  { code: 'WATER', name: 'Water Supply & Sewerage Drainage Board', description: 'Pipeline leakages, sewage overflow, storm drain unclogging and water distribution' },
  { code: 'ELECTRICITY', name: 'Electricity & Streetlight Infrastructure Board', description: 'Damaged streetlights, live wire hazards, transformer faults and public illumination' },
  { code: 'MPCB', name: 'Pollution Control & Environmental Safety Board', description: 'Industrial effluent, toxic dumping, water body pollution and wildlife incidents' },
  { code: 'DISASTER', name: 'Disaster Management & Civic Safety Response', description: 'Emergency public safety hazards, structural collapse risks, and rapid response' },
  { code: 'WRD', name: 'Water Resources & Canal Department', description: 'River channels, embankments, canals and water quality coordination' },
  { code: 'GRAMPANCHAYAT', name: 'Gram Panchayat / Zilla Parishad', description: 'Rural civic issues, rural road connectivity and village sanitation' },
];

/**
 * Idempotent startup bootstrap:
 * 1. Ensures core municipal departments exist in the database.
 * 2. If ADMIN_EMAIL and ADMIN_PASSWORD are configured in environment variables,
 *    automatically provisions or synchronizes the administrator authority account in MongoDB.
 */
async function bootstrap() {
  // 1. Ensure default departments exist
  try {
    for (const d of DEFAULT_DEPARTMENTS) {
      await Department.updateOne({ code: d.code }, { $setOnInsert: d }, { upsert: true });
    }
  } catch (err) {
    console.warn('[bootstrap] Warning: Could not initialize departments:', err.message);
  }

  // 2. Ensure administrator account exists if ADMIN_EMAIL & ADMIN_PASSWORD configured
  const email = (env.adminEmail || '').trim().toLowerCase();
  const password = env.adminPassword;
  const name = env.adminName || 'CivicSolve Administrator';

  if (!email || !password) {
    console.warn('[bootstrap] Notice: ADMIN_EMAIL or ADMIN_PASSWORD not configured in environment variables. Authority administrator will not be provisioned automatically on startup.');
    return;
  }

  if (password.length < 8) {
    console.warn('[bootstrap] Warning: ADMIN_PASSWORD in environment is shorter than 8 characters. Administrator provisioning skipped.');
    return;
  }

  try {
    const existing = await User.findOne({ email }).select('+passwordHash');
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 12);
      await User.create({
        name,
        email,
        passwordHash,
        role: ROLES.ADMIN,
        isActive: true,
      });
      console.log(`[bootstrap] ✅ Successfully provisioned administrator account for ${email} (Role: ADMIN)`);
    } else {
      // Synchronize password and ensure active admin status if credentials in environment updated
      const match = await bcrypt.compare(password, existing.passwordHash);
      if (!match || !existing.isActive || existing.role !== ROLES.ADMIN) {
        existing.passwordHash = await bcrypt.hash(password, 12);
        existing.isActive = true;
        existing.role = ROLES.ADMIN;
        if (name && name !== 'CivicSolve Administrator') existing.name = name;
        await existing.save();
        console.log(`[bootstrap] ✅ Successfully synchronized administrator credentials for ${email} (Role: ADMIN)`);
      } else {
        console.log(`[bootstrap] Administrator account verified for ${email}`);
      }
    }
  } catch (err) {
    console.error('[bootstrap] Error provisioning administrator account:', err.message);
  }
}

module.exports = { bootstrap };

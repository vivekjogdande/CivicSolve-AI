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
 * 2. Ensures the required authority administrator accounts exist in MongoDB with
 *    secure bcrypt password hashing (12 rounds) and role: ADMIN.
 * 3. Never stores plaintext passwords in MongoDB or prints passwords in logs.
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

  // 2. Define the authority accounts to ensure in the database
  const targetPassword = env.adminPassword || process.env.ADMIN_PASSWORD || 'Rajeshree@123';

  const accountsToEnsure = [
    {
      name: 'Vivek Jogdande',
      email: 'vivekjogdande01@gmail.com',
      password: targetPassword,
      role: ROLES.ADMIN,
    },
    {
      name: env.adminName || 'CivicSolve Administrator',
      email: 'kalmeghrajeshree88@gmail.com',
      password: targetPassword,
      role: ROLES.ADMIN,
    },
  ];

  // If a custom ADMIN_EMAIL was provided in environment, ensure it as well
  const envEmail = (env.adminEmail || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (envEmail && !accountsToEnsure.some((a) => a.email === envEmail)) {
    accountsToEnsure.push({
      name: env.adminName || 'CivicSolve Administrator',
      email: envEmail,
      password: targetPassword,
      role: ROLES.ADMIN,
    });
  }

  for (const account of accountsToEnsure) {
    try {
      const email = account.email.trim().toLowerCase();
      const existing = await User.findOne({ email }).select('+passwordHash');

      if (!existing) {
        const passwordHash = await bcrypt.hash(account.password, 12);
        await User.create({
          name: account.name,
          email,
          passwordHash,
          role: account.role,
          isActive: true,
        });
        console.log(`[bootstrap] ✅ Created authority account for ${email} (Role: ${account.role})`);
      } else {
        // Synchronize password hash and active status if needed
        const matches = await bcrypt.compare(account.password, existing.passwordHash);
        if (!matches || !existing.isActive || existing.role !== account.role) {
          existing.passwordHash = await bcrypt.hash(account.password, 12);
          existing.isActive = true;
          existing.role = account.role;
          if (account.name) existing.name = account.name;
          await existing.save();
          console.log(`[bootstrap] ✅ Synchronized authority credentials for ${email} (Role: ${account.role})`);
        } else {
          console.log(`[bootstrap] Authority account verified: ${email} (Role: ${existing.role})`);
        }
      }
    } catch (err) {
      console.error(`[bootstrap] Error ensuring authority account for ${account.email}:`, err.message);
    }
  }
}

module.exports = { bootstrap };

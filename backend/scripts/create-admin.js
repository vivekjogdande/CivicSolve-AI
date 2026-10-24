/**
 * CivicSolve AI - Administrator & Authority Account Provisioning CLI
 *
 * Securely provisions or updates an administrator / authority account using:
 * 1. Environment variables from backend/.env (ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD)
 * 2. Or command line flags: --email=... --password=... --name=... --role=... --dept=...
 *
 * Passwords are cryptographically hashed using bcrypt (12 rounds).
 * Plaintext passwords are never logged or exposed.
 *
 * Usage:
 *   npm run create:admin
 *   node scripts/create-admin.js --email=officer.pwd@civicsolve.gov --password=NewSecurePass123 --role=OFFICER --dept=PWD
 */
const bcrypt = require('bcryptjs');
const readline = require('readline');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { env } = require('../config/env');
const User = require('../models/User');
const Department = require('../models/Department');
const { ROLES, AUTHORITY_ROLES } = require('../utils/constants');

function askQuestion(query, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(query);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      let input = '';
      process.stdin.on('data', function handler(char) {
        const c = char.toString('utf8');
        if (c === '\n' || c === '\r' || c === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', handler);
          process.stdout.write('\n');
          rl.close();
          resolve(input.trim());
        } else if (c === '\u0003') {
          process.exit(1);
        } else if (c === '\b' || c === '\x7f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += c;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    }
  });
}

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...vals] = arg.slice(2).split('=');
      args[key] = vals.join('=');
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();

  let email = (args.email || env.adminEmail || '').trim().toLowerCase();
  let password = args.password || env.adminPassword;
  let name = args.name || env.adminName || 'CivicSolve Administrator';
  let role = (args.role || ROLES.ADMIN).toUpperCase();
  const deptCode = args.dept ? args.dept.toUpperCase() : null;

  if (!email && process.stdin.isTTY) {
    email = (await askQuestion('Enter authority email: ')).trim().toLowerCase();
  }
  if (!password && process.stdin.isTTY) {
    password = await askQuestion('Enter authority password (min 8 chars): ', true);
  }

  if (!email || !email.includes('@')) {
    console.error('❌ Error: Valid email is required. Set ADMIN_EMAIL in .env or pass --email=user@domain.com');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters. Set ADMIN_PASSWORD in .env or pass --password=...');
    process.exit(1);
  }


  if (!AUTHORITY_ROLES.includes(role)) {
    console.error(`❌ Error: Role must be one of authority roles: ${AUTHORITY_ROLES.join(', ')}`);
    process.exit(1);
  }

  await connectDB();

  let deptId = null;
  if (deptCode) {
    const dept = await Department.findOne({ code: deptCode });
    if (!dept) {
      console.error(`❌ Error: Department with code "${deptCode}" not found.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    deptId = dept._id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.passwordHash = passwordHash;
    existing.isActive = true;
    if (deptId) existing.department = deptId;
    await existing.save();
    console.log(`✅ Success: Updated authority account for ${email} (Role: ${role})`);
  } else {
    await User.create({
      name,
      email,
      passwordHash,
      role,
      isActive: true,
      department: deptId || undefined,
    });
    console.log(`✅ Success: Created new authority account for ${email} (Role: ${role})`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Provisioning failed:', err.message);
  process.exit(1);
});

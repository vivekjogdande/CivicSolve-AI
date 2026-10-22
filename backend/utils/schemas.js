const { z } = require('zod');
const { CATEGORIES, SEVERITIES, STATUS } = require('./constants');

const boolish = z.preprocess((v) => v === true || v === 'true' || v === 'on' || v === '1', z.boolean());
const emptyToUndef = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');
const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(160);
const phone = z.preprocess(emptyToUndef, z.string().trim().regex(/^[+\d][\d\s-]{6,17}$/, 'Enter a valid phone number').optional());
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

// .strict() => any unexpected key (e.g. "role") is rejected, so privilege escalation via registration is impossible.
const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short').max(100),
    email,
    phone,
    password,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required').max(128) }).strict();

const updateProfileSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), phone }).strict();
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password }).strict();

const createComplaintSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().trim().min(10, 'Please describe the problem in at least 10 characters').max(2000),
  category: z.enum(CATEGORIES),
  severity: z.preprocess(emptyToUndef, z.enum(SEVERITIES).optional()),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  landmark: z.preprocess(emptyToUndef, z.string().trim().max(150).optional()),
  reporterName: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
  isAnonymous: boolish.optional().default(false),
});

const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};

const citizenListQuery = z.object({ ...pageQuery, status: z.preprocess(emptyToUndef, z.enum(Object.values(STATUS)).optional()) });

const authorityListQuery = z.object({
  ...pageQuery,
  search: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
  status: z.preprocess(emptyToUndef, z.enum(Object.values(STATUS)).optional()),
  category: z.preprocess(emptyToUndef, z.enum(CATEGORIES).optional()),
  severity: z.preprocess(emptyToUndef, z.enum(SEVERITIES).optional()),
  department: z.preprocess(emptyToUndef, objectId.optional()),
  mine: boolish.optional().default(false),
  sort: z.enum(['createdAt', 'updatedAt', 'status', 'category']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const mapQuery = z.object({
  category: z.preprocess(emptyToUndef, z.enum(CATEGORIES).optional()),
  status: z.preprocess(emptyToUndef, z.enum(Object.values(STATUS)).optional()),
  severity: z.preprocess(emptyToUndef, z.enum(SEVERITIES).optional()),
});

const transparencyQuery = z.object({
  from: z.preprocess(emptyToUndef, z.coerce.date().optional()),
  to: z.preprocess(emptyToUndef, z.coerce.date().optional()),
});

const tokenBody = z.object({ token: z.string().trim().min(16).max(128) });
const rejectBody = z.object({ reason: z.string().trim().min(10, 'Please explain what is still wrong (10+ characters)').max(2000), token: z.string().trim().max(128).optional() });

const assignBody = z.object({ officerId: z.preprocess(emptyToUndef, objectId.optional()), departmentId: z.preprocess(emptyToUndef, objectId.optional()) }).strict();
const statusBody = z.object({ status: z.enum(Object.values(STATUS)), note: z.preprocess(emptyToUndef, z.string().trim().max(1000).optional()) }).strict();
const noteBody = z.object({ text: z.string().trim().min(2).max(2000), type: z.enum(['NOTE', 'ACTION']).default('NOTE'), isPublic: boolish.optional().default(false) }).strict();
const escalateBody = z.object({ reason: z.string().trim().min(10, 'Give a reason (10+ characters)').max(1000) }).strict();
const resolutionBody = z.object({
  description: z.string().trim().min(10, 'Describe what was done (10+ characters)').max(2000),
  actionsTaken: z.preprocess(emptyToUndef, z.string().trim().max(2000).optional()),
});
const aiBody = z.object({ attemptId: z.preprocess(emptyToUndef, objectId.optional()) }).strict();
const reviewBody = z.object({ note: z.string().trim().min(5).max(1000) }).strict();

const observationBody = z.object({
  complaintId: z.string().trim().min(5).max(40),
  type: z.enum(['STILL_POLLUTED', 'LOOKS_CLEAN']).default('STILL_POLLUTED'),
  note: z.preprocess(emptyToUndef, z.string().trim().max(500).optional()),
}).strict();

const createAuthoritySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  phone,
  password,
  role: z.enum(['OFFICER', 'SENIOR_OFFICER']),
  department: z.preprocess(emptyToUndef, objectId.optional()),
}).strict();
const updateAuthoritySchema = z.object({
  role: z.enum(['OFFICER', 'SENIOR_OFFICER']).optional(),
  department: z.preprocess(emptyToUndef, objectId.optional()),
  isActive: z.boolean().optional(),
}).strict();
const resetPasswordSchema = z.object({ newPassword: password }).strict();
const departmentSchema = z.object({ name: z.string().trim().min(3).max(120), code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_]+$/), description: z.string().trim().max(300).optional() }).strict();

module.exports = {
  registerSchema, loginSchema, updateProfileSchema, changePasswordSchema, createComplaintSchema, citizenListQuery,
  authorityListQuery, mapQuery, transparencyQuery, tokenBody, rejectBody, assignBody, statusBody, noteBody, escalateBody,
  resolutionBody, aiBody, reviewBody, observationBody, createAuthoritySchema, updateAuthoritySchema, resetPasswordSchema, departmentSchema,
};

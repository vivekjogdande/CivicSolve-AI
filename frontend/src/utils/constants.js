// Status metadata: label (as required by the spec), badge colours and map marker colour.
export const STATUS_META = {
  SUBMITTED: { label: 'Submitted', color: '#475569', bg: '#e8edf3' },
  UNDER_REVIEW: { label: 'Under Review', color: '#8a5a00', bg: '#fdf0d5' },
  ASSIGNED: { label: 'Assigned', color: '#155a75', bg: '#dcedf3' },
  IN_PROGRESS: { label: 'In Progress', color: '#0b5f73', bg: '#d3eef0' },
  AWAITING_CITIZEN_CONFIRMATION: { label: 'Awaiting Citizen Confirmation', color: '#b04a00', bg: '#ffe9d6' },
  RESOLVED_CITIZEN_CONFIRMED: { label: 'Resolved — Citizen Confirmed', color: '#176b3a', bg: '#dcf3e4' },
  REOPENED: { label: 'Reopened', color: '#b42318', bg: '#fde8e6' },
  CLOSED_UNCONFIRMED: { label: 'Closed — Unconfirmed', color: '#4b5563', bg: '#e5e7eb' },
  ESCALATED: { label: 'Escalated', color: '#86198f', bg: '#f8e4fa' },
};
export const STATUS_KEYS = Object.keys(STATUS_META);
export const statusLabel = (s) => (STATUS_META[s] ? STATUS_META[s].label : s);

export const CATEGORY_OPTIONS = [
  { value: 'PLASTIC_WASTE', label: 'Plastic waste' },
  { value: 'SEWAGE_DISCHARGE', label: 'Sewage discharge' },
  { value: 'INDUSTRIAL_WASTE', label: 'Industrial waste' },
  { value: 'CHEMICAL_POLLUTION', label: 'Chemical pollution' },
  { value: 'SOLID_WASTE', label: 'Solid waste' },
  { value: 'DEAD_FISH_WILDLIFE', label: 'Dead fish or wildlife' },
  { value: 'OTHER', label: 'Other pollution' },
];
export const CATEGORY_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.value, c.label]));

export const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];
export const SEVERITY_LABEL = Object.fromEntries(SEVERITY_OPTIONS.map((s) => [s.value, s.label]));

export const AI_LABEL = {
  POLLUTION_REDUCED: 'Pollution appears reduced',
  POLLUTION_STILL_VISIBLE: 'Pollution still visible',
  UNCERTAIN: 'Uncertain',
  MODEL_UNAVAILABLE: 'AI model unavailable',
};

export const ROLE_LABEL = { CITIZEN: 'Citizen', OFFICER: 'Officer', SENIOR_OFFICER: 'Senior Officer', ADMIN: 'Administrator' };

// Indrayani River region (Alandi / Dehu / Pimpri-Chinchwad, Maharashtra): default map centre.
export const DEFAULT_CENTER = [18.676, 73.88];
export const DEFAULT_ZOOM = 11;

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export function daysLeft(deadline) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Turns an API validation error into { field: message }. */
export function fieldErrors(err) {
  const out = {};
  if (err && Array.isArray(err.details)) err.details.forEach((d) => { if (d.field && !out[d.field]) out[d.field] = d.message; });
  return out;
}

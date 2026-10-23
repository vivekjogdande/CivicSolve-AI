/**
 * Dynamically resolves the API base URL:
 * 1. If VITE_API_URL is explicitly configured, use it (stripped of trailing slashes and redundant '/api').
 * 2. When running in a browser on localhost / 127.0.0.1 (such as preview on port 4173 or dev on 5174),
 *    target the local CivicSolve AI backend on http://localhost:5001.
 * 3. In deployed production environments (Vercel, Netlify, Render), default to the deployed backend on Render.
 */
export function getApiBase() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();

  if (typeof window !== 'undefined' && window.location) {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocal) {
      if (envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
        return envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
      }
      return 'http://localhost:5001';
    }
  }

  if (envUrl) {
    return envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }

  return 'https://civicsolve-ai-ccwc.onrender.com';
}

const TOKEN_KEY = 'cs_token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('rc_token'); } catch { return null; }
  },
  set: (t) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage unavailable */ }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('rc_token');
    } catch { /* storage unavailable */ }
  },
};

export class ApiError extends Error {
  constructor(message, status, details, extra) {
    super(message);
    this.status = status;
    this.details = details;
    this.extra = extra;
  }
}

/** Resolves an upload path returned by the API (e.g. /uploads/abc.jpg) to a URL the browser can load. */
export const mediaUrl = (u) => {
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = getApiBase();
  const clean = u.startsWith('/') ? u : `/${u}`;
  return base ? `${base}${clean}` : clean;
};

function buildUrl(path) {
  const base = getApiBase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const full = base ? `${base}${cleanPath}` : cleanPath;
  return new URL(full, window.location.origin);
}

async function request(method, path, { body, form, params, auth = true } = {}) {
  const url = buildUrl(path);
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
  const headers = {};
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form; // browser sets the multipart boundary
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch (netErr) {
    throw new ApiError(
      'Cannot reach the CivicSolve AI server. Please check your internet connection or verify the backend is online.',
      0,
      null,
      netErr
    );
  }
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON response */ }

  if (!res.ok || (json && json.success === false)) {
    if (res.status === 401 && token && auth) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('cs:unauthorized'));
      window.dispatchEvent(new CustomEvent('rc:unauthorized'));
    }
    const err = json && json.error ? json.error : {};
    let message = err.message;
    if (!message) {
      if (res.status === 404) {
        message = 'The requested endpoint was not found on the server (404). Please verify the backend API URL.';
      } else if (res.status === 401) {
        message = 'Incorrect email or password. Please verify your credentials.';
      } else if (res.status === 403) {
        message = 'Access forbidden. You do not have permission for this portal.';
      } else if (res.status === 429) {
        message = 'Too many requests. Please wait a few moments before trying again.';
      } else if (res.status >= 500) {
        message = 'CivicSolve AI server error. Please try again shortly.';
      } else {
        message = `Request failed (${res.status})`;
      }
    }
    throw new ApiError(message, res.status, err.details, err);
  }
  return json ? json.data : null;
}

export const api = {
  get: (path, params, opts) => request('GET', path, { params, ...opts }),
  post: (path, body, opts) => request('POST', path, { body, ...opts }),
  patch: (path, body, opts) => request('PATCH', path, { body, ...opts }),
  postForm: (path, form, opts) => request('POST', path, { form, ...opts }),
};

const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'rc_token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage unavailable */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
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
export const mediaUrl = (u) => (u ? (u.startsWith('http') ? u : `${BASE}${u}`) : '');

async function request(method, path, { body, form, params, auth = true } = {}) {
  const url = new URL(`${BASE}${path}`, window.location.origin);
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
  } catch {
    throw new ApiError('Cannot reach the RiverCare server. Check your connection and that the backend is running.', 0);
  }
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON response */ }

  if (!res.ok || (json && json.success === false)) {
    if (res.status === 401 && token && auth) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('rc:unauthorized'));
    }
    const err = json && json.error ? json.error : {};
    throw new ApiError(err.message || `Request failed (${res.status})`, res.status, err.details, err);
  }
  return json ? json.data : null;
}

export const api = {
  get: (path, params, opts) => request('GET', path, { params, ...opts }),
  post: (path, body, opts) => request('POST', path, { body, ...opts }),
  patch: (path, body, opts) => request('PATCH', path, { body, ...opts }),
  postForm: (path, form, opts) => request('POST', path, { form, ...opts }),
};

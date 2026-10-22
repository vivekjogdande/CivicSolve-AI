import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import {
  Upload,
  X,
  LocateFixed,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BrainCircuit,
  Eye,
  Shield,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LocationPicker } from '../components/MapView';
import { Alert, ButtonLoading, Field, PageHero } from '../components/ui';
import TiltCard from '../components/TiltCard';
import CivicHologram3D from '../components/CivicHologram3D';
import { CATEGORY_OPTIONS, SEVERITY_OPTIONS, fieldErrors, CATEGORY_LABEL } from '../utils/constants';

const MAX_MB = 10;
const MAX_FILES = 5;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/webm', 'video/quicktime'];
const OK_EXT = /\.(jpe?g|png|webp|heic|mp4|webm|mov)$/i;
const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

export default function ReportPollution() {
  const { user, isCitizen } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const location = useLocation();
  const prefill = location.state || {};
  const fileInput = useRef(null);
  const [f, setF] = useState({
    title: prefill.title || params.get('title') || '',
    category: prefill.category || params.get('category') || '',
    description: prefill.description || params.get('description') || '',
    severity: prefill.severity || '',
    landmark: prefill.landmark || '',
    reporterName: prefill.name || (user ? user.name : ''),
    isAnonymous: false,
  });
  const [pos, setPos] = useState({ lat: num(params.get('lat')), lng: num(params.get('lng')) });
  const [files, setFiles] = useState([]); // { file, url, kind }
  const [fileErr, setFileErr] = useState('');
  const [errs, setErrs] = useState({});
  const [err, setErr] = useState('');
  const [geoMsg, setGeoMsg] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [drag, setDrag] = useState(false);
  const urls = useRef([]);

  // AI Assistant state
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Duplicate detection state
  const [duplicates, setDuplicates] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const on = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const anonymous = !isCitizen || f.isAnonymous;

  const addFiles = (list) => {
    setFileErr('');
    const next = [...files];
    const problems = [];
    Array.from(list).forEach((file) => {
      const typeOk = OK_TYPES.includes(file.type) || (!file.type && OK_EXT.test(file.name));
      if (!typeOk) problems.push(`“${file.name}” is not a supported type (use JPG, PNG, WebP, HEIC, MP4, WebM or MOV).`);
      else if (file.size > MAX_MB * 1024 * 1024) problems.push(`“${file.name}” is larger than ${MAX_MB} MB.`);
      else if (next.length >= MAX_FILES) problems.push(`You can attach at most ${MAX_FILES} files.`);
      else {
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        next.push({ file, url, kind: file.type.startsWith('video') ? 'video' : 'image' });
      }
    });
    setFiles(next);
    if (problems.length) setFileErr(problems[0]);
  };
  const removeFile = (i) => setFiles(files.filter((_, idx) => idx !== i));

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoMsg('Your browser does not support automatic location. Click the map to choose the spot instead.');
      return;
    }
    setGeoBusy(true);
    setGeoMsg('');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoBusy(false);
        setGeoMsg(`Location pinned (accuracy about ${Math.round(p.coords.accuracy)} m). You can drag the pin on the map.`);
      },
      (e) => {
        setGeoBusy(false);
        setGeoMsg(
          e.code === 1
            ? 'Location permission was denied. Click the map to manually place the pin.'
            : 'Could not obtain GPS fix. Click the map to select the location.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Run real-time AI auto-classification
  const runAiAssistant = async () => {
    if (!f.title.trim() && !f.description.trim()) {
      toast.error('Please enter a problem title or description first.');
      return;
    }
    setAiAnalyzing(true);
    try {
      const res = await api.post('/api/complaints/ai-analyze', {
        title: f.title,
        description: f.description,
        category: f.category,
        severity: f.severity,
      }, { auth: false });

      const a = res?.analysis || res?.data?.analysis || (res && res.category ? res : null);
      if (a && a.category) {
        setAiSuggestion(a);
        setF((prev) => ({
          ...prev,
          category: a.category || prev.category,
          severity: a.priority || prev.severity,
        }));
        const modeLabel = a.isFallback ? 'Heuristics Fallback' : 'Civic AI';
        toast.success(`${modeLabel}: ${CATEGORY_LABEL[a.category] || a.category} (${a.priority} Priority)`);
      }
    } catch (err) {
      toast.error(err.message || 'AI assistant temporarily unavailable');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Check for nearby duplicates when location & category change
  useEffect(() => {
    if (pos.lat === null || pos.lng === null) return;
    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const query = `lat=${pos.lat}&lng=${pos.lng}&category=${encodeURIComponent(f.category || '')}&title=${encodeURIComponent(f.title || '')}`;
        const res = await api.get(`/api/complaints/check-duplicates?${query}`, undefined, { auth: false });
        const dups = res?.duplicates || res?.data?.duplicates;
        if (Array.isArray(dups)) {
          setDuplicates(dups);
        }
      } catch (_e) {
        // Non-blocking
      } finally {
        setCheckingDuplicates(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [pos.lat, pos.lng, f.category, f.title]);

  const validate = () => {
    const e = {};
    if (f.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
    if (!f.category) e.category = 'Choose a civic category or use AI Auto-Classify';
    if (f.description.trim().length < 10) e.description = 'Please describe the problem in at least 10 characters';
    if (pos.lat === null || pos.lng === null) e.location = 'Choose the location using GPS or by clicking the map';
    if (!files.length) e.media = 'Attach at least one photograph or video as evidence';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    setErr('');
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    const fd = new FormData();
    fd.append('title', f.title.trim());
    fd.append('category', f.category);
    fd.append('description', f.description.trim());
    if (f.severity) fd.append('severity', f.severity);
    if (f.landmark.trim()) fd.append('landmark', f.landmark.trim());
    if (f.reporterName && f.reporterName.trim()) fd.append('reporterName', f.reporterName.trim());
    fd.append('lat', String(pos.lat));
    fd.append('lng', String(pos.lng));
    fd.append('isAnonymous', anonymous ? 'true' : 'false');
    files.forEach((x) => fd.append('media', x.file));
    setBusy(true);
    try {
      const r = await api.postForm('/api/complaints', fd);
      setResult(r);
      window.scrollTo(0, 0);
    } catch (x) {
      setErrs({ ...fieldErrors(x) });
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy automatically. Please select and copy the text.');
    }
  };

  const download = () => {
    const blob = new Blob(
      [
        `CivicSolve AI - Complaint Reference\n` +
          `Complaint ID: ${result.complaintId}\n` +
          `Confirmation Token: ${result.confirmationToken}\n\n` +
          `Keep this token private. It is your cryptographic credential to verify or reopen this civic resolution.\n`,
      ],
      { type: 'text/plain' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `civicsolve-${result.complaintId}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (result) {
    return (
      <>
        <PageHero
          title="Grievance Registered"
          subtitle="Your issue has been logged into the municipal workflow with AI intake triage."
        />
        <section className="section">
          <div className="container narrow stack">
            <div className="card stack" style={{ border: '1.5px solid var(--slate-200)' }}>
              <div className="row" style={{ color: 'var(--ok)' }}>
                <CheckCircle2 size={24} />
                <strong style={{ fontSize: '1.1rem' }}>Your civic issue was successfully recorded.</strong>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="small muted">Reference Complaint ID</div>
                <div className="token-box" style={{ background: 'var(--navy-900)', color: '#fff', fontSize: '1.2rem', padding: '10px 16px', borderRadius: 8 }}>
                  {result.complaintId}
                </div>
              </div>

              {result.confirmationToken && (
                <>
                  <Alert type="warn">
                    <strong>Save your private confirmation token now.</strong> It is shown only once and only its
                    cryptographic hash is stored. You will need it to track private updates and to confirm or reject
                    the final on-ground repair.
                  </Alert>
                  <div>
                    <div className="small muted">Confirmation Token (Keep Private)</div>
                    <div className="token-box" style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {result.confirmationToken}
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => copy(result.confirmationToken)}>
                      <Copy size={16} /> {copied ? 'Copied' : 'Copy Token'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={download}>
                      Download Credentials File
                    </button>
                  </div>
                </>
              )}

              <div className="row" style={{ marginTop: 16 }}>
                <Link
                  to={result.confirmationToken ? '/anonymous' : `/complaints/${result.complaintId}`}
                  className="btn btn-primary"
                  style={{ background: 'var(--teal-600)' }}
                >
                  {result.confirmationToken ? 'Open Anonymous Tracking' : 'View in Citizen Dashboard'}
                </Link>
                <Link to={`/track?id=${result.complaintId}`} className="btn btn-secondary">
                  Public Tracking Status
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setResult(null);
                    setF({ title: '', category: '', description: '', severity: '', landmark: '', isAnonymous: false });
                    setFiles([]);
                    setPos({ lat: null, lng: null });
                    setAiSuggestion(null);
                    setDuplicates([]);
                  }}
                >
                  Report Another Issue
                </button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        title="Report a Civic Problem"
        subtitle="Report potholes, garbage accumulation, open manholes, water leaks, or broken streetlights. AI triages urgency and alerts responders."
      />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container narrow">
          <form className="card stack" style={{ gap: 8, border: '1.5px solid var(--slate-200)' }} onSubmit={submit} noValidate>
            {err && <Alert type="error">{err}</Alert>}

            {/* 3D Holographic AI Diagnostic Scanner */}
            <TiltCard maxTilt={8} depth={15} style={{ marginBottom: 4 }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(6, 24, 44, 0.95))',
                  borderRadius: 'var(--radius)',
                  padding: '16px',
                  border: '1px solid rgba(45, 212, 191, 0.3)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
                }}
              >
                <div className="row between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <span className="ai-badge" style={{ fontSize: '0.72rem', padding: '3px 10px' }}>
                      <Sparkles size={12} /> 3D AI Neural Scanner
                    </span>
                    <span className="small muted" style={{ color: '#94a3b8' }}>
                      Interactive 3D Diagnostic & Categorization Matrix
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ background: 'rgba(13, 148, 136, 0.25)', borderColor: '#2dd4bf', color: '#2dd4bf', gap: 6 }}
                    onClick={runAiAssistant}
                    disabled={aiAnalyzing}
                  >
                    <BrainCircuit size={15} className={aiAnalyzing ? 'spin' : ''} /> {aiAnalyzing ? 'Scanning in 3D…' : 'Run 3D AI Triage'}
                  </button>
                </div>

                {/* 3D WebGL Hologram Viewport */}
                <CivicHologram3D
                  category={f.category}
                  priority={f.severity || aiSuggestion?.priority}
                  confidence={aiSuggestion?.confidenceScore || 94}
                  isAnalyzing={aiAnalyzing}
                  lat={pos.lat}
                  lng={pos.lng}
                />
              </div>
            </TiltCard>

            {/* AI Suggestion Box */}
            {aiSuggestion && (
              <div className="ai-panel" style={{ marginTop: 0, padding: 14 }}>
                <div className="row between">
                  <div className="row" style={{ gap: 8 }}>
                    <span className="ai-badge" style={{ fontSize: '0.7rem' }}>
                      {aiSuggestion.isFallback ? '⚡ Rule-Based Heuristic (Offline Fallback)' : (aiSuggestion.modelUsed || 'AI Suggestion')}
                    </span>
                    <span className={`badge ${aiSuggestion.priority === 'CRITICAL' ? 'res-FAIL' : 'res-PASS'}`} style={{ padding: '2px 8px' }}>
                      Suggested Priority: {aiSuggestion.priority}
                    </span>
                    {aiSuggestion.recommendedDepartment && (
                      <span className="chip" style={{ fontSize: '0.72rem' }}>
                        Dept: {aiSuggestion.recommendedDepartment}
                      </span>
                    )}
                  </div>
                  <span className="small muted">Confidence: {aiSuggestion.confidenceScore}%</span>
                </div>
                <p className="small" style={{ margin: '8px 0 4px', color: 'var(--slate-800)' }}>
                  <strong>Analysis:</strong> {aiSuggestion.summary}
                </p>
                {aiSuggestion.recommendedAction && (
                  <p className="small" style={{ margin: '0 0 4px', color: 'var(--slate-700)' }}>
                    <strong>Recommended Field Action:</strong> {aiSuggestion.recommendedAction}
                  </p>
                )}
                {aiSuggestion.safetyHazards && aiSuggestion.safetyHazards.length > 0 && (
                  <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {aiSuggestion.safetyHazards.map((h, i) => (
                      <span key={i} className="hazard-tag" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                        <AlertTriangle size={12} /> {h}
                      </span>
                    ))}
                  </div>
                )}
                <div className="small muted" style={{ marginTop: 8, fontSize: '0.72rem' }}>
                  ℹ️ AI suggestions are pre-filled below. You can review and adjust any field before submitting.
                </div>
              </div>
            )}

            <Field label="Problem title" htmlFor="title" error={errs.title} required>
              <input
                id="title"
                className={`input ${errs.title ? 'invalid' : ''}`}
                maxLength={120}
                placeholder="e.g. Deep pothole on Hinjewadi Phase 1 main road near Metro pillar 42"
                value={f.title}
                onChange={on('title')}
              />
            </Field>

            <div className="form-grid">
              <Field
                label="Your name (optional)"
                htmlFor="reporterName"
                hint={isCitizen ? `Logged in as ${user.name}` : 'Provide name or leave blank for anonymous filing'}
                error={errs.reporterName}
              >
                <input
                  id="reporterName"
                  className="input"
                  maxLength={100}
                  placeholder={isCitizen ? user.name : 'e.g. Ramesh Kulkarni'}
                  value={f.reporterName || ''}
                  onChange={on('reporterName')}
                  disabled={isCitizen}
                />
              </Field>

              <Field label="Civic category" htmlFor="category" error={errs.category} required>
                <select
                  id="category"
                  className={`select ${errs.category ? 'invalid' : ''}`}
                  value={f.category}
                  onChange={on('category')}
                >
                  <option value="">Select a civic category</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Urgency / Severity (Optional)" htmlFor="severity" hint="AI will also evaluate safety risks">
                <select id="severity" className="select" value={f.severity} onChange={on('severity')}>
                  <option value="">Auto-assess with AI</option>
                  {SEVERITY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Detailed description" htmlFor="description" error={errs.description} required>
              <textarea
                id="description"
                className={`textarea ${errs.description ? 'invalid' : ''}`}
                rows={4}
                maxLength={2000}
                placeholder="Describe the nature of the hazard, dimensions, vehicle or pedestrian impact, and how long it has been unresolved..."
                value={f.description}
                onChange={on('description')}
              />
            </Field>

            <Field
              label="Photographs or supporting video"
              error={errs.media || fileErr}
              hint={`JPG, PNG, WebP, HEIC, MP4 · up to ${MAX_MB} MB each · max ${MAX_FILES} files`}
              required
            >
              <div
                className={`dropzone ${drag ? 'drag' : ''}`}
                role="button"
                tabIndex={0}
                aria-label="Add photographs or video"
                onClick={() => fileInput.current.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInput.current.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  addFiles(e.dataTransfer.files);
                }}
              >
                <Upload size={26} style={{ color: 'var(--teal-600)' }} />
                <div>
                  <strong>Click to select</strong> or drag and drop photos here
                </div>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,.heic"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              {files.length > 0 && (
                <div className="previews">
                  {files.map((x, i) => (
                    <div className="preview" key={x.url}>
                      {x.kind === 'video' ? <video src={x.url} muted /> : <img src={x.url} alt={`Preview of ${x.file.name}`} />}
                      <button type="button" onClick={() => removeFile(i)} aria-label={`Remove ${x.file.name}`}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Field>

            <Field
              label="Location"
              error={errs.location}
              hint="Drop a pin on the map or use your browser geolocation with permission"
              required
            >
              <div className="row" style={{ marginBottom: 8 }}>
                <ButtonLoading type="button" className="btn btn-secondary btn-sm" loading={geoBusy} onClick={locate}>
                  <LocateFixed size={16} /> Locate using GPS
                </ButtonLoading>
                {pos.lat !== null && (
                  <span className="small mono">
                    Coordinates: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                  </span>
                )}
              </div>
              {geoMsg && (
                <p className="small muted" style={{ margin: '0 0 8px' }}>
                  <AlertTriangle size={13} style={{ verticalAlign: -2 }} /> {geoMsg}
                </p>
              )}
              <LocationPicker lat={pos.lat} lng={pos.lng} invalid={!!errs.location} onPick={(lat, lng) => setPos({ lat, lng })} />
            </Field>

            {/* Duplicate Grievance Warning */}
            {duplicates.length > 0 && (
              <div className="duplicate-banner">
                <div className="row" style={{ gap: 8, color: '#92400e', marginBottom: 6 }}>
                  <AlertTriangle size={18} />
                  <strong>Similar complaint already reported nearby!</strong>
                </div>
                <p className="small" style={{ margin: '0 0 8px', color: '#78350f' }}>
                  The system detected active grievances near this location. Check if your issue is already registered:
                </p>
                <div className="stack" style={{ gap: 8 }}>
                  {duplicates.map((d) => (
                    <div
                      key={d.complaintId}
                      className="row between"
                      style={{
                        background: '#fff',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #fde68a',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div>
                        <strong>{d.complaintId}</strong>: {d.title} ({d.distanceMeters}m away)
                        <div className="small muted" style={{ fontSize: '0.78rem' }}>
                          Match: {d.matchReason || 'Geographic proximity & category'} · Confidence: {d.confidence}%
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <Link
                          to={`/track?id=${d.complaintId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        >
                          View / Follow
                        </Link>
                        <span className="chip" style={{ fontSize: '0.75rem' }}>
                          {d.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="small muted" style={{ margin: '8px 0 0' }}>
                  You may still submit if your report documents a separate incident or fresh evidence.
                </p>
              </div>
            )}

            <Field label="Nearby landmark / locality (Optional)" htmlFor="landmark">
              <input
                id="landmark"
                className="input"
                maxLength={150}
                placeholder="e.g. Opposite State Bank branch, Ward 12"
                value={f.landmark}
                onChange={on('landmark')}
              />
            </Field>

            {isCitizen ? (
              <label className="check">
                <input type="checkbox" checked={f.isAnonymous} onChange={on('isAnonymous')} />
                <span>
                  Report anonymously. The report will not be attached to your account ({user.email}). A secret confirmation
                  token will be generated for you instead.
                </span>
              </label>
            ) : (
              <Alert type="info">
                You are reporting <strong>anonymously</strong>. You will receive a complaint ID and a private confirmation
                token upon submission. <Link to="/citizen/login">Log in</Link> to store all your reports in a personal
                dashboard.
              </Alert>
            )}

            <ButtonLoading
              type="submit"
              loading={busy}
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 14, background: 'var(--navy-900)' }}
            >
              {busy ? 'Submitting & Triaging…' : 'Submit Civic Grievance'}
            </ButtonLoading>
          </form>
        </div>
      </section>
    </>
  );
}

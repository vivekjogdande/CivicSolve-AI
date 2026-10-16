import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Upload, X, LocateFixed, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LocationPicker } from '../components/MapView';
import { Alert, ButtonLoading, Field, PageHero } from '../components/ui';
import { CATEGORY_OPTIONS, SEVERITY_OPTIONS, fieldErrors } from '../utils/constants';

const MAX_MB = 10;
const MAX_FILES = 5;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/webm', 'video/quicktime'];
const OK_EXT = /\.(jpe?g|png|webp|heic|mp4|webm|mov)$/i;
const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

export default function ReportPollution() {
  const { user, isCitizen } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const fileInput = useRef(null);
  const [f, setF] = useState({ title: '', category: '', description: '', severity: '', landmark: '', isAnonymous: false });
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
    if (!navigator.geolocation) { setGeoMsg('Your browser does not support location. Click the map to choose the spot instead.'); return; }
    setGeoBusy(true);
    setGeoMsg('');
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoBusy(false); setGeoMsg(`Location found (accuracy about ${Math.round(p.coords.accuracy)} m). You can drag the pin to adjust it.`); },
      (e) => { setGeoBusy(false); setGeoMsg(e.code === 1 ? 'Location permission was denied. Click the map to choose the spot instead.' : 'Could not get your location. Click the map to choose the spot instead.'); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const validate = () => {
    const e = {};
    if (f.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
    if (!f.category) e.category = 'Choose a pollution category';
    if (f.description.trim().length < 10) e.description = 'Please describe the problem in at least 10 characters';
    if (pos.lat === null || pos.lng === null) e.location = 'Choose the location using GPS or by clicking the map';
    if (!files.length) e.media = 'Attach at least one photograph or video';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setErr('');
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) { toast.error('Please fix the highlighted fields.'); return; }
    const fd = new FormData();
    fd.append('title', f.title.trim());
    fd.append('category', f.category);
    fd.append('description', f.description.trim());
    if (f.severity) fd.append('severity', f.severity);
    if (f.landmark.trim()) fd.append('landmark', f.landmark.trim());
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
    } finally { setBusy(false); }
  };

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { toast.error('Could not copy automatically. Please select and copy the text.'); }
  };
  const download = () => {
    const blob = new Blob([`RiverCare complaint\nComplaint ID: ${result.complaintId}\nConfirmation token: ${result.confirmationToken}\n\nKeep this file private. The token is the only way to confirm or reject the cleanup of an anonymous complaint.\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rivercare-${result.complaintId}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (result) {
    return (
      <>
        <PageHero title="Report received" subtitle="Thank you for helping protect the river." />
        <section className="section"><div className="container narrow stack">
          <div className="card stack">
            <div className="row"><CheckCircle2 color="#176b3a" /> <strong>Your complaint was saved.</strong></div>
            <div><div className="small muted">Complaint ID</div><div className="token-box" style={{ background: 'var(--forest)' }}>{result.complaintId}</div></div>
            {result.confirmationToken && (
              <>
                <Alert type="warn"><strong>Save your confirmation token now.</strong> It is shown only once and we store only a hash of it, so we cannot recover it. You will need it to see private details and to confirm or reject the cleanup.</Alert>
                <div><div className="small muted">Confirmation token (keep private)</div><div className="token-box">{result.confirmationToken}</div></div>
                <div className="row">
                  <button type="button" className="btn btn-secondary" onClick={() => copy(result.confirmationToken)}><Copy size={16} /> {copied ? 'Copied' : 'Copy token'}</button>
                  <button type="button" className="btn btn-secondary" onClick={download}>Download as file</button>
                </div>
              </>
            )}
            <div className="row">
              <Link to={result.confirmationToken ? '/anonymous' : `/complaints/${result.complaintId}`} className="btn btn-primary">{result.confirmationToken ? 'Open anonymous tracking' : 'View my complaint'}</Link>
              <Link to={`/track?id=${result.complaintId}`} className="btn btn-secondary">Public tracking page</Link>
              <button type="button" className="btn btn-ghost" onClick={() => { setResult(null); setF({ title: '', category: '', description: '', severity: '', landmark: '', isAnonymous: false }); setFiles([]); setPos({ lat: null, lng: null }); }}>Report another</button>
            </div>
          </div>
        </div></section>
      </>
    );
  }

  return (
    <>
      <PageHero title="Report Pollution" subtitle="Tell us what you saw and where. It takes about two minutes and you do not need an account." />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container narrow">
          <form className="card stack" style={{ gap: 4 }} onSubmit={submit} noValidate>
            {err && <Alert type="error">{err}</Alert>}
            <Field label="Complaint title" htmlFor="title" error={errs.title} required><input id="title" className={`input ${errs.title ? 'invalid' : ''}`} maxLength={120} placeholder="e.g. Plastic dumped near Alandi ghat" value={f.title} onChange={on('title')} /></Field>
            <div className="form-grid">
              <Field label="Pollution category" htmlFor="category" error={errs.category} required>
                <select id="category" className={`select ${errs.category ? 'invalid' : ''}`} value={f.category} onChange={on('category')}><option value="">Select a category</option>{CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
              </Field>
              <Field label="Severity (optional)" htmlFor="severity" hint="Your best estimate; officers will reassess"><select id="severity" className="select" value={f.severity} onChange={on('severity')}><option value="">Not sure</option>{SEVERITY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
            </div>
            <Field label="Detailed description" htmlFor="description" error={errs.description} required><textarea id="description" className={`textarea ${errs.description ? 'invalid' : ''}`} rows={4} maxLength={2000} placeholder="What is it, how big is the affected area, how long has it been there?" value={f.description} onChange={on('description')} /></Field>

            <Field label="Photographs or video" error={errs.media || fileErr} hint={`JPG, PNG, WebP, HEIC, MP4, WebM or MOV · up to ${MAX_MB} MB each · max ${MAX_FILES} files`} required>
              <div
                className={`dropzone ${drag ? 'drag' : ''}`} role="button" tabIndex={0} aria-label="Add photographs or video"
                onClick={() => fileInput.current.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current.click(); } }}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
              >
                <Upload size={26} /><div><strong>Click to choose</strong> or drag files here</div>
              </div>
              <input ref={fileInput} type="file" accept="image/*,video/mp4,video/webm,video/quicktime,.heic" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              {files.length > 0 && (
                <div className="previews">
                  {files.map((x, i) => (
                    <div className="preview" key={x.url}>
                      {x.kind === 'video' ? <video src={x.url} muted /> : <img src={x.url} alt={`Preview of ${x.file.name}`} />}
                      <button type="button" onClick={() => removeFile(i)} aria-label={`Remove ${x.file.name}`}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Location" error={errs.location} hint="Click the map to drop a pin, drag it to adjust, or use your current position" required>
              <div className="row" style={{ marginBottom: 8 }}>
                <ButtonLoading type="button" className="btn btn-secondary btn-sm" loading={geoBusy} onClick={locate}><LocateFixed size={16} /> Use my current location</ButtonLoading>
                {pos.lat !== null && <span className="small mono">{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</span>}
              </div>
              {geoMsg && <p className="small muted" style={{ margin: '0 0 8px' }}><AlertTriangle size={13} style={{ verticalAlign: -2 }} /> {geoMsg}</p>}
              <LocationPicker lat={pos.lat} lng={pos.lng} invalid={!!errs.location} onPick={(lat, lng) => setPos({ lat, lng })} />
            </Field>
            <Field label="Nearby landmark (optional)" htmlFor="landmark"><input id="landmark" className="input" maxLength={150} placeholder="e.g. Near the Dehu bridge" value={f.landmark} onChange={on('landmark')} /></Field>

            {isCitizen ? (
              <label className="check"><input type="checkbox" checked={f.isAnonymous} onChange={on('isAnonymous')} /><span>Report anonymously. It will not be linked to your account ({user.email}); you will get a private confirmation token instead.</span></label>
            ) : (
              <Alert type="info">You are reporting <strong>anonymously</strong>. After submitting you will receive a complaint ID and a private confirmation token. <Link to="/citizen/login">Log in</Link> instead to keep your complaints on a dashboard.</Alert>
            )}

            <ButtonLoading type="submit" loading={busy} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 12 }}>{busy ? 'Submitting…' : 'Submit report'}</ButtonLoading>
          </form>
        </div>
      </section>
    </>
  );
}

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Eye, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { ComplaintMap, StatusLegend } from '../components/MapView';
import { Loader, ErrorState, EmptyState, StatusBadge, SeverityBadge, PageHero, Alert, ButtonLoading } from '../components/ui';
import { CATEGORY_OPTIONS, CATEGORY_LABEL, SEVERITY_OPTIONS, STATUS_META, fmtDate } from '../utils/constants';

export default function PollutionMap() {
  const [f, setF] = useState({ category: '', status: '', severity: '' });
  const [sel, setSel] = useState(null);
  const [picked, setPicked] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const [note, setNote] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const state = useFetch(() => api.get('/api/public/map', f, { auth: false }), [f.category, f.status, f.severity]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setSel(null); };
  const items = useMemo(() => (state.data ? state.data.items : []), [state.data]);

  const observe = async (type) => {
    setSending(true);
    try {
      const r = await api.post('/api/public/observations', { complaintId: sel.complaintId, type, ...(note.trim() ? { note: note.trim() } : {}) });
      toast.success(r.message);
      setDone(sel.complaintId);
      setNote('');
      state.reload();
    } catch (e) { toast.error(e.message); } finally { setSending(false); }
  };

  const reportHere = (pt) => navigate(`/report?lat=${pt.lat.toFixed(6)}&lng=${pt.lng.toFixed(6)}`);

  return (
    <>
      <PageHero title="Pollution Map" subtitle="Every public complaint on the Indrayani, coloured by status. Locations are rounded to about 110 m to protect privacy." />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <div className="toolbar">
            <select className="select" aria-label="Filter by category" value={f.category} onChange={set('category')}><option value="">All categories</option>{CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
            <select className="select" aria-label="Filter by status" value={f.status} onChange={set('status')}><option value="">All statuses</option>{Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select>
            <select className="select" aria-label="Filter by severity" value={f.severity} onChange={set('severity')}><option value="">All severities</option>{SEVERITY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setF({ category: '', status: '', severity: '' }); setSel(null); }}>Clear filters</button>
          </div>
          <div className="map-layout">
            <aside className="card" aria-live="polite">
              {sel ? (
                <div className="stack">
                  <div className="row between"><span className="mono small muted">{sel.complaintId}</span><StatusBadge status={sel.status} /></div>
                  <h3 style={{ margin: 0 }}>{sel.title}</h3>
                  <div className="row" style={{ gap: 8 }}><span className="chip">{CATEGORY_LABEL[sel.category]}</span><SeverityBadge severity={sel.severity} /></div>
                  <p className="small" style={{ margin: 0 }}>{sel.description}</p>
                  <p className="small muted" style={{ margin: 0 }}><MapPin size={14} style={{ verticalAlign: -2 }} /> {sel.landmark || 'No landmark given'} · reported {fmtDate(sel.createdAt)} · {sel.observationCount} community observation{sel.observationCount === 1 ? '' : 's'}</p>
                  <Link to={`/track?id=${sel.complaintId}`} className="btn btn-secondary btn-sm">Open tracking page</Link>
                  <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
                  <strong className="small">Seen this place recently?</strong>
                  {done === sel.complaintId ? <Alert type="ok">Thanks. Your observation was shared with the responsible officers. It supports their review but never closes a complaint.</Alert> : (
                    <>
                      <textarea className="textarea" rows={2} maxLength={500} placeholder="Optional note (what you saw)" aria-label="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
                      <div className="row">
                        <ButtonLoading type="button" className="btn btn-danger btn-sm" loading={sending} onClick={() => observe('STILL_POLLUTED')}><Eye size={15} /> Still polluted</ButtonLoading>
                        <ButtonLoading type="button" className="btn btn-secondary btn-sm" loading={sending} onClick={() => observe('LOOKS_CLEAN')}>Looks clean</ButtonLoading>
                      </div>
                    </>
                  )}
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => reportHere(sel.location)}><Plus size={15} /> Report pollution near here</button>
                </div>
              ) : picked ? (
                <div className="stack">
                  <h3 style={{ margin: 0 }}>New spot selected</h3>
                  <p className="small muted" style={{ margin: 0 }}>{picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}</p>
                  <button type="button" className="btn btn-primary" onClick={() => reportHere(picked)}>Report pollution here</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicked(null)}>Cancel</button>
                </div>
              ) : (
                <div className="stack">
                  <h3 style={{ margin: 0 }}>Select a marker</h3>
                  <p className="small muted" style={{ margin: 0 }}>Click a marker to see its details, or click an empty spot on the map to report pollution there.</p>
                  {state.data && <p className="small" style={{ margin: 0 }}><strong>{items.length}</strong> complaint{items.length === 1 ? '' : 's'} shown</p>}
                  <StatusLegend />
                </div>
              )}
            </aside>
            <div>
              {state.loading && !state.data ? <Loader label="Loading map…" /> : state.error ? <ErrorState message={state.error.message} onRetry={state.reload} /> : (
                <>
                  <ComplaintMap items={items} className="map-box tall" selectedId={sel && sel.complaintId} onSelect={(c) => { setSel(c); setPicked(null); }} onMapClick={(lat, lng) => { setPicked({ lat, lng }); setSel(null); }} picked={picked} fit />
                  {items.length === 0 && <div style={{ marginTop: 12 }}><EmptyState title="No complaints match these filters">Try clearing a filter, or report the first incident.</EmptyState></div>}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

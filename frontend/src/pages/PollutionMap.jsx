import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Eye, Plus, List, Map as MapIcon, Filter, AlertTriangle, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { ComplaintMap, StatusLegend } from '../components/MapView';
import { Loader, ErrorState, EmptyState, StatusBadge, SeverityBadge, PageHero, Alert, ButtonLoading } from '../components/ui';
import { CATEGORY_OPTIONS, CATEGORY_LABEL, SEVERITY_OPTIONS, STATUS_META, fmtDate } from '../utils/constants';
import TiltCard from '../components/TiltCard';

export default function PollutionMap() {
  const [f, setF] = useState({ category: '', status: '', severity: '' });
  const [sel, setSel] = useState(null);
  const [picked, setPicked] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const [note, setNote] = useState('');
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const toast = useToast();
  const navigate = useNavigate();
  const state = useFetch(() => api.get('/api/public/map', f, { auth: false }), [f.category, f.status, f.severity]);
  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value });
    setSel(null);
  };
  const items = useMemo(() => (state.data ? state.data.items : []), [state.data]);

  const observe = async (type) => {
    setSending(true);
    try {
      const r = await api.post('/api/public/observations', {
        complaintId: sel.complaintId,
        type,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success(r.message);
      setDone(sel.complaintId);
      setNote('');
      state.reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const reportHere = (pt) => navigate(`/report?lat=${pt.lat.toFixed(6)}&lng=${pt.lng.toFixed(6)}`);

  return (
    <>
      <PageHero
        title="Interactive Civic Map"
        subtitle="Live geographic map of public civic issues across municipal wards. Coloured by status and category with privacy-preserving coordinate rounding."
      />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', flex: 1 }}>
              <select className="select" style={{ maxWidth: 220 }} aria-label="Filter by category" value={f.category} onChange={set('category')}>
                <option value="">All Categories</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select className="select" style={{ maxWidth: 200 }} aria-label="Filter by status" value={f.status} onChange={set('status')}>
                <option value="">All Statuses</option>
                {Object.entries(STATUS_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select className="select" style={{ maxWidth: 160 }} aria-label="Filter by severity" value={f.severity} onChange={set('severity')}>
                <option value="">All Priorities</option>
                {SEVERITY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setF({ category: '', status: '', severity: '' });
                  setSel(null);
                }}
              >
                Clear
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="row" style={{ gap: 4, background: 'var(--slate-100)', padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                onClick={() => setViewMode('map')}
              >
                <MapIcon size={15} /> Standard Map
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === '3d' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: '0.85rem', background: viewMode === '3d' ? 'linear-gradient(135deg, var(--teal-600), #0284c7)' : '' }}
                onClick={() => setViewMode('3d')}
              >
                <span style={{ fontSize: '0.85rem' }}>🌐 3D Spatial Grid</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                onClick={() => setViewMode('list')}
              >
                <List size={15} /> List View
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div style={{ marginTop: 20 }}>
              {state.loading && !state.data ? (
                <Loader label="Loading civic issues…" />
              ) : state.error ? (
                <ErrorState message={state.error.message} onRetry={state.reload} />
              ) : items.length === 0 ? (
                <EmptyState title="No complaints match these filters">
                  Try clearing your filters or report a new problem in this ward.
                </EmptyState>
              ) : (
                <div className="grid cols-3" style={{ gap: 16 }}>
                  {items.map((c) => (
                    <TiltCard key={c.complaintId} maxTilt={10} depth={15}>
                      <div className="card hover" style={{ border: '1.5px solid rgba(45, 212, 191, 0.3)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="row between">
                          <span className="mono small muted">{c.complaintId}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <h3 style={{ marginTop: 8, fontSize: '1.05rem' }}>{c.title}</h3>
                        <div className="row" style={{ gap: 6, margin: '8px 0' }}>
                          <span className="chip">{CATEGORY_LABEL[c.category] || c.category}</span>
                          <SeverityBadge severity={c.severity} />
                        </div>
                        <p className="small muted" style={{ margin: '0 0 12px' }}>
                          {c.description}
                        </p>
                        <div className="row between" style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--slate-100)' }}>
                          <span className="small muted">
                            <MapPin size={13} style={{ verticalAlign: -2 }} /> {c.landmark || 'Pinned Location'}
                          </span>
                          <Link to={`/track?id=${c.complaintId}`} className="btn btn-secondary btn-sm">
                            Track Status →
                          </Link>
                        </div>
                      </div>
                    </TiltCard>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="map-layout" style={{ marginTop: 20 }}>
              <aside className="card" aria-live="polite" style={{ border: '1px solid var(--slate-200)' }}>
                {sel ? (
                  <div className="stack">
                    <div className="row between">
                      <span className="mono small muted">{sel.complaintId}</span>
                      <StatusBadge status={sel.status} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{sel.title}</h3>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="chip">{CATEGORY_LABEL[sel.category] || sel.category}</span>
                      <SeverityBadge severity={sel.severity} />
                    </div>
                    <p className="small" style={{ margin: 0, color: 'var(--slate-700)' }}>
                      {sel.description}
                    </p>
                    <p className="small muted" style={{ margin: 0 }}>
                      <MapPin size={14} style={{ verticalAlign: -2 }} /> {sel.landmark || 'No landmark specified'} · Reported{' '}
                      {fmtDate(sel.createdAt)} · {sel.observationCount} community observation
                      {sel.observationCount === 1 ? '' : 's'}
                    </p>
                    <Link to={`/track?id=${sel.complaintId}`} className="btn btn-secondary btn-sm">
                      Open Full Tracking Page
                    </Link>
                    <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
                    <strong className="small">Seen this spot recently?</strong>
                    {done === sel.complaintId ? (
                      <Alert type="ok">
                        Thank you. Your observation has been recorded and notified to field officers.
                      </Alert>
                    ) : (
                      <>
                        <textarea
                          className="textarea"
                          rows={2}
                          maxLength={500}
                          placeholder="Optional note: What did you observe on the ground?"
                          aria-label="Optional note"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                        <div className="row">
                          <ButtonLoading
                            type="button"
                            className="btn btn-danger btn-sm"
                            loading={sending}
                            onClick={() => observe('STILL_POLLUTED')}
                          >
                            <Eye size={15} /> Still a Problem
                          </ButtonLoading>
                          <ButtonLoading
                            type="button"
                            className="btn btn-secondary btn-sm"
                            loading={sending}
                            onClick={() => observe('LOOKS_CLEAN')}
                          >
                            Looks Cleaned
                          </ButtonLoading>
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ background: 'var(--teal-600)', marginTop: 8 }}
                      onClick={() => reportHere(sel.location)}
                    >
                      <Plus size={15} /> Report New Issue Near Here
                    </button>
                  </div>
                ) : picked ? (
                  <div className="stack">
                    <h3 style={{ margin: 0 }}>Spot Selected on Map</h3>
                    <p className="small muted" style={{ margin: 0 }}>
                      Coordinates: {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ background: 'var(--teal-600)' }}
                      onClick={() => reportHere(picked)}
                    >
                      Report a Problem Here
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicked(null)}>
                      Cancel Selection
                    </button>
                  </div>
                ) : (
                  <div className="stack">
                    <h3 style={{ margin: 0 }}>Explore Civic Grievances</h3>
                    <p className="small muted" style={{ margin: 0 }}>
                      Click any marker pin to view incident details and submit field observations. Or click anywhere on the
                      map to report a new problem at that exact spot.
                    </p>
                    {state.data && (
                      <p className="small" style={{ margin: 0 }}>
                        <strong>{items.length}</strong> incident{items.length === 1 ? '' : 's'} displayed
                      </p>
                    )}
                    <StatusLegend />
                  </div>
                )}
              </aside>
              <div>
                {state.loading && !state.data ? (
                  <Loader label="Loading civic map…" />
                ) : state.error ? (
                  <ErrorState message={state.error.message} onRetry={state.reload} />
                ) : (
                  <div className={`spatial-3d-map-container ${viewMode === '3d' ? 'active-3d-grid' : ''}`}>
                    {viewMode === '3d' && (
                      <div className="spatial-3d-map-hud">
                        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                          <span className="ambient-3d-dot" />
                          <span className="mono" style={{ fontSize: '0.75rem', color: '#2dd4bf', letterSpacing: '0.06em' }}>
                            3D SPATIAL TACTICAL GRID · ELEVATION 22° · LIVE PUNE WARD MATRIX
                          </span>
                        </div>
                      </div>
                    )}
                    <ComplaintMap
                      items={items}
                      className="map-box tall"
                      selectedId={sel && sel.complaintId}
                      onSelect={(c) => {
                        setSel(c);
                        setPicked(null);
                      }}
                      onMapClick={(lat, lng) => {
                        setPicked({ lat, lng });
                        setSel(null);
                      }}
                      picked={picked}
                      fit
                    />
                    {items.length === 0 && (
                      <div style={{ marginTop: 12 }}>
                        <EmptyState title="No complaints match these filters">
                          Try adjusting your category or priority filter, or report the first incident.
                        </EmptyState>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

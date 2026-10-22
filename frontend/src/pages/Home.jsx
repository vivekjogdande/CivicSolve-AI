import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Camera,
  ShieldCheck,
  MapPin,
  Activity,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Building2,
  Wrench,
  BrainCircuit,
  Layers,
  Send,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useAuth, homeFor } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { StatCard, Loader, ErrorState, EmptyState, StatusBadge, Async } from '../components/ui';
import { CATEGORY_LABEL, CATEGORY_OPTIONS, fmtDate } from '../utils/constants';
import CivicGlobe3D from '../components/CivicGlobe3D';
import TiltCard from '../components/TiltCard';
import Civic3DPipeline from '../components/Civic3DPipeline';
import { ComplaintMap, StatusLegend } from '../components/MapView';

const STEPS = [
  {
    icon: FileText,
    num: '01',
    title: 'Report Problem',
    text: 'Submit title, photo, and map coordinates. Optional anonymous reporting with secure token hash.',
  },
  {
    icon: BrainCircuit,
    num: '02',
    title: 'AI Analysis',
    text: 'Automated civic categorization, priority classification, safety hazard detection, and duplicate checking.',
  },
  {
    icon: Building2,
    num: '03',
    title: 'Smart Dispatch',
    text: 'Explainable responder routing based on department expertise, proximity, active workload, and urgency.',
  },
  {
    icon: Camera,
    num: '04',
    title: 'Evidence Resolution',
    text: 'Officers upload after-repair proof. EXIF capture time and GPS proximity are validated against report data.',
  },
  {
    icon: ShieldCheck,
    num: '05',
    title: 'Citizen Verification',
    text: 'The citizen inspects before-and-after evidence. Only the reporting citizen can confirm an issue resolved.',
  },
];

const PRESET_QUERIES = [
  'Deep pothole causing two-wheeler skidding near Metro pillar 42',
  'Uncovered 6-foot drainage manhole directly outside primary school gate',
  'Overflowing municipal garbage pile blocking market entrance with severe stench',
  'Pressurized clean drinking water pipe burst flooding residential lane',
];

export default function Home() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = useFetch(() => api.get('/api/public/stats', undefined, { auth: false }), []);
  const map = useFetch(() => api.get('/api/public/map', undefined, { auth: false }), []);
  const recent = useFetch(() => api.get('/api/public/recent', undefined, { auth: false }), []);
  const tr = useFetch(() => api.get('/api/public/transparency', undefined, { auth: false }), []);

  // Quick Grievance Drafter & Citizen Onboarding state
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState('');
  const [quickDesc, setQuickDesc] = useState('');

  const handleQuickDraftSubmit = (e) => {
    e.preventDefault();
    navigate('/report', {
      state: {
        name: quickName.trim(),
        category: quickCategory,
        title: quickDesc ? quickDesc.slice(0, 80) : '',
        description: quickDesc.trim(),
      },
    });
  };

  // Interactive AI Scanner playground state
  const [demoQuery, setDemoQuery] = useState(PRESET_QUERIES[0]);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const runAiDemo = async (queryText) => {
    const textToRun = queryText || demoQuery;
    if (!textToRun.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await api.post('/api/complaints/ai-analyze', {
        title: textToRun,
        description: textToRun,
      }, { auth: false });
      const analysis = res?.analysis || res?.data?.analysis || (res && res.category ? res : null);
      if (analysis) {
        setAiResult(analysis);
      }
    } catch (err) {
      setAiError(err.message || 'AI service temporarily busy.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      {/* Hero Section with Interactive 3D WebGL Digital Twin & Quick Citizen Drafter */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid-3d">
            <div>
              <span className="eyebrow">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} /> CivicSolve AI · Municipal Intelligence Platform
                </span>
              </span>
              <h1>{lang === 'mr' ? 'स्मार्ट शहरे, समृद्ध समुदाय.' : 'Smarter Cities, Better Communities.'}</h1>
              <p>
                {t.heroSub ||
                  'Citizens report civic issues, track real-time resolution progress, and help municipal authorities prioritize public problems with AI-assisted triage and verified evidence.'}
              </p>
              <div className="cta" style={{ flexWrap: 'wrap', gap: 12 }}>
                <Link to="/report" className="btn btn-primary btn-lg" style={{ background: 'var(--teal-600)', borderColor: 'var(--teal-500)' }}>
                  {t.reportIssue || 'Report an Issue'} <ArrowRight size={18} />
                </Link>
                <Link to={user ? homeFor(user.role) : '/map'} className="btn btn-outline-light btn-lg">
                  {user ? (t.exploreDashboard || 'Explore Civic Dashboard') : (t.exploreMap || 'Explore Civic Map')}
                </Link>
              </div>

              {/* Citizen Quick Grievance Drafter & Onboarding Start Screen Card */}
              <div
                className="card"
                style={{
                  marginTop: 24,
                  background: 'rgba(11, 25, 44, 0.88)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(45, 212, 191, 0.35)',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
                  color: '#fff',
                  borderRadius: 'var(--radius)',
                  padding: '18px 20px',
                }}
              >
                <div className="row between" style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={16} color="var(--teal-400)" />
                    {t.quickStartTitle || 'Quick Civic Grievance Drafter'}
                  </h3>
                  <span className="badge" style={{ background: 'rgba(45, 212, 191, 0.15)', color: 'var(--teal-300)', fontSize: '0.72rem', border: '1px solid rgba(45, 212, 191, 0.3)' }}>
                    Citizen Onboarding
                  </span>
                </div>
                <form onSubmit={handleQuickDraftSubmit}>
                  <div className="grid cols-2" style={{ gap: 10, marginBottom: 10 }}>
                    <div>
                      <label className="small" style={{ color: '#cbd5e1', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                        {t.yourName || 'Citizen Name (optional)'}
                      </label>
                      <input
                        type="text"
                        className="input"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff',
                          fontSize: '0.86rem',
                          padding: '7px 10px',
                        }}
                        placeholder={t.namePlaceholder || 'e.g. Ramesh Kulkarni'}
                        value={quickName}
                        onChange={(e) => setQuickName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="small" style={{ color: '#cbd5e1', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                        {t.selectCategory || 'Civic Category'}
                      </label>
                      <select
                        className="input"
                        style={{
                          background: '#0b192c',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff',
                          fontSize: '0.86rem',
                          padding: '7px 10px',
                        }}
                        value={quickCategory}
                        onChange={(e) => setQuickCategory(e.target.value)}
                      >
                        <option value="">{lang === 'mr' ? 'समस्या प्रकार निवडा...' : 'Select category...'}</option>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="small" style={{ color: '#cbd5e1', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                      {t.issueDescription || 'Describe problem location & hazard'}
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.86rem',
                        padding: '7px 10px',
                        width: '100%',
                      }}
                      placeholder={t.descPlaceholder || 'e.g. Deep pothole outside Metro Station causing two-wheelers to fall...'}
                      value={quickDesc}
                      onChange={(e) => setQuickDesc(e.target.value)}
                    />
                  </div>
                  <div className="row between" style={{ alignItems: 'center' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        background: 'var(--teal-600)',
                        borderColor: 'var(--teal-500)',
                        fontSize: '0.88rem',
                        padding: '8px 16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {t.proceedToReport || 'Proceed to Report'} <ArrowRight size={14} />
                    </button>
                    <span className="small" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      <Link to="/citizen/login" style={{ color: 'var(--teal-400)', textDecoration: 'underline' }}>Sign in</Link> ·{' '}
                      <Link to="/citizen/register" style={{ color: 'var(--teal-400)', textDecoration: 'underline' }}>Register</Link> ·{' '}
                      <Link to="/report" style={{ color: '#cbd5e1' }}>Guest mode</Link>
                    </span>
                  </div>
                </form>
              </div>
            </div>

            {/* 3D WebGL Digital Twin Globe Canvas */}
            <CivicGlobe3D />
          </div>
        </div>
      </section>

      {/* Live Application Metrics with 3D Tilt Glare */}
      <section className="stat-strip">
        <div className="container">
          {stats.error ? (
            <ErrorState message={stats.error.message} onRetry={stats.reload} />
          ) : (
            <div className="grid cols-4">
              <TiltCard maxTilt={8} depth={14} className="stat-card-3d">
                <StatCard
                  icon={FileText}
                  value={stats.data ? stats.data.totalReports : '…'}
                  label={t.statsReported || 'Civic issues reported'}
                />
              </TiltCard>
              <TiltCard maxTilt={8} depth={14} className="stat-card-3d">
                <StatCard
                  icon={Activity}
                  value={stats.data ? stats.data.underInvestigation : '…'}
                  label={t.statsActive || 'Under active response'}
                  tone="civic"
                />
              </TiltCard>
              <TiltCard maxTilt={8} depth={14} className="stat-card-3d">
                <StatCard
                  icon={CheckCircle2}
                  value={stats.data ? stats.data.citizenConfirmedResolutions : '…'}
                  label={t.statsVerified || 'Citizen-verified fixes'}
                />
              </TiltCard>
              <TiltCard maxTilt={8} depth={14} className="stat-card-3d">
                <StatCard
                  icon={MapPin}
                  value={stats.data ? stats.data.locationsMonitored : '…'}
                  label={t.statsWards || 'Civic wards monitored'}
                  tone="civic"
                />
              </TiltCard>
            </div>
          )}
        </div>
      </section>

      {/* Interactive AI Civic Intelligence Demo */}
      <section className="section alt">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow" style={{ color: 'var(--teal-600)' }}>Live Demonstration</span>
            <h2>Experience Civic AI Triage in Real Time</h2>
            <p className="muted">
              Type any civic grievance or select a pre-set scenario. Our civic model assesses category, urgency,
              safety risks, and municipal routing within seconds.
            </p>
          </div>

          <TiltCard maxTilt={5} depth={12} style={{ maxWidth: 840, margin: '0 auto' }}>
            <div className="card" style={{ border: '1.5px solid rgba(45, 212, 191, 0.35)', boxShadow: '0 20px 45px rgba(0, 0, 0, 0.12)' }}>
            <div className="row" style={{ gap: 8, marginBottom: 14 }}>
              <span className="small muted" style={{ fontWeight: 600 }}>Try realistic prompts:</span>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {PRESET_QUERIES.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    onClick={() => {
                      setDemoQuery(q);
                      runAiDemo(q);
                    }}
                  >
                    Scenario {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
              <input
                type="text"
                className="input"
                style={{ flex: 1, fontSize: '0.95rem' }}
                placeholder="Describe a civic problem (e.g. Broken streetlight on 5th cross road with live spark...)"
                value={demoQuery}
                onChange={(e) => setDemoQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runAiDemo();
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--navy-900)', gap: 8 }}
                onClick={() => runAiDemo()}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <>Analyzing…</>
                ) : (
                  <>
                    <BrainCircuit size={18} /> Analyze with AI
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="alert alert-error" style={{ marginTop: 14 }}>
                <AlertTriangle size={18} /> {aiError}
              </div>
            )}

            {aiResult && (
              <div className="ai-panel">
                <div className="row between" style={{ marginBottom: 12 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="ai-badge">
                      <Sparkles size={13} /> {aiResult.modelUsed || 'CivicSolve AI'}
                    </span>
                    <span className={`badge ${aiResult.priority === 'CRITICAL' ? 'res-FAIL' : aiResult.priority === 'HIGH' ? 'res-WARN' : 'res-PASS'}`} style={{ padding: '4px 10px' }}>
                      Priority: {aiResult.priority}
                    </span>
                  </div>
                  <span className="small muted" style={{ fontWeight: 600 }}>
                    Confidence: {aiResult.confidenceScore}%
                  </span>
                </div>

                <div className="confidence-bar">
                  <div className="confidence-bar-fill" style={{ width: `${aiResult.confidenceScore}%` }} />
                </div>

                <div className="grid cols-2" style={{ marginTop: 16, gap: 16 }}>
                  <div>
                    <span className="small muted" style={{ display: 'block', fontWeight: 600 }}>Detected Category</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--navy-900)' }}>
                      {CATEGORY_LABEL[aiResult.category] || aiResult.category}
                    </strong>
                  </div>
                  <div>
                    <span className="small muted" style={{ display: 'block', fontWeight: 600 }}>Recommended Department</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--teal-600)' }}>
                      {aiResult.recommendedDepartment}
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <span className="small muted" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Civic Action Recommendation</span>
                  <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--slate-800)' }}>
                    {aiResult.recommendedAction}
                  </p>
                </div>

                {aiResult.safetyHazards && aiResult.safetyHazards.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <span className="small muted" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Identified Safety Risks</span>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {aiResult.safetyHazards.map((h, i) => (
                        <span key={i} className="hazard-tag">
                          <AlertTriangle size={14} /> {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </TiltCard>
        </div>
      </section>

      {/* Interactive 3D Lifecycle Pipeline Architecture */}
      <Civic3DPipeline />

      {/* Core Architectural Pillars with 3D Spatial Depth */}
      <section className="section alt">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow" style={{ color: 'var(--teal-600)' }}>Platform Pillars</span>
            <h2>Intelligent Civic Technology Built for Scale</h2>
          </div>
          <div className="grid cols-3">
            <TiltCard maxTilt={9} depth={16}>
              <div className="card" style={{ height: '100%' }}>
                <span className="icon-bubble" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <BrainCircuit size={22} />
                </span>
                <h3>Real-Time AI Intake</h3>
                <p className="small muted">
                  Understands natural language complaints in multiple formats. Automatically flags life-critical safety hazards and computes confidence scores.
                </p>
              </div>
            </TiltCard>

            <TiltCard maxTilt={9} depth={16}>
              <div className="card" style={{ height: '100%' }}>
                <span className="icon-bubble" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Building2 size={22} />
                </span>
                <h3>Explainable Smart Matching</h3>
                <p className="small muted">
                  Calibrated multi-factor routing scoring expertise (35%), location proximity (30%), active workload (20%), and role seniority (15%).
                </p>
              </div>
            </TiltCard>

            <TiltCard maxTilt={9} depth={16}>
              <div className="card" style={{ height: '100%' }}>
                <span className="icon-bubble" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <MapPin size={22} />
                </span>
                <h3>Geospatial Duplicate Alerting</h3>
                <p className="small muted">
                  Detects existing nearby grievances within a 350-meter radius, preventing duplicate dispatching and saving public municipal resources.
                </p>
              </div>
            </TiltCard>

            <TiltCard maxTilt={9} depth={16}>
              <div className="card" style={{ height: '100%' }}>
                <span className="icon-bubble" style={{ background: '#fdf2f8', color: '#db2777' }}>
                  <Camera size={22} />
                </span>
                <h3>Evidence-Based Proof</h3>
                <p className="small muted">
                  Field teams must upload after-photos. EXIF timestamps and GPS coordinates are cryptographically inspected against the original complaint.
                </p>
              </div>
            </TiltCard>

            <TiltCard maxTilt={9} depth={16}>
              <div className="card" style={{ height: '100%' }}>
                <span className="icon-bubble" style={{ background: '#f0fdfa', color: '#0d9488' }}>
                  <ShieldCheck size={22} />
                </span>
                <h3>Closed-Loop Verification</h3>
                <p className="small muted">
                  Authorities cannot unilaterally close complaints. Only the citizen who reported the problem can verify that the repair was satisfactorily executed.
                </p>
              </div>
            </TiltCard>

            <TiltCard maxTilt={9} depth={16}>
              <div className="card" style={{ height: '100%' }}>
                <span className="icon-bubble" style={{ background: '#f8fafc', color: '#475569' }}>
                  <Activity size={22} />
                </span>
                <h3>Auditable Transparency</h3>
                <p className="small muted">
                  Every status transition, officer assignment, and verification timestamp is logged in an immutable audit ledger accessible to the public.
                </p>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Live Map Overview */}
      <section className="section">
        <div className="container">
          <div className="row between" style={{ marginBottom: 18 }}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <span className="eyebrow" style={{ color: 'var(--teal-600)' }}>Geographic Overview</span>
              <h2 style={{ marginBottom: 0 }}>Civic Issues Across Wards</h2>
            </div>
            <Link to="/map" className="btn btn-secondary">
              Open Interactive Map <ArrowRight size={16} />
            </Link>
          </div>
          {map.loading && !map.data ? (
            <Loader label="Loading civic map…" />
          ) : map.error ? (
            <ErrorState message={map.error.message} onRetry={map.reload} />
          ) : (
            <>
              <ComplaintMap items={map.data?.items || []} />
              {(!map.data?.items || map.data.items.length === 0) && (
                <p className="muted small" style={{ marginTop: 10 }}>
                  No civic problems recorded yet. Be the first to <Link to="/report">report an issue</Link>.
                </p>
              )}
              <div style={{ marginTop: 12 }}>
                <StatusLegend />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Recent Public Civic Grievances */}
      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow" style={{ color: 'var(--teal-600)' }}>Recent Incidents</span>
            <h2>Latest Public Reports</h2>
            <p className="muted">
              Locations are approximate and citizen identities are strictly protected under privacy standards.
            </p>
          </div>
          <Async state={recent}>
            {(d) =>
              d.items.length === 0 ? (
                <EmptyState
                  title="No reports submitted yet"
                  action={
                    <Link to="/report" className="btn btn-primary btn-sm">
                      Report a Problem
                    </Link>
                  }
                >
                  Citizen complaints will appear here as soon as they are submitted.
                </EmptyState>
              ) : (
                <div className="grid cols-3">
                  {d.items.map((c) => (
                    <Link
                      key={c.complaintId}
                      to={`/track?id=${c.complaintId}`}
                      className="card hover"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="row between">
                        <span className="mono small muted">{c.complaintId}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <h3 style={{ marginTop: 8, fontSize: '1.05rem' }}>{c.title}</h3>
                      <p className="small muted" style={{ margin: 0 }}>
                        {CATEGORY_LABEL[c.category] || c.category} · {c.landmark || 'Location pinned'} · {fmtDate(c.createdAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              )
            }
          </Async>
        </div>
      </section>

      {/* Community Impact & Transparency */}
      <section className="section">
        <div className="container grid cols-2" style={{ alignItems: 'center' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--teal-600)' }}>Auditable Resolution</span>
            <h2>True Municipal Accountability, Driven by Evidence</h2>
            <ul className="check-list" style={{ fontSize: '0.98rem', gap: 12 }}>
              <li>
                <CheckCircle2 size={18} className="res-PASS" style={{ flex: 'none', marginTop: 3 }} />
                Officers must upload photographic after-proof before requesting resolution confirmation.
              </li>
              <li>
                <CheckCircle2 size={18} className="res-PASS" style={{ flex: 'none', marginTop: 3 }} />
                Photo capture time and GPS metadata are evaluated automatically for fraud or distance mismatch.
              </li>
              <li>
                <CheckCircle2 size={18} className="res-PASS" style={{ flex: 'none', marginTop: 3 }} />
                Citizens choose “Yes, it’s fixed” or “No, still a problem”. Rejection escalates directly to a senior officer.
              </li>
              <li>
                <CheckCircle2 size={18} className="res-PASS" style={{ flex: 'none', marginTop: 3 }} />
                Unconfirmed cases close after 7 days as unconfirmed, never counted as successful resolutions.
              </li>
            </ul>
          </div>
          <div className="card" style={{ border: '1.5px solid var(--slate-200)' }}>
            <h3>Community Impact Metrics</h3>
            {tr.loading && !tr.data ? (
              <Loader />
            ) : tr.error ? (
              <p className="muted">Live metrics temporarily unavailable.</p>
            ) : (
              <>
                <div className="grid cols-2" style={{ gap: 14 }}>
                  <div className="metric">
                    <div className="big" style={{ color: 'var(--teal-600)' }}>
                      {tr.data?.rates?.confirmationRate?.value == null ? '—' : `${tr.data.rates.confirmationRate.value}%`}
                    </div>
                    <div className="small muted">Citizen-confirmed resolution rate</div>
                  </div>
                  <div className="metric">
                    <div className="big" style={{ color: (tr.data?.rates?.reopenRate?.value || 0) > 15 ? 'var(--danger)' : 'var(--navy-900)' }}>
                      {tr.data?.rates?.reopenRate?.value == null ? '—' : `${tr.data.rates.reopenRate.value}%`}
                    </div>
                    <div className="small muted">Reopen / rework rate</div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <Link to="/transparency" className="btn btn-secondary btn-sm">
                    Open Full Transparency Dashboard →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div
            className="cta-band"
            style={{
              background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 60%, var(--teal-600) 100%)',
              color: '#fff',
              borderRadius: 'var(--radius)',
              padding: '48px 36px',
              textAlign: 'center',
            }}
          >
            <h2 style={{ color: '#fff', marginBottom: 10 }}>Notice a Civic Problem in Your Neighborhood?</h2>
            <p style={{ maxWidth: 580, margin: '0 auto', color: '#cbd5e1' }}>
              Report potholes, garbage accumulation, open manholes, or water leaks in 60 seconds.
              No account required to submit. Receive an instant tracking ID with AI triage.
            </p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 22 }}>
              <Link to="/report" className="btn btn-light btn-lg" style={{ fontWeight: 700 }}>
                Report a Problem Now
              </Link>
              <Link to="/portals" className="btn btn-outline-light btn-lg">
                Sign In / Role Portals
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

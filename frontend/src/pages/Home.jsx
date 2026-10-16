import { Link } from 'react-router-dom';
import { FileText, Search, Camera, ShieldCheck, MapPin, Activity, CheckCircle2, Globe2, ArrowRight, Droplets, Recycle, Users } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { StatCard, Loader, ErrorState, EmptyState, StatusBadge, Async } from '../components/ui';
import { ComplaintMap, StatusLegend } from '../components/MapView';
import { CATEGORY_LABEL, fmtDate } from '../utils/constants';

const STEPS = [
  { icon: FileText, title: 'Report pollution', text: 'Upload a photo or video, pin the spot on the map and describe the problem. An account is optional.' },
  { icon: Search, title: 'Authorities investigate', text: 'Your report is routed to the responsible department, assigned to an officer and tracked publicly.' },
  { icon: Camera, title: 'Upload cleanup proof', text: 'Officers must submit an after-cleanup photo. Its time and GPS data are checked against your report.' },
  { icon: ShieldCheck, title: 'Citizens verify the result', text: 'You see before and after side by side and decide: fixed, or still a problem. Only you can close it as resolved.' },
];

const TIPS = [
  { icon: Recycle, title: 'Keep plastic out of the river', text: 'Never dump puja material, packaging or household waste into the water or on its banks.' },
  { icon: Droplets, title: 'Report sewage and chemical outflows', text: 'Discoloured water, foam or a strong smell near a drain or factory outlet is worth a report.' },
  { icon: Users, title: 'Organise a cleanup', text: 'Local groups, schools and colleges can adopt a river stretch and document it before and after.' },
];

export default function Home() {
  const stats = useFetch(() => api.get('/api/public/stats', undefined, { auth: false }), []);
  const map = useFetch(() => api.get('/api/public/map', undefined, { auth: false }), []);
  const recent = useFetch(() => api.get('/api/public/recent', undefined, { auth: false }), []);
  const tr = useFetch(() => api.get('/api/public/transparency', undefined, { auth: false }), []);

  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="eyebrow">Indrayani River · Maharashtra</span>
          <h1>Protect Our Rivers. Report Pollution. Drive Real Change.</h1>
          <p>RiverCare lets citizens report river pollution, follow every complaint to its outcome, and verify that cleanup actually happened, with before and after proof you can see for yourself.</p>
          <div className="cta">
            <Link to="/report" className="btn btn-light btn-lg">Report Pollution</Link>
            <Link to="/map" className="btn btn-outline-light btn-lg">Explore Pollution Map</Link>
          </div>
        </div>
      </section>

      <section className="stat-strip">
        <div className="container">
          {stats.error ? <ErrorState message={stats.error.message} onRetry={stats.reload} /> : (
            <div className="grid cols-4">
              <StatCard icon={FileText} value={stats.data ? stats.data.totalReports : '…'} label="Reports submitted" />
              <StatCard icon={Activity} value={stats.data ? stats.data.underInvestigation : '…'} label="Under investigation" tone="river" />
              <StatCard icon={CheckCircle2} value={stats.data ? stats.data.citizenConfirmedResolutions : '…'} label="Citizen-confirmed resolutions" />
              <StatCard icon={MapPin} value={stats.data ? stats.data.locationsMonitored : '…'} label="Locations monitored" tone="river" />
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head center"><span className="eyebrow">How RiverCare works</span><h2>From a photo to a verified cleanup</h2></div>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="step">
                <span className="step-num">{i + 1}</span>
                <span className="icon-bubble"><s.icon size={22} /></span>
                <h3>{s.title}</h3>
                <p className="small muted" style={{ margin: 0 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="row between" style={{ marginBottom: 18 }}>
            <div className="section-head" style={{ marginBottom: 0 }}><span className="eyebrow">Live map</span><h2 style={{ marginBottom: 0 }}>What is being reported</h2></div>
            <Link to="/map" className="btn btn-secondary">Open full map <ArrowRight size={16} /></Link>
          </div>
          {map.loading && !map.data ? <Loader label="Loading map…" /> : map.error ? <ErrorState message={map.error.message} onRetry={map.reload} /> : (
            <>
              <ComplaintMap items={map.data.items} />
              {map.data.items.length === 0 && <p className="muted small" style={{ marginTop: 10 }}>No complaints have been reported yet. Be the first to <Link to="/report">report pollution</Link>.</p>}
              <div style={{ marginTop: 12 }}><StatusLegend /></div>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><span className="eyebrow">Recent reports</span><h2>Latest public incidents</h2><p className="muted">Locations are rounded and reporter details are never shown.</p></div>
          <Async state={recent}>
            {(d) => d.items.length === 0 ? (
              <EmptyState title="No reports yet" action={<Link to="/report" className="btn btn-primary btn-sm">Report pollution</Link>}>Reports will appear here as soon as citizens submit them.</EmptyState>
            ) : (
              <div className="grid cols-3">
                {d.items.map((c) => (
                  <Link key={c.complaintId} to={`/track?id=${c.complaintId}`} className="card hover" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="row between"><span className="mono small muted">{c.complaintId}</span><StatusBadge status={c.status} /></div>
                    <h3 style={{ marginTop: 8 }}>{c.title}</h3>
                    <p className="small muted" style={{ margin: 0 }}>{CATEGORY_LABEL[c.category]} · {c.landmark || 'Location pinned on map'} · {fmtDate(c.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </Async>
        </div>
      </section>

      <section className="section tint">
        <div className="container grid cols-2" style={{ alignItems: 'center' }}>
          <div>
            <span className="eyebrow">Before-and-after verification</span>
            <h2>A complaint is only “resolved” when a citizen says so</h2>
            <ul className="check-list" style={{ fontSize: '1rem', gap: 10 }}>
              <li><CheckCircle2 size={18} className="res-PASS" style={{ flex: 'none', marginTop: 3 }} /> Officers must upload an after-cleanup photo before asking for confirmation.</li>
              <li><CheckCircle2 size={18} className="res-PASS" style={{ flex: 'none', marginTop: 3 }} /> The photo’s capture time and GPS position are compared with your report. Suspicious or unverifiable files are flagged for review.</li>
              <li><CheckCircle2 size={18} className="res-PASS" style={{ flex: 'none', marginTop: 3 }} /> You choose “Yes, it’s fixed” or “No, still a problem”. If you reject it, the case reopens and goes to a senior officer.</li>
              <li><CheckCircle2 size={18} className="res-PASS" style={{ flex: 'none', marginTop: 3 }} /> No answer within seven days closes the case as unconfirmed, which is never counted as a success.</li>
            </ul>
            <p className="small muted">An optional local AI model can compare the two photos, but its opinion is advisory only.</p>
          </div>
          <div className="card">
            <h3>Transparency at a glance</h3>
            {tr.loading && !tr.data ? <Loader /> : tr.error ? <p className="muted">Statistics are unavailable right now.</p> : (
              <>
                <div className="grid cols-2" style={{ gap: 12 }}>
                  <div className="metric"><div className="big">{tr.data.rates.confirmationRate.value === null ? '—' : `${tr.data.rates.confirmationRate.value}%`}</div><div className="small muted">Citizen-confirmed resolution rate</div></div>
                  <div className="metric"><div className="big">{tr.data.rates.reopenRate.value === null ? '—' : `${tr.data.rates.reopenRate.value}%`}</div><div className="small muted">Reopen rate</div></div>
                </div>
                {tr.data.rates.confirmationRate.value === null && <p className="small muted" style={{ marginTop: 10 }}>Rates appear once cleanups have been submitted and answered.</p>}
                <Link to="/transparency" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>See full dashboard</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><span className="eyebrow">Awareness</span><h2>Small actions that protect the river</h2></div>
          <div className="grid cols-3">
            {TIPS.map((t) => (
              <div key={t.title} className="card">
                <span className="icon-bubble river"><t.icon size={22} /></span>
                <h3>{t.title}</h3>
                <p className="small muted" style={{ margin: 0 }}>{t.text}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 18 }}><Link to="/awareness"><Globe2 size={16} style={{ verticalAlign: -3 }} /> More tips, video and Marathi version →</Link></p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band">
            <h2>See pollution on the Indrayani? Say something.</h2>
            <p>It takes two minutes, works without an account, and gives you an ID to follow the complaint until the river is clean.</p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
              <Link to="/report" className="btn btn-light btn-lg">Report Pollution</Link>
              <Link to="/portals" className="btn btn-outline-light btn-lg">Log in or register</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

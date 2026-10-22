import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Alert, ButtonLoading, Loader, PageHero } from '../components/ui';
import { ComplaintSummary, PublicNotes, StatusNote, Timeline } from '../components/ComplaintParts';
import { ComplaintMap } from '../components/MapView';
import TiltCard from '../components/TiltCard';
import Civic3DTracker from '../components/Civic3DTracker';

export default function TrackComplaint() {
  const [params, setParams] = useSearchParams();
  const { isCitizen } = useAuth();
  const [id, setId] = useState(params.get('id') || '');
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const urlId = params.get('id');

  const load = async (value) => {
    const v = value.trim().toUpperCase();
    if (!v) { setErr('Enter a complaint ID, for example CS-2026-DEMO01'); setC(null); return; }
    setBusy(true); setErr(''); setC(null);
    try { setC((await api.get(`/api/complaints/track/${encodeURIComponent(v)}`, undefined, { auth: false })).complaint); } catch (e) { setErr(e.status === 404 ? 'No grievance was found with that ID. Check the reference code and try again.' : e.message); } finally { setBusy(false); }
  };

  useEffect(() => { if (urlId) { setId(urlId); load(urlId); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [urlId]);

  const submit = (e) => { e.preventDefault(); setParams(id.trim() ? { id: id.trim().toUpperCase() } : {}); if (id.trim().toUpperCase() === urlId) load(id); };

  return (
    <>
      <PageHero title="Track a Civic Grievance" subtitle="Enter a reference complaint ID to inspect real-time progress and verified resolution stages." />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container medium stack" style={{ gap: 20 }}>
          <TiltCard maxTilt={8} depth={15}>
            <form className="card row" onSubmit={submit} role="search" style={{ border: '1.5px solid rgba(45, 212, 191, 0.4)' }}>
              <label htmlFor="cid" className="sr-only">Complaint ID</label>
              <input id="cid" className="input" style={{ flex: 1, minWidth: 220 }} placeholder="Complaint ID, e.g. CS-2026-DEMO01" value={id} onChange={(e) => setId(e.target.value)} autoComplete="off" />
              <ButtonLoading type="submit" loading={busy} className="btn btn-primary"><Search size={16} /> Track Grievance</ButtonLoading>
            </form>
          </TiltCard>
          <p className="small muted" style={{ margin: 0 }}>
            This page shows public tracking telemetry. To inspect photographs, before/after evidence or confirm cleanup: {isCitizen ? <>open the complaint from your <Link to="/dashboard">dashboard</Link></> : <><Link to="/citizen/login">log in</Link> or use <Link to="/anonymous">anonymous tracking</Link> with your confirmation token</>}.
          </p>
          {busy && <Loader label="Querying 3D civic registry…" />}
          {err && <Alert type="error">{err}</Alert>}
          {c && (
            <>
              {/* 3D Spatial Lifecycle Milestone Track */}
              <Civic3DTracker status={c.status} />

              <StatusNote status={c.status} />
              {c.status === 'AWAITING_CITIZEN_CONFIRMATION' && <Alert type="info">A cleanup has been submitted and is waiting for the reporter to confirm it.</Alert>}

              <TiltCard maxTilt={6} depth={10}>
                <ComplaintSummary c={c} />
              </TiltCard>

              <ComplaintMap items={[c]} className="map-box short" />
              <PublicNotes notes={c.publicNotes} />
              <div className="card" style={{ border: '1.5px solid var(--slate-200)' }}>
                <h3>Progress timeline</h3>
                <Timeline items={c.timeline} />
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

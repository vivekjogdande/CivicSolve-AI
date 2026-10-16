import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Alert, ButtonLoading, Loader, PageHero } from '../components/ui';
import { ComplaintSummary, PublicNotes, StatusNote, Timeline } from '../components/ComplaintParts';
import { ComplaintMap } from '../components/MapView';

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
    if (!v) { setErr('Enter a complaint ID, for example RC-XXXXXX'); setC(null); return; }
    setBusy(true); setErr(''); setC(null);
    try { setC((await api.get(`/api/complaints/track/${encodeURIComponent(v)}`, undefined, { auth: false })).complaint); } catch (e) { setErr(e.status === 404 ? 'No complaint was found with that ID. Check it and try again.' : e.message); } finally { setBusy(false); }
  };

  useEffect(() => { if (urlId) { setId(urlId); load(urlId); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [urlId]);

  const submit = (e) => { e.preventDefault(); setParams(id.trim() ? { id: id.trim().toUpperCase() } : {}); if (id.trim().toUpperCase() === urlId) load(id); };

  return (
    <>
      <PageHero title="Track a Complaint" subtitle="Enter a complaint ID to see its public progress." />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container medium stack" style={{ gap: 20 }}>
          <form className="card row" onSubmit={submit} role="search">
            <label htmlFor="cid" className="sr-only">Complaint ID</label>
            <input id="cid" className="input" style={{ flex: 1, minWidth: 220 }} placeholder="Complaint ID, e.g. RC-ABC123" value={id} onChange={(e) => setId(e.target.value)} autoComplete="off" />
            <ButtonLoading type="submit" loading={busy} className="btn btn-primary"><Search size={16} /> Track</ButtonLoading>
          </form>
          <p className="small muted" style={{ margin: 0 }}>
            This page shows only public information. To see photographs, evidence or respond to a cleanup, {isCitizen ? <>open the complaint from your <Link to="/dashboard">dashboard</Link></> : <><Link to="/citizen/login">log in</Link> or use <Link to="/anonymous">anonymous tracking</Link> with your confirmation token</>}.
          </p>
          {busy && <Loader label="Looking up complaint…" />}
          {err && <Alert type="error">{err}</Alert>}
          {c && (
            <>
              <StatusNote status={c.status} />
              {c.status === 'AWAITING_CITIZEN_CONFIRMATION' && <Alert type="info">A cleanup has been submitted and is waiting for the reporter to confirm it.</Alert>}
              <ComplaintSummary c={c} />
              <ComplaintMap items={[c]} className="map-box short" />
              <PublicNotes notes={c.publicNotes} />
              <div className="card"><h3>Progress timeline</h3><Timeline items={c.timeline} /></div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

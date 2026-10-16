import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api } from '../services/api';
import { Alert, ButtonLoading, Field, PageHero } from '../components/ui';
import { AttemptHistory, ComplaintSummary, Media, PublicNotes, StatusNote, Timeline } from '../components/ComplaintParts';
import DecisionPanel from '../components/DecisionPanel';

export default function AnonymousTracking() {
  const [f, setF] = useState({ id: '', token: '' });
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // The token stays in component memory only: never in the URL, storage or logs.

  const open = async (e) => {
    e.preventDefault();
    const id = f.id.trim().toUpperCase();
    const token = f.token.trim();
    if (!id || !token) { setErr('Enter both the complaint ID and your confirmation token.'); return; }
    setBusy(true); setErr('');
    try { setC((await api.post(`/api/complaints/${encodeURIComponent(id)}/anonymous/view`, { token }, { auth: false })).complaint); } catch (x) { setC(null); setErr(x.status === 403 ? 'That complaint ID and token do not match. Check both and try again.' : x.message); } finally { setBusy(false); }
  };

  const base = `/api/complaints/${encodeURIComponent(f.id.trim().toUpperCase())}/anonymous`;
  const confirm = async () => (await api.post(`${base}/confirm`, { token: f.token.trim() }, { auth: false })).complaint;
  const reject = async (fd) => { fd.append('token', f.token.trim()); return (await api.postForm(`${base}/reject`, fd, { auth: false })).complaint; };

  return (
    <>
      <PageHero title="Anonymous Complaint Tracking" subtitle="Use your complaint ID and private confirmation token to see full details and answer cleanup requests." />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container medium stack" style={{ gap: 20 }}>
          {!c && (
            <form className="card" onSubmit={open} noValidate>
              {err && <Alert type="error">{err}</Alert>}
              <Field label="Complaint ID" htmlFor="aid" required><input id="aid" className="input" autoComplete="off" value={f.id} onChange={(e) => setF({ ...f, id: e.target.value })} /></Field>
              <Field label="Confirmation token" htmlFor="atoken" hint="The secret you saved when you submitted the report" required><input id="atoken" className="input mono" type="password" autoComplete="off" value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} /></Field>
              <ButtonLoading type="submit" loading={busy} className="btn btn-primary"><KeyRound size={16} /> View my complaint</ButtonLoading>
            </form>
          )}
          {c && (
            <>
              <div className="row between"><span className="chip">Private view · token verified</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setC(null); setF({ id: f.id, token: '' }); }}>Lock and exit</button></div>
              <StatusNote status={c.status} />
              <DecisionPanel complaint={c} confirm={confirm} reject={reject} onUpdated={setC} />
              <ComplaintSummary c={c} />
              <div className="card"><h3>Your original evidence</h3><div className="gallery">{c.media.map((m) => <Media key={m.url} m={m} />)}</div></div>
              <AttemptHistory attempts={c.resolutionAttempts} />
              <PublicNotes notes={c.publicNotes} />
              <div className="card"><h3>Progress timeline</h3><Timeline items={c.timeline} /></div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

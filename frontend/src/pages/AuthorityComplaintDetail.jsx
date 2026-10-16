import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bot, Upload, ArrowUpCircle, StickyNote, UserCheck, Flag } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { Alert, Async, ButtonLoading, Field, SeverityBadge, StatusBadge } from '../components/ui';
import { AiAdvisory, Media, ValidationChecks, Timeline } from '../components/ComplaintParts';
import { ComplaintMap } from '../components/MapView';
import { CATEGORY_LABEL, STATUS_META, fmtDateTime, fieldErrors } from '../utils/constants';

// Mirrors backend/utils/statusMachine.js (the server enforces it; this only limits the choices shown)
const NEXT = {
  SUBMITTED: ['UNDER_REVIEW', 'ASSIGNED'],
  UNDER_REVIEW: ['ASSIGNED', 'IN_PROGRESS'],
  ASSIGNED: ['UNDER_REVIEW', 'IN_PROGRESS'],
  REOPENED: ['ASSIGNED', 'IN_PROGRESS'],
  ESCALATED: ['ASSIGNED', 'IN_PROGRESS'],
};
const CAN_ESCALATE = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];
const CAN_SUBMIT_PROOF = ['IN_PROGRESS', 'ASSIGNED', 'REOPENED', 'ESCALATED', 'UNDER_REVIEW'];

export default function AuthorityComplaintDetail() {
  const { complaintId } = useParams();
  const { isSenior } = useAuth();
  const toast = useToast();
  const state = useFetch(() => api.get(`/api/authority/complaints/${encodeURIComponent(complaintId)}`), [complaintId]);
  const officers = useFetch(() => api.get('/api/authority/officers'), []);
  const depts = useFetch(() => api.get('/api/authority/departments'), []);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState('overview');
  const [assign, setAssign] = useState({ officerId: '', departmentId: '' });
  const [status, setStatus] = useState({ status: '', note: '' });
  const [note, setNote] = useState({ text: '', type: 'NOTE', isPublic: false });
  const [esc, setEsc] = useState('');
  const [review, setReview] = useState('');
  const [proof, setProof] = useState({ description: '', actionsTaken: '', file: null, preview: '' });
  const [proofErr, setProofErr] = useState(null);
  const fileRef = useRef(null);

  const run = async (key, fn, okMsg) => {
    setBusy(key);
    try { const r = await fn(); if (r && r.complaint) state.setData({ complaint: r.complaint }); toast.success(okMsg); return true; } catch (e) { toast.error(e.message); return false; } finally { setBusy(''); }
  };
  const base = `/api/authority/complaints/${encodeURIComponent(complaintId)}`;

  const submitProof = async (e) => {
    e.preventDefault();
    setProofErr(null);
    if (proof.description.trim().length < 10) { setProofErr({ message: 'Describe what was done (at least 10 characters).' }); return; }
    if (!proof.file) { setProofErr({ message: 'Attach the after-cleanup photograph.' }); return; }
    const fd = new FormData();
    fd.append('description', proof.description.trim());
    if (proof.actionsTaken.trim()) fd.append('actionsTaken', proof.actionsTaken.trim());
    fd.append('photo', proof.file);
    setBusy('proof');
    try {
      const r = await api.postForm(`${base}/resolution`, fd);
      state.setData({ complaint: r.complaint });
      setProof({ description: '', actionsTaken: '', file: null, preview: '' });
      toast.success('Evidence accepted. The reporter has been asked to confirm.');
      setTab('attempts');
    } catch (x) {
      setProofErr({ message: x.message, validation: x.extra && x.extra.validation, fields: fieldErrors(x) });
    } finally { setBusy(''); }
  };

  const pickPhoto = (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type) && !/\.heic$/i.test(f.name)) { setProofErr({ message: 'The evidence must be a photograph (JPG, PNG, WebP or HEIC).' }); return; }
    if (f.size > 10 * 1024 * 1024) { setProofErr({ message: 'The photograph is larger than 10 MB.' }); return; }
    setProofErr(null);
    if (proof.preview) URL.revokeObjectURL(proof.preview);
    setProof({ ...proof, file: f, preview: URL.createObjectURL(f) });
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <Link to="/authority" className="small">← Back to dashboard</Link>
      <Async state={state}>
        {({ complaint: c }) => {
          const next = NEXT[c.status] || [];
          const open = !['RESOLVED_CITIZEN_CONFIRMED', 'CLOSED_UNCONFIRMED'].includes(c.status);
          const before = c.media.find((m) => m.kind === 'image') || c.media[0];
          return (
            <>
              <div className="card">
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div><div className="mono small muted">{c.complaintId}</div><h1 style={{ fontSize: '1.7rem', marginBottom: 6 }}>{c.title}</h1></div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="chip">{CATEGORY_LABEL[c.category]}</span><SeverityBadge severity={c.severity} />
                  {c.reopenCount > 0 && <span className="chip">Reopened {c.reopenCount}×</span>}
                  {c.needsSeniorReview && <span className="chip"><Flag size={13} /> Senior review needed</span>}
                  {c.observationsSinceResolution > 0 && <span className="chip">{c.observationsSinceResolution} “still polluted” report(s) since cleanup</span>}
                </div>
                {c.escalationReason && <Alert type="warn"><strong>Escalation reason:</strong> {c.escalationReason}</Alert>}
              </div>

              <div className="tabs" role="tablist">
                {[['overview', 'Overview'], ['actions', 'Actions'], ['proof', 'Submit cleanup proof'], ['attempts', `Resolution attempts (${c.resolutionAttempts.length})`], ['history', 'History']].map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
                ))}
              </div>

              {tab === 'overview' && (
                <div className="grid cols-2" style={{ alignItems: 'start' }}>
                  <div className="card stack">
                    <p style={{ margin: 0 }}>{c.description}</p>
                    <dl className="kv">
                      <dt>Landmark</dt><dd>{c.landmark || '—'}</dd>
                      <dt>Coordinates</dt><dd className="mono">{c.location.lat.toFixed(6)}, {c.location.lng.toFixed(6)}</dd>
                      <dt>Reporter</dt><dd>{c.reporter ? `${c.reporter.name} · ${c.reporter.email}${c.reporter.phone ? ` · ${c.reporter.phone}` : ''}` : 'Anonymous'}</dd>
                      <dt>Department</dt><dd>{c.department ? c.department.name : 'Unassigned'}</dd>
                      <dt>Officer</dt><dd>{c.assignedOfficer ? c.assignedOfficer.name : 'Unassigned'}</dd>
                      <dt>Submitted</dt><dd>{fmtDateTime(c.createdAt)}</dd>
                      <dt>Updated</dt><dd>{fmtDateTime(c.updatedAt)}</dd>
                      {c.confirmationDeadline && c.status === 'AWAITING_CITIZEN_CONFIRMATION' && <><dt>Citizen deadline</dt><dd>{fmtDateTime(c.confirmationDeadline)}</dd></>}
                      <dt>Community</dt><dd>{c.observationCount} observation(s)</dd>
                    </dl>
                    {c.recentObservations.length > 0 && <div><strong className="small">Recent community observations</strong>{c.recentObservations.map((o, i) => <div key={i} className="small muted">{fmtDateTime(o.at)} · {o.type === 'STILL_POLLUTED' ? 'Still polluted' : 'Looks clean'}{o.note ? `: ${o.note}` : ''}</div>)}</div>}
                  </div>
                  <div className="stack">
                    <div className="card"><h3>Original evidence</h3><div className="gallery">{c.media.map((m) => <Media key={m.url} m={m} />)}</div></div>
                    <ComplaintMap items={[{ ...c, location: c.location }]} className="map-box short" />
                  </div>
                </div>
              )}

              {tab === 'actions' && (
                <div className="grid cols-2" style={{ alignItems: 'start' }}>
                  <div className="card stack">
                    <h3 style={{ margin: 0 }}><UserCheck size={18} style={{ verticalAlign: -3 }} /> Assign</h3>
                    <Field label="Officer" htmlFor="officer"><select id="officer" className="select" value={assign.officerId} onChange={(e) => setAssign({ ...assign, officerId: e.target.value })}><option value="">No change</option>{(officers.data ? officers.data.officers : []).map((o) => <option key={o.id} value={o.id}>{o.name}{o.department ? ` (${o.department})` : ''}</option>)}</select></Field>
                    {isSenior && <Field label="Department" htmlFor="dept"><select id="dept" className="select" value={assign.departmentId} onChange={(e) => setAssign({ ...assign, departmentId: e.target.value })}><option value="">No change</option>{(depts.data ? depts.data.departments : []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>}
                    <ButtonLoading type="button" className="btn btn-primary" loading={busy === 'assign'} disabled={!open || (!assign.officerId && !assign.departmentId)} onClick={() => run('assign', () => api.post(`${base}/assign`, { ...(assign.officerId ? { officerId: assign.officerId } : {}), ...(assign.departmentId ? { departmentId: assign.departmentId } : {}) }), 'Assignment updated.').then((ok) => ok && setAssign({ officerId: '', departmentId: '' }))}>Save assignment</ButtonLoading>
                  </div>
                  <div className="card stack">
                    <h3 style={{ margin: 0 }}>Update status</h3>
                    {next.length === 0 ? <p className="small muted" style={{ margin: 0 }}>{c.status === 'AWAITING_CITIZEN_CONFIRMATION' ? 'Waiting for the citizen’s decision. Officers cannot change this status.' : c.status === 'IN_PROGRESS' ? 'In progress. Submit cleanup proof when work is done, or escalate if blocked.' : 'No manual status change is available from the current status.'}</p> : (
                      <>
                        <Field label="New status" htmlFor="st"><select id="st" className="select" value={status.status} onChange={(e) => setStatus({ ...status, status: e.target.value })}><option value="">Choose…</option>{next.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}</select></Field>
                        <Field label="Note (optional)" htmlFor="stn"><input id="stn" className="input" maxLength={1000} value={status.note} onChange={(e) => setStatus({ ...status, note: e.target.value })} /></Field>
                        <ButtonLoading type="button" className="btn btn-primary" loading={busy === 'status'} disabled={!status.status} onClick={() => run('status', () => api.post(`${base}/status`, { status: status.status, ...(status.note.trim() ? { note: status.note.trim() } : {}) }), 'Status updated.').then((ok) => ok && setStatus({ status: '', note: '' }))}>Update status</ButtonLoading>
                      </>
                    )}
                  </div>
                  <div className="card stack">
                    <h3 style={{ margin: 0 }}><StickyNote size={18} style={{ verticalAlign: -3 }} /> Investigation note / action taken</h3>
                    <Field label="Type" htmlFor="nt"><select id="nt" className="select" value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value })}><option value="NOTE">Investigation note</option><option value="ACTION">Action taken</option></select></Field>
                    <Field label="Text" htmlFor="ntx"><textarea id="ntx" className="textarea" rows={3} maxLength={2000} value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} /></Field>
                    <label className="check"><input type="checkbox" checked={note.isPublic} onChange={(e) => setNote({ ...note, isPublic: e.target.checked })} /><span>Show this to the public on the tracking page. Do not include personal or confidential details.</span></label>
                    <ButtonLoading type="button" className="btn btn-primary" loading={busy === 'note'} disabled={note.text.trim().length < 2} onClick={() => run('note', () => api.post(`${base}/notes`, { text: note.text.trim(), type: note.type, isPublic: note.isPublic }), 'Note saved.').then((ok) => ok && setNote({ text: '', type: 'NOTE', isPublic: false }))}>Save note</ButtonLoading>
                    {c.notes.length > 0 && <div className="stack" style={{ gap: 8, marginTop: 6 }}>{c.notes.slice().reverse().map((n) => <div key={n.id} className="small" style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}><span className="muted">{fmtDateTime(n.at)} · {n.authorName} · {n.type === 'ACTION' ? 'Action' : 'Note'} · {n.isPublic ? 'Public' : 'Internal'}</span><div>{n.text}</div></div>)}</div>}
                  </div>
                  <div className="stack">
                    <div className="card stack">
                      <h3 style={{ margin: 0 }}><ArrowUpCircle size={18} style={{ verticalAlign: -3 }} /> Escalate</h3>
                      {CAN_ESCALATE.includes(c.status) ? (
                        <>
                          <Field label="Reason" htmlFor="esc" hint="Why does this need senior attention? (10+ characters)"><textarea id="esc" className="textarea" rows={2} maxLength={1000} value={esc} onChange={(e) => setEsc(e.target.value)} /></Field>
                          <ButtonLoading type="button" className="btn btn-danger" loading={busy === 'esc'} disabled={esc.trim().length < 10} onClick={() => run('esc', () => api.post(`${base}/escalate`, { reason: esc.trim() }), 'Complaint escalated.').then((ok) => ok && setEsc(''))}>Escalate to senior officers</ButtonLoading>
                        </>
                      ) : <p className="small muted" style={{ margin: 0 }}>This complaint cannot be escalated from its current status.</p>}
                    </div>
                    {isSenior && c.needsSeniorReview && (
                      <div className="card stack">
                        <h3 style={{ margin: 0 }}><Flag size={18} style={{ verticalAlign: -3 }} /> Complete senior review</h3>
                        <Field label="Review note" htmlFor="rv"><textarea id="rv" className="textarea" rows={2} maxLength={1000} value={review} onChange={(e) => setReview(e.target.value)} /></Field>
                        <ButtonLoading type="button" className="btn btn-primary" loading={busy === 'rv'} disabled={review.trim().length < 5} onClick={() => run('rv', () => api.post(`${base}/review`, { note: review.trim() }), 'Review recorded.').then((ok) => ok && setReview(''))}>Clear review flag</ButtonLoading>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'proof' && (
                <form className="card stack" onSubmit={submitProof} noValidate style={{ maxWidth: 720 }}>
                  <h3 style={{ margin: 0 }}>Submit after-cleanup proof</h3>
                  {!CAN_SUBMIT_PROOF.includes(c.status) ? (
                    <Alert type="info">{c.status === 'AWAITING_CITIZEN_CONFIRMATION' ? 'A cleanup is already waiting for the citizen’s answer.' : 'Proof cannot be submitted from the current status.'}</Alert>
                  ) : (
                    <>
                      <Alert type="info">Upload a photograph taken <strong>at the site after the cleanup</strong>, with location services on. The server compares its capture time and GPS position (within about 100 m) with the original report. Photos with missing or odd metadata are accepted but flagged for review; clearly invalid ones are rejected. These checks help reviewers but cannot prove authenticity.</Alert>
                      {proofErr && (
                        <div className="alert alert-error" role="alert"><div>
                          <strong>{proofErr.message}</strong>
                          {proofErr.validation && <div style={{ marginTop: 8 }}><ValidationChecks validation={proofErr.validation} /></div>}
                        </div></div>
                      )}
                      <Field label="What was done" htmlFor="pd" required><textarea id="pd" className="textarea" rows={3} maxLength={2000} value={proof.description} onChange={(e) => setProof({ ...proof, description: e.target.value })} placeholder="Describe the cleanup carried out" /></Field>
                      <Field label="Actions taken (optional)" htmlFor="pa"><textarea id="pa" className="textarea" rows={2} maxLength={2000} value={proof.actionsTaken} onChange={(e) => setProof({ ...proof, actionsTaken: e.target.value })} /></Field>
                      <Field label="After-cleanup photograph" required>
                        {proof.preview ? <div className="previews" style={{ gridTemplateColumns: '220px' }}><div className="preview"><img src={proof.preview} alt="After-cleanup preview" /></div></div> : null}
                        <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => fileRef.current.click()}><Upload size={16} /> {proof.file ? 'Replace photograph' : 'Choose photograph'}</button>
                        <input ref={fileRef} type="file" accept="image/*,.heic" hidden onChange={pickPhoto} />
                      </Field>
                      <ButtonLoading type="submit" className="btn btn-primary" loading={busy === 'proof'}>Submit proof and request citizen confirmation</ButtonLoading>
                    </>
                  )}
                </form>
              )}

              {tab === 'attempts' && (
                <div className="stack">
                  {c.resolutionAttempts.length === 0 && <Alert type="info">No resolution attempts yet.</Alert>}
                  {c.resolutionAttempts.map((a) => (
                    <div key={a.id} className="card stack">
                      <div className="row between"><h3 style={{ margin: 0 }}>Attempt {a.attemptNumber}</h3><span className="small muted">{fmtDateTime(a.submittedAt)}</span></div>
                      <div className="ba"><figure><figcaption>Before</figcaption><Media m={before} /></figure><figure><figcaption>After</figcaption><Media m={a.evidence} /></figure></div>
                      <p style={{ margin: 0 }}><strong>Description:</strong> {a.description}</p>
                      {a.actionsTaken && <p style={{ margin: 0 }}><strong>Actions taken:</strong> {a.actionsTaken}</p>}
                      <div><strong className="small">Evidence validation</strong><div style={{ marginTop: 6 }}><ValidationChecks validation={a.validation} /></div></div>
                      <p style={{ margin: 0 }}><strong>Citizen decision:</strong> {a.citizenDecision && a.citizenDecision.decision ? `${a.citizenDecision.decision === 'CONFIRMED' ? 'Confirmed fixed' : 'Rejected: still a problem'} on ${fmtDateTime(a.citizenDecision.decidedAt)}${a.citizenDecision.reason ? ` — “${a.citizenDecision.reason}”` : ''}` : a.closedUnconfirmedAt ? `No response; closed unconfirmed ${fmtDateTime(a.closedUnconfirmedAt)}` : `Pending (deadline ${fmtDateTime(a.confirmationDeadline)})`}</p>
                      {a.citizenDecision && a.citizenDecision.media && a.citizenDecision.media.length > 0 && <div className="gallery" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,220px))' }}>{a.citizenDecision.media.map((m) => <Media key={m.url} m={m} alt="Citizen follow-up photograph" />)}</div>}
                      <AiAdvisory ai={a.ai} />
                      <div><ButtonLoading type="button" className="btn btn-secondary btn-sm" loading={busy === `ai${a.id}`} onClick={() => run(`ai${a.id}`, () => api.post(`${base}/ai-compare`, { attemptId: a.id }), 'AI comparison finished (advisory only).')}><Bot size={15} /> {a.ai && a.ai.outcome ? 'Re-run AI comparison' : 'Run AI comparison'}</ButtonLoading> <span className="small muted">Uses the local Ollama model; the rest of the app works without it.</span></div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'history' && <div className="card"><h3>Audit history</h3><Timeline items={c.history.map((h) => ({ at: h.at, actorName: h.actorName, message: `${h.message || h.action}${h.isPublic ? '' : ' (internal)'}` }))} /></div>}
            </>
          );
        }}
      </Async>
    </div>
  );
}

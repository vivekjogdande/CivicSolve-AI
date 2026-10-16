import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, Bot, Clock } from 'lucide-react';
import { StatusBadge, SeverityBadge, Alert } from './ui';
import { mediaUrl } from '../services/api';
import { AI_LABEL, CATEGORY_LABEL, fmtDateTime, daysLeft, statusLabel } from '../utils/constants';

export function Media({ m, alt }) {
  if (!m) return null;
  return m.kind === 'video' ? <video src={mediaUrl(m.url)} controls preload="metadata" /> : <img src={mediaUrl(m.url)} alt={alt || 'Complaint photograph'} loading="lazy" />;
}

export function Timeline({ items = [] }) {
  if (!items.length) return <p className="muted small">No updates yet.</p>;
  return (
    <ol className="timeline">
      {items.map((t, i) => (
        <li key={i}>
          <div className="when">{fmtDateTime(t.at)}{t.actorName ? ` · ${t.actorName}` : ''}</div>
          <div>{t.message}</div>
        </li>
      ))}
    </ol>
  );
}

const ICON = { PASS: CheckCircle2, FAIL: XCircle, WARN: AlertTriangle, UNVERIFIABLE: HelpCircle };
export function ValidationChecks({ validation }) {
  if (!validation) return null;
  return (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 6 }}>
        <span className="badge" style={validation.status === 'VERIFIED' ? { color: '#176b3a', background: '#dcf3e4' } : { color: '#8a5a00', background: '#fdf0d5' }}>
          {validation.status === 'VERIFIED' ? 'No inconsistencies found' : 'Flagged for review'}
        </span>
        {validation.distanceMeters != null && <span className="small muted">{validation.distanceMeters} m from reported location</span>}
      </div>
      <ul className="check-list">
        {(validation.checks || []).map((c) => {
          const I = ICON[c.result] || HelpCircle;
          return <li key={c.key} className={`res-${c.result}`}><I size={16} style={{ flex: 'none', marginTop: 2 }} /><span><strong>{c.label}:</strong> <span style={{ color: 'var(--charcoal)' }}>{c.detail}</span></span></li>;
        })}
      </ul>
      {validation.flagReasons && validation.flagReasons.length > 0 && <p className="small muted" style={{ marginTop: 8 }}>Metadata can be edited or stripped, so these checks help reviewers but do not prove authenticity.</p>}
    </div>
  );
}

export function AiAdvisory({ ai }) {
  if (!ai || !ai.outcome) return null;
  const tone = ai.outcome === 'POLLUTION_REDUCED' ? 'ok' : ai.outcome === 'POLLUTION_STILL_VISIBLE' ? 'warn' : 'info';
  return (
    <div className={`alert alert-${tone}`}>
      <Bot size={18} />
      <div>
        <strong>AI image comparison (advisory only): {AI_LABEL[ai.outcome]}</strong>
        {ai.confidence && <div className="small">Confidence: {ai.confidence}</div>}
        {ai.apparentChange && <div className="small">Change: {ai.apparentChange}</div>}
        {ai.remainingWaste && <div className="small">Remaining visible waste: {ai.remainingWaste}</div>}
        {ai.recommendedAction && <div className="small">Suggested next step: {ai.recommendedAction}</div>}
        <div className="small muted">A local vision model produced this. It does not approve cleanups; the reporter decides.</div>
      </div>
    </div>
  );
}

export function Deadline({ deadline }) {
  const d = daysLeft(deadline);
  if (d === null) return null;
  return <span className="chip"><Clock size={14} /> {d === 0 ? 'Deadline passed' : `${d} day${d === 1 ? '' : 's'} left to respond`} · {fmtDateTime(deadline)}</span>;
}

/** Latest resolution attempt that is still waiting for / has received a citizen decision. */
export function BeforeAfter({ complaint, attempt }) {
  const before = (complaint.media || []).find((m) => m.kind === 'image') || (complaint.media || [])[0];
  if (!attempt) return null;
  return (
    <div className="stack">
      <div className="ba">
        <figure><figcaption>Before (reported)</figcaption><Media m={before} alt="Before cleanup" /></figure>
        <figure><figcaption>After (authority proof)</figcaption><Media m={attempt.evidence} alt="After cleanup" /></figure>
      </div>
      <p style={{ margin: 0 }}><strong>What the authority says was done:</strong> {attempt.description}</p>
    </div>
  );
}

/** Read-only summary used on every tracking page. */
export function ComplaintSummary({ c }) {
  return (
    <div className="card">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="mono small muted">{c.complaintId}</div>
          <h2 style={{ marginBottom: 6 }}>{c.title}</h2>
        </div>
        <StatusBadge status={c.status} />
      </div>
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <span className="chip">{CATEGORY_LABEL[c.category] || c.category}</span>
        <SeverityBadge severity={c.severity} />
        {c.reopenCount > 0 && <span className="chip">Reopened {c.reopenCount}×</span>}
      </div>
      <p>{c.description}</p>
      <dl className="kv">
        <dt>Landmark</dt><dd>{c.landmark || '—'}</dd>
        <dt>Location</dt><dd>{c.location.lat.toFixed(c.access === 'PUBLIC' ? 3 : 5)}, {c.location.lng.toFixed(c.access === 'PUBLIC' ? 3 : 5)}{c.access === 'PUBLIC' && ' (approximate)'}</dd>
        <dt>Department</dt><dd>{c.department || 'Not yet assigned'}</dd>
        <dt>Submitted</dt><dd>{fmtDateTime(c.createdAt)}</dd>
        <dt>Last update</dt><dd>{fmtDateTime(c.updatedAt)}</dd>
        {c.confirmationDeadline && c.status === 'AWAITING_CITIZEN_CONFIRMATION' && <><dt>Confirm by</dt><dd>{fmtDateTime(c.confirmationDeadline)}</dd></>}
      </dl>
    </div>
  );
}

export function PublicNotes({ notes = [] }) {
  if (!notes.length) return null;
  return (
    <div className="card">
      <h3>Notes from the authority</h3>
      <div className="stack">
        {notes.map((n, i) => <div key={i}><div className="small muted">{fmtDateTime(n.at)}</div>{n.text}</div>)}
      </div>
    </div>
  );
}

export function AttemptHistory({ attempts = [] }) {
  if (!attempts.length) return null;
  return (
    <div className="card">
      <h3>Resolution attempts</h3>
      <div className="stack">
        {attempts.map((a) => (
          <div key={a.id} className="card-flat" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
            <div className="row between">
              <strong>Attempt {a.attemptNumber}</strong>
              <span className="small muted">{fmtDateTime(a.submittedAt)}</span>
            </div>
            <p className="small" style={{ margin: '6px 0' }}>{a.description}</p>
            {a.evidence && <div className="gallery" style={{ gridTemplateColumns: 'minmax(160px,260px)' }}><Media m={a.evidence} alt={`Resolution evidence ${a.attemptNumber}`} /></div>}
            <p className="small" style={{ marginBottom: 0 }}>
              Outcome: {a.decision ? (a.decision.decision === 'CONFIRMED' ? 'Citizen confirmed it is fixed' : `Citizen said it is still a problem${a.decision.reason ? `: “${a.decision.reason}”` : ''}`) : a.closedUnconfirmedAt ? 'Closed without a citizen response' : 'Waiting for the citizen'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusNote({ status }) {
  if (status === 'CLOSED_UNCONFIRMED') return <Alert type="warn">This complaint was closed because no citizen response arrived before the deadline. It is <strong>not</strong> counted as a confirmed resolution.</Alert>;
  if (status === 'RESOLVED_CITIZEN_CONFIRMED') return <Alert type="ok">The reporter confirmed that the pollution was fixed.</Alert>;
  return null;
}

export { statusLabel, Link };

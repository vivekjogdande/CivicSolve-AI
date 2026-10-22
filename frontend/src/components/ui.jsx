import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, Inbox, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS_META, SEVERITY_LABEL } from '../utils/constants';

export function Spinner({ small }) {
  return <span className={`spinner ${small ? 'sm' : ''}`} role="status" aria-label="Loading" />;
}

export function Loader({ label = 'Loading…' }) {
  return (
    <div className="state" role="status">
      <Spinner />
      <p className="mt-1">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="state">
      <div className="state-icon"><Icon size={26} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="state error" role="alert">
      <div className="state-icon"><AlertCircle size={26} /></div>
      <h3>{title}</h3>
      <p>{message || 'Please try again.'}</p>
      {onRetry && <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

/** Wraps data-loading UI: shows loader / error / children. */
export function Async({ state, children, empty }) {
  if (state.loading && !state.data) return <Loader />;
  if (state.error) return <ErrorState message={state.error.message} onRetry={state.reload} />;
  if (empty && empty(state.data)) return null;
  return children(state.data);
}

export function Alert({ type = 'info', children }) {
  const Icon = { error: AlertCircle, ok: CheckCircle2, warn: TriangleAlert, info: Info }[type];
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: '#475569', bg: '#e8edf3' };
  return (
    <span className="badge" style={{ color: m.color, background: m.bg }}>
      <span className="dot" />
      {m.label}
    </span>
  );
}

const SEV_COLORS = { LOW: ['#176b3a', '#dcf3e4'], MEDIUM: ['#8a5a00', '#fdf0d5'], HIGH: ['#b04a00', '#ffe9d6'], CRITICAL: ['#b42318', '#fde8e6'] };
export function SeverityBadge({ severity }) {
  const [c, b] = SEV_COLORS[severity] || SEV_COLORS.MEDIUM;
  return <span className="badge" style={{ color: c, background: b }}>{SEVERITY_LABEL[severity] || severity}</span>;
}

export function StatCard({ icon: Icon, value, label, to, tone }) {
  const body = (
    <>
      {Icon && <span className={`icon-bubble ${tone === 'river' || tone === 'civic' ? 'civic' : ''}`}><Icon size={22} /></span>}
      <div>
        <div className="num">{value}</div>
        <div className="lbl">{label}</div>
      </div>
    </>
  );
  return to ? <Link to={to} className="stat-card link">{body}</Link> : <div className="stat-card">{body}</div>;
}

export function Field({ label, error, hint, htmlFor, children, required }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}{required && <span aria-hidden="true" style={{ color: 'var(--danger)' }}> *</span>}</label>}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error-text" role="alert">{error}</span>}
    </div>
  );
}

export function Pagination({ page, pages, total, onChange }) {
  if (!total) return null;
  return (
    <div className="pagination">
      <span className="small muted">{total} result{total === 1 ? '' : 's'} · page {page} of {pages || 1}</span>
      <div className="row" style={{ gap: 6 }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /> Prev</button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">Next <ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHero({ title, subtitle, children }) {
  return (
    <div className="page-hero">
      <div className="container">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function ButtonLoading({ loading, children, ...rest }) {
  return (
    <button {...rest} disabled={loading || rest.disabled} className={`${rest.className || 'btn btn-primary'} ${loading ? 'is-loading' : ''}`}>
      {loading && <span className="spinner sm" aria-hidden="true" />}
      {children}
    </button>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Activity, Hourglass, CheckCircle2, RotateCcw, FilePlus2, Search, Map } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { Async, StatCard, StatusBadge, Pagination, EmptyState, Loader, ErrorState, Alert } from '../components/ui';
import { CATEGORY_LABEL, STATUS_META, fmtDate, daysLeft } from '../utils/constants';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const sum = useFetch(() => api.get('/api/complaints/mine/summary'), []);
  const list = useFetch(() => api.get('/api/complaints/mine', { page, limit: 8, status }), [page, status]);
  const awaiting = list.data ? list.data.items.filter((c) => c.status === 'AWAITING_CITIZEN_CONFIRMATION') : [];

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div><h1 style={{ fontSize: '1.9rem', marginBottom: 4 }}>Welcome, {user.name.split(' ')[0]}</h1><p className="muted" style={{ margin: 0 }}>Here is where your complaints stand.</p></div>

      {sum.error ? <ErrorState message={sum.error.message} onRetry={sum.reload} /> : (
        <div className="grid cols-4">
          <StatCard icon={FileText} value={sum.data ? sum.data.total : '…'} label="Complaints submitted" />
          <StatCard icon={Activity} value={sum.data ? sum.data.inProgress : '…'} label="In progress" tone="civic" />
          <StatCard icon={Hourglass} value={sum.data ? sum.data.awaitingConfirmation : '…'} label="Awaiting your confirmation" />
          <StatCard icon={CheckCircle2} value={sum.data ? sum.data.confirmed : '…'} label="Citizen-confirmed resolutions" tone="civic" />
          <StatCard icon={RotateCcw} value={sum.data ? sum.data.reopened : '…'} label="Reopened" />
        </div>
      )}

      {sum.data && sum.data.awaitingConfirmation > 0 && (
        <Alert type="warn"><strong>{sum.data.awaitingConfirmation} resolution{sum.data.awaitingConfirmation === 1 ? ' is' : 's are'} waiting for your verification.</strong> Please inspect the before and after evidence and record your decision before the deadline.{awaiting.length > 0 && <> <Link to={`/complaints/${awaiting[0].complaintId}/confirm`}>Review now →</Link></>}</Alert>
      )}

      <div className="row">
        <Link to="/report" className="btn btn-primary" style={{ background: 'var(--teal-600)' }}><FilePlus2 size={16} /> Report a Problem</Link>
        <Link to="/track" className="btn btn-secondary"><Search size={16} /> Track a Grievance</Link>
        <Link to="/map" className="btn btn-secondary"><Map size={16} /> View Civic Map</Link>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Your reported civic issues</h3>
          <select className="select" style={{ width: 'auto' }} aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>{Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
        {list.loading && !list.data ? <Loader /> : list.error ? <ErrorState message={list.error.message} onRetry={list.reload} /> : list.data.items.length === 0 ? (
          <EmptyState title={status ? 'No issues with this status' : 'You have not reported any civic issues yet'} action={!status && <Link to="/report" className="btn btn-primary btn-sm">Report a Problem</Link>}>Issues you report while logged in will appear here with live tracking.</EmptyState>
        ) : (
          <>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>ID</th><th>Category</th><th>Location</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{list.data.items.map((c) => (
                <tr key={c.complaintId}>
                  <td className="mono">{c.complaintId}</td>
                  <td>{CATEGORY_LABEL[c.category]}</td>
                  <td>{c.landmark || 'Pinned on map'}</td>
                  <td>{fmtDate(c.createdAt)}</td>
                  <td><StatusBadge status={c.status} />{c.confirmationDeadline && <div className="small muted">{daysLeft(c.confirmationDeadline)} day(s) left</div>}</td>
                  <td>{c.status === 'AWAITING_CITIZEN_CONFIRMATION' ? <Link className="btn btn-primary btn-sm" to={`/complaints/${c.complaintId}/confirm`}>Verify</Link> : <Link className="btn btn-secondary btn-sm" to={`/complaints/${c.complaintId}`}>View details</Link>}</td>
                </tr>
              ))}</tbody>
            </table></div>
            <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

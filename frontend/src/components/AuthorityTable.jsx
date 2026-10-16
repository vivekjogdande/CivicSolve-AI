import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Flag } from 'lucide-react';
import { api } from '../services/api';
import { useFetch, useDebounced } from '../hooks/useFetch';
import { EmptyState, ErrorState, Loader, Pagination, SeverityBadge, StatusBadge } from './ui';
import { CATEGORY_OPTIONS, CATEGORY_LABEL, SEVERITY_OPTIONS, STATUS_META, fmtDate } from '../utils/constants';

/** Searchable, filterable, sortable, paginated complaint table for officers. `endpoint` picks the queue. */
export default function AuthorityTable({ endpoint = '/api/authority/complaints', showMine = true, refreshKey }) {
  const [q, setQ] = useState({ search: '', status: '', category: '', severity: '', mine: false, sort: 'createdAt', order: 'desc', page: 1 });
  const search = useDebounced(q.search);
  const state = useFetch(
    () => api.get(endpoint, { search, status: q.status, category: q.category, severity: q.severity, mine: q.mine ? 'true' : '', sort: q.sort, order: q.order, page: q.page, limit: 10 }),
    [endpoint, search, q.status, q.category, q.severity, q.mine, q.sort, q.order, q.page, refreshKey]
  );
  const set = (k) => (e) => setQ({ ...q, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value, page: 1 });
  const sortBy = (k) => setQ({ ...q, sort: k, order: q.sort === k && q.order === 'desc' ? 'asc' : 'desc', page: 1 });
  const Th = ({ k, children }) => (
    <th className="sortable" aria-sort={q.sort === k ? (q.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => sortBy(k)} style={{ all: 'inherit', cursor: 'pointer', padding: 0 }}>{children}{q.sort === k && (q.order === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}</button>
    </th>
  );

  return (
    <div className="card">
      <div className="toolbar">
        <input className="input grow" type="search" aria-label="Search complaints" placeholder="Search ID, title, landmark or description…" value={q.search} onChange={set('search')} />
        <select className="select" aria-label="Status" value={q.status} onChange={set('status')}><option value="">All statuses</option>{Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select>
        <select className="select" aria-label="Category" value={q.category} onChange={set('category')}><option value="">All categories</option>{CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        <select className="select" aria-label="Severity" value={q.severity} onChange={set('severity')}><option value="">All severities</option>{SEVERITY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        {showMine && <label className="check" style={{ alignItems: 'center' }}><input type="checkbox" checked={q.mine} onChange={set('mine')} style={{ marginTop: 0 }} /> Assigned to me</label>}
      </div>
      {state.loading && !state.data ? <Loader /> : state.error ? <ErrorState message={state.error.message} onRetry={state.reload} /> : state.data.items.length === 0 ? (
        <EmptyState title="No complaints match">Adjust the filters or search term.</EmptyState>
      ) : (
        <>
          <div className="table-wrap" style={{ opacity: state.loading ? 0.6 : 1 }}><table className="table">
            <thead><tr><Th k="createdAt">Submitted</Th><th>ID</th><th>Title</th><Th k="category">Category</Th><th>Severity</th><Th k="status">Status</Th><th>Department / Officer</th><Th k="updatedAt">Updated</Th></tr></thead>
            <tbody>{state.data.items.map((c) => (
              <tr key={c.complaintId}>
                <td>{fmtDate(c.createdAt)}</td>
                <td><Link className="mono" to={`/authority/complaints/${c.complaintId}`}>{c.complaintId}</Link></td>
                <td style={{ maxWidth: 240 }}>{c.title}{c.needsSeniorReview && <span className="chip" style={{ marginLeft: 6 }}><Flag size={12} /> Review</span>}{c.reopenCount > 0 && <span className="small muted"> · reopened {c.reopenCount}×</span>}</td>
                <td>{CATEGORY_LABEL[c.category]}</td>
                <td><SeverityBadge severity={c.severity} /></td>
                <td><StatusBadge status={c.status} /></td>
                <td className="small">{c.department || '—'}<div className="muted">{c.assignedOfficer || 'Unassigned'}</div></td>
                <td>{fmtDate(c.updatedAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <Pagination page={state.data.page} pages={state.data.pages} total={state.data.total} onChange={(p) => setQ({ ...q, page: p })} />
        </>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { Inbox, Clock, Wrench, Hourglass, CheckCircle2, RotateCcw, XCircle, ArrowUpCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { StatCard, ErrorState } from '../components/ui';
import AuthorityTable from '../components/AuthorityTable';
import { CATEGORY_LABEL } from '../utils/constants';

export default function AuthorityDashboard() {
  const { user, isSenior } = useAuth();
  const sum = useFetch(() => api.get('/api/authority/summary'), []);
  const charts = useFetch(() => api.get('/api/authority/charts'), []);
  const s = sum.data;
  const v = (k) => (s ? s[k] : '…');
  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="row between">
        <div><h1 style={{ fontSize: '1.9rem', marginBottom: 4 }}>Authority dashboard</h1><p className="muted" style={{ margin: 0 }}>{isSenior ? 'All complaints across departments.' : 'Complaints routed to your department or assigned to you.'}</p></div>
        {isSenior && <Link to="/authority/senior" className="btn btn-secondary">Senior officer view</Link>}
      </div>
      {sum.error ? <ErrorState message={sum.error.message} onRetry={sum.reload} /> : (
        <div className="grid cols-4">
          <StatCard icon={Inbox} value={v('totalAssigned')} label="Total assigned" />
          <StatCard icon={Clock} value={v('pending')} label="Pending (new / under review)" tone="civic" />
          <StatCard icon={Wrench} value={v('inProgress')} label="In progress" />
          <StatCard icon={Hourglass} value={v('awaitingConfirmation')} label="Awaiting citizen confirmation" tone="civic" />
          <StatCard icon={CheckCircle2} value={v('confirmed')} label="Citizen-confirmed resolutions" />
          <StatCard icon={RotateCcw} value={v('reopened')} label="Reopened" tone="civic" />
          <StatCard icon={XCircle} value={v('closedUnconfirmed')} label="Closed unconfirmed" />
          <StatCard icon={ArrowUpCircle} value={v('escalated')} label="Escalated" tone="civic" />
        </div>
      )}
      <div className="grid cols-2">
        <div className="chart-card"><h3>Complaints by category</h3>
          {charts.data && charts.data.byCategory.length ? <div className="chart-box"><ResponsiveContainer><BarChart data={charts.data.byCategory.map((r) => ({ name: CATEGORY_LABEL[r.category] || r.category, count: r.count }))} layout="vertical" margin={{ left: 20 }}><CartesianGrid stroke="#e4e0d3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="count" name="Complaints" fill="#0b192c" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div> : <p className="muted small" style={{ padding: 30, textAlign: 'center' }}>{charts.loading ? 'Loading…' : 'No data yet.'}</p>}
        </div>
        <div className="chart-card"><h3>Complaints received per month</h3>
          {charts.data && charts.data.byMonth.length ? <div className="chart-box"><ResponsiveContainer><LineChart data={charts.data.byMonth}><CartesianGrid stroke="#e4e0d3" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="count" name="Complaints" stroke="#0d9488" strokeWidth={2} dot /></LineChart></ResponsiveContainer></div> : <p className="muted small" style={{ padding: 30, textAlign: 'center' }}>{charts.loading ? 'Loading…' : 'No data yet.'}</p>}
        </div>
      </div>
      <h2 style={{ marginBottom: 0 }}>Complaint management</h2>
      <AuthorityTable />
      <p className="small muted">Signed in as {user.email}. Officers cannot mark a complaint as citizen-confirmed; only the reporter can.</p>
    </div>
  );
}

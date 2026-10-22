import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Async, PageHero, EmptyState } from '../components/ui';
import { CATEGORY_LABEL, STATUS_META, fmtDate } from '../utils/constants';
import { BarChart3, Download } from 'lucide-react';

const NAVY = '#0b192c';
const TEAL = '#0d9488';
const SLATE = '#64748b';

const Rate = ({ title, r }) => (
  <div className="metric">
    <div className="small muted">{title}</div>
    <div className="big">{r.value === null ? '—' : `${r.value}%`}</div>
    <div className="small muted">{r.numerator} of {r.denominator} {r.denominator === 1 ? 'complaint' : 'complaints'}</div>
    <details><summary>How is this calculated?</summary><p style={{ margin: '6px 0 0' }}>{r.definition}</p></details>
  </div>
);

function ChartCard({ title, children, empty }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {empty ? <div className="state" style={{ padding: 30 }}><p className="muted small">No data for this period yet.</p></div> : <div className="chart-box">{children}</div>}
    </div>
  );
}

export default function Transparency() {
  const [range, setRange] = useState({ from: '', to: '' });
  const state = useFetch(() => api.get('/api/public/transparency', { from: range.from, to: range.to ? `${range.to}T23:59:59.999Z` : '' }, { auth: false }), [range.from, range.to]);

  const exportCsv = (d) => {
    if (!d) return;
    let csv = 'CivicSolve AI — Public Transparency & Municipal Performance Metrics\n';
    csv += `Period: ${d.period.from || 'start'} to ${d.period.to || 'today'}\n\n`;
    csv += 'Key Rates,Value\n';
    csv += `Citizen-Confirmed Resolution Rate,${d.rates?.confirmationRate?.value ?? 'N/A'}%\n`;
    csv += `Reopen Rate,${d.rates?.reopenRate?.value ?? 'N/A'}%\n`;
    csv += `Unconfirmed Closure Rate,${d.rates?.unconfirmedClosureRate?.value ?? 'N/A'}%\n\n`;
    csv += 'Department,Total Complaints,Open,Citizen Confirmed,Ever Reopened,Closed Unconfirmed,Avg Days to Confirmed\n';
    (d.byDepartment || []).forEach((r) => {
      csv += `"${r.department}",${r.total},${r.open},${r.confirmed},${r.reopened},${r.closedUnconfirmed},${r.avgResolutionDays ?? 'N/A'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civicsolve-transparency-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHero
        title="Community Impact & Transparency"
        subtitle="Public, aggregated municipal figures calculated live from real database records. Transparent resolution rates, rework percentages, and department response times."
      />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <label className="small muted" style={{ alignSelf: 'center' }}>Reporting period:</label>
              <input type="date" className="input" aria-label="From date" value={range.from} max={range.to || undefined} onChange={(e) => setRange({ ...range, from: e.target.value })} />
              <input type="date" className="input" aria-label="To date" value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, to: e.target.value })} />
              {(range.from || range.to) && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRange({ from: '', to: '' })}>All time</button>}
            </div>
            {state.data && state.data.totalComplaints > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => exportCsv(state.data)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={15} /> Export CSV Report
              </button>
            )}
          </div>
          <Async state={state}>
            {(d) => d.totalComplaints === 0 ? (
              <EmptyState icon={BarChart3} title="No complaints in this period">Figures will appear as soon as complaints are submitted.</EmptyState>
            ) : (
              <div className="stack" style={{ gap: 24 }}>
                <p className="small muted" style={{ margin: 0 }}>
                  {d.totalComplaints} complaint{d.totalComplaints === 1 ? '' : 's'} · period: {d.period.from ? fmtDate(d.period.from) : 'start'} to {d.period.to ? fmtDate(d.period.to) : 'today'}. {d.period.basis}
                </p>
                <div className="grid cols-3">
                  <Rate title="Citizen-confirmed resolution rate" r={d.rates.confirmationRate} />
                  <Rate title="Reopen rate" r={d.rates.reopenRate} />
                  <Rate title="Unconfirmed closure rate" r={d.rates.unconfirmedClosureRate} />
                </div>
                <div className="grid cols-2">
                  <ChartCard title="Reports by civic category" empty={!d.byCategory.length}>
                    <ResponsiveContainer><BarChart data={d.byCategory.map((r) => ({ name: CATEGORY_LABEL[r.category] || r.category, count: r.count }))} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid stroke="#e4e0d3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="count" name="Reports" fill={NAVY} radius={[0, 4, 4, 0]} />
                    </BarChart></ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Complaint status distribution" empty={!d.byStatus.length}>
                    <ResponsiveContainer><PieChart>
                      <Pie data={d.byStatus.map((r) => ({ name: (STATUS_META[r.status] || {}).label || r.status, value: r.count, key: r.status }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={95} paddingAngle={2}>
                        {d.byStatus.map((r) => <Cell key={r.status} fill={(STATUS_META[r.status] || {}).color || SLATE} />)}
                      </Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart></ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Reports by location (landmark)" empty={!d.byLocation.length}>
                    <ResponsiveContainer><BarChart data={d.byLocation.map((r) => ({ name: r.location, count: r.count }))} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid stroke="#e4e0d3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="count" name="Reports" fill={TEAL} radius={[0, 4, 4, 0]} />
                    </BarChart></ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Reported vs citizen-confirmed, by month" empty={!d.trend.length}>
                    <ResponsiveContainer><LineChart data={d.trend}>
                      <CartesianGrid stroke="#e4e0d3" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="reported" name="Reported" stroke={TEAL} strokeWidth={2} dot /><Line type="monotone" dataKey="confirmed" name="Citizen-confirmed" stroke={NAVY} strokeWidth={2} dot />
                    </LineChart></ResponsiveContainer>
                  </ChartCard>
                </div>
                <div className="card">
                  <h3>Department-wise performance</h3>
                  {d.byDepartment.length === 0 ? <p className="muted small">No complaints have been routed to a department in this period.</p> : (
                    <div className="table-wrap"><table className="table">
                      <thead><tr><th>Department</th><th>Total</th><th>Open</th><th>Citizen-confirmed</th><th>Ever reopened</th><th>Closed unconfirmed</th><th>Avg days to confirmed</th></tr></thead>
                      <tbody>{d.byDepartment.map((r) => (
                        <tr key={r.department}><td>{r.department}</td><td>{r.total}</td><td>{r.open}</td><td>{r.confirmed}</td><td>{r.reopened}</td><td>{r.closedUnconfirmed}</td><td>{r.avgResolutionDays === null ? '—' : r.avgResolutionDays}</td></tr>
                      ))}</tbody>
                    </table></div>
                  )}
                </div>
              </div>
            )}
          </Async>
        </div>
      </section>
    </>
  );
}

import { useState } from 'react';
import { Users, Landmark, FileText, Building2, UserPlus, KeyRound } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { Alert, Async, ButtonLoading, EmptyState, Field, Modal, StatCard } from '../components/ui';
import { ROLE_LABEL, fmtDateTime, fieldErrors, EMAIL_RE } from '../utils/constants';

const pwOk = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

function NewOfficer({ open, onClose, depts, onDone }) {
  const toast = useToast();
  const blank = { name: '', email: '', phone: '', password: '', role: 'OFFICER', department: '' };
  const [f, setF] = useState(blank);
  const [errs, setErrs] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter a name';
    if (!EMAIL_RE.test(f.email)) er.email = 'Enter a valid email';
    if (!pwOk(f.password)) er.password = 'At least 8 characters, with a letter and a number';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.post('/api/admin/users', { name: f.name.trim(), email: f.email.trim(), password: f.password, role: f.role, ...(f.phone.trim() ? { phone: f.phone.trim() } : {}), ...(f.department ? { department: f.department } : {}) });
      toast.success('Authority account created.');
      setF(blank); onDone(); onClose();
    } catch (x) { setErrs(fieldErrors(x)); setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Create authority account">
      <form onSubmit={submit} noValidate>
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Full name" htmlFor="an" error={errs.name} required><input id="an" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Official email" htmlFor="ae" error={errs.email} required><input id="ae" type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Phone (optional)" htmlFor="ap" error={errs.phone}><input id="ap" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <div className="form-grid">
          <Field label="Role" htmlFor="ar"><select id="ar" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="OFFICER">Officer</option><option value="SENIOR_OFFICER">Senior officer</option></select></Field>
          <Field label="Department" htmlFor="ad"><select id="ad" className="select" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}><option value="">None</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        </div>
        <Field label="Temporary password" htmlFor="apw" error={errs.password} hint="Share it securely; ask the officer to change it after first login" required><input id="apw" type="password" autoComplete="new-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><ButtonLoading type="submit" loading={busy}>Create account</ButtonLoading></div>
      </form>
    </Modal>
  );
}

function ResetPassword({ user, onClose }) {
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!pwOk(pw)) { setErr('At least 8 characters, with a letter and a number'); return; }
    setBusy(true);
    try { await api.post(`/api/admin/users/${user.id}/reset-password`, { newPassword: pw }); toast.success('Password reset.'); setPw(''); onClose(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!user} onClose={onClose} title={user ? `Reset password: ${user.name}` : ''}>
      <form onSubmit={submit} noValidate>
        {err && <Alert type="error">{err}</Alert>}
        <Field label="New password" htmlFor="rp" required><input id="rp" type="password" autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><ButtonLoading type="submit" loading={busy}>Reset password</ButtonLoading></div>
      </form>
    </Modal>
  );
}

function Officers() {
  const toast = useToast();
  const users = useFetch(() => api.get('/api/admin/users'), []);
  const depts = useFetch(() => api.get('/api/admin/departments'), []);
  const [creating, setCreating] = useState(false);
  const [reset, setReset] = useState(null);
  const update = async (u, body, msg) => { try { await api.patch(`/api/admin/users/${u.id}`, body); toast.success(msg); users.reload(); } catch (e) { toast.error(e.message); } };
  const list = depts.data ? depts.data.departments.filter((d) => d.isActive) : [];
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}><h3 style={{ margin: 0 }}>Authority accounts</h3><button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><UserPlus size={15} /> New account</button></div>
      <Async state={users}>
        {(d) => d.users.length === 0 ? <EmptyState title="No authority accounts yet">Create the first officer account.</EmptyState> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Last login</th><th>Active</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{d.users.map((u) => {
              const isAdmin = u.role === 'ADMIN';
              return (
                <tr key={u.id}>
                  <td>{u.name}</td><td>{u.email}</td>
                  <td>{isAdmin ? ROLE_LABEL.ADMIN : <select className="select" style={{ padding: '4px 8px' }} aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => update(u, { role: e.target.value }, 'Role updated.')}><option value="OFFICER">Officer</option><option value="SENIOR_OFFICER">Senior officer</option></select>}</td>
                  <td>{isAdmin ? '—' : <select className="select" style={{ padding: '4px 8px' }} aria-label={`Department for ${u.name}`} value={(u.department && (u.department._id || u.department.id || u.department)) || ''} onChange={(e) => e.target.value && update(u, { department: e.target.value }, 'Department updated.')}><option value="">None</option>{list.map((d2) => <option key={d2.id} value={d2.id}>{d2.name}</option>)}</select>}</td>
                  <td className="small">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Never'}</td>
                  <td>{isAdmin ? 'Yes' : <label className="check" style={{ alignItems: 'center' }}><input type="checkbox" style={{ marginTop: 0 }} checked={u.isActive} aria-label={`Active: ${u.name}`} onChange={(e) => update(u, { isActive: e.target.checked }, e.target.checked ? 'Account enabled.' : 'Account disabled.')} /></label>}</td>
                  <td>{!isAdmin && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReset(u)}><KeyRound size={14} /> Reset password</button>}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </Async>
      <NewOfficer open={creating} onClose={() => setCreating(false)} depts={list} onDone={users.reload} />
      <ResetPassword user={reset} onClose={() => setReset(null)} />
    </div>
  );
}

function Departments() {
  const toast = useToast();
  const state = useFetch(() => api.get('/api/admin/departments'), []);
  const [f, setF] = useState({ name: '', code: '', description: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.name.trim().length < 3 || !/^[A-Za-z0-9_]{2,20}$/.test(f.code.trim())) { setErr('Enter a name (3+ characters) and a code of 2-20 letters, numbers or underscores.'); return; }
    setBusy(true);
    try { await api.post('/api/admin/departments', { name: f.name.trim(), code: f.code.trim(), ...(f.description.trim() ? { description: f.description.trim() } : {}) }); toast.success('Department created.'); setF({ name: '', code: '', description: '' }); state.reload(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="grid cols-2" style={{ alignItems: 'start' }}>
      <div className="card"><h3>Departments</h3>
        <Async state={state}>{(d) => <ul style={{ paddingLeft: 18, margin: 0 }}>{d.departments.map((x) => <li key={x.id} style={{ marginBottom: 8 }}><strong>{x.name}</strong> <span className="chip">{x.code}</span>{!x.isActive && <span className="chip">inactive</span>}<div className="small muted">{x.description}</div></li>)}</ul>}</Async>
      </div>
      <form className="card" onSubmit={submit} noValidate><h3>Add department</h3>
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Name" htmlFor="dn" required><input id="dn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Code" htmlFor="dc" hint="Letters, numbers and underscores" required><input id="dc" className="input" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="Description (optional)" htmlFor="dd"><input id="dd" className="input" maxLength={300} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <ButtonLoading type="submit" loading={busy}>Create department</ButtonLoading>
      </form>
    </div>
  );
}

function Activity() {
  const state = useFetch(() => api.get('/api/admin/overview'), []);
  return (
    <Async state={state}>
      {(d) => (
        <div className="stack" style={{ gap: 18 }}>
          <div className="grid cols-4">
            <StatCard icon={Users} value={d.counts.citizens} label="Citizens" />
            <StatCard icon={Landmark} value={d.counts.authorities} label="Authority accounts" tone="civic" />
            <StatCard icon={FileText} value={d.counts.complaints} label="Complaints" />
            <StatCard icon={Building2} value={d.counts.departments} label="Active departments" tone="civic" />
          </div>
          <div className="card"><h3>Recent activity (audit log)</h3>
            {d.recentActivity.length === 0 ? <p className="muted small">No activity yet.</p> : (
              <div className="table-wrap"><table className="table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Complaint</th><th>Detail</th></tr></thead>
                <tbody>{d.recentActivity.map((a, i) => <tr key={i}><td className="small">{fmtDateTime(a.at)}</td><td>{a.actorName || a.actorType}</td><td className="small mono">{a.action}</td><td className="mono">{a.complaintId || '—'}</td><td className="small">{a.message}</td></tr>)}</tbody></table></div>
            )}
          </div>
        </div>
      )}
    </Async>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div><h1 style={{ fontSize: '1.9rem', marginBottom: 4 }}>Administration</h1><p className="muted" style={{ margin: 0 }}>Authority accounts are created here and nowhere else. Registration can never grant authority access.</p></div>
      <div className="tabs" role="tablist">{[['overview', 'Overview & audit log'], ['officers', 'Authority accounts'], ['departments', 'Departments']].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'overview' && <Activity />}
      {tab === 'officers' && <Officers />}
      {tab === 'departments' && <Departments />}
    </div>
  );
}

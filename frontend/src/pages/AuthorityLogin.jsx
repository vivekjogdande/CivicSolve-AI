import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { Alert, ButtonLoading, Field } from '../components/ui';
import { useAuth, homeFor } from '../context/AuthContext';
import { EMAIL_RE } from '../utils/constants';

export default function AuthorityLogin() {
  const { loginAuthority } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [errs, setErrs] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    setErr('');
    const e = {};
    if (!EMAIL_RE.test(f.email)) e.email = 'Enter your official email address';
    if (!f.password) e.password = 'Enter your password';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const u = await loginAuthority(f.email, f.password);
      const from = loc.state && loc.state.from && (loc.state.from.startsWith('/authority') || loc.state.from.startsWith('/admin')) ? loc.state.from : homeFor(u.role);
      navigate(from, { replace: true });
    } catch (x) {
      if (x.status === 404) {
        setErr('Authority authentication endpoint not found (404). Please ensure the backend is running and the API URL is configured correctly.');
      } else if (x.status === 401) {
        setErr(x.message || 'Incorrect email or password for the authority portal.');
      } else {
        setErr(x.message || 'Unable to sign in. Please verify your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell authority title="Authority sign-in" subtitle="For officers and administrators of municipal and civic departments." aside={{ title: 'Investigate. Resolve. Prove it.', text: 'Manage assigned grievances, record actions, and submit verified resolution evidence for citizens to confirm.' }}>
      <div className="row" style={{ marginBottom: 12 }}><span className="chip"><Landmark size={14} /> Official use</span></div>
      <form onSubmit={submit} noValidate>
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Official email" htmlFor="email" error={errs.email}><input id="email" type="email" className={`input ${errs.email ? 'invalid' : ''}`} autoComplete="username" value={f.email} onChange={(e) => { setF({ ...f, email: e.target.value }); if (err) setErr(''); }} /></Field>
        <Field label="Password" htmlFor="password" error={errs.password}><input id="password" type="password" className={`input ${errs.password ? 'invalid' : ''}`} autoComplete="current-password" value={f.password} onChange={(e) => { setF({ ...f, password: e.target.value }); if (err) setErr(''); }} /></Field>
        <ButtonLoading type="submit" loading={busy} className="btn btn-primary btn-block btn-lg" style={{ background: 'var(--teal-600)', borderColor: 'var(--teal-500)' }}>Sign in</ButtonLoading>
      </form>
      <p className="small muted" style={{ marginTop: 16 }}>Authority accounts are created by a CivicSolve AI administrator and cannot be self-registered. Contact your department administrator for access.</p>
      <p className="small"><Link to="/portals">Back to portal selection</Link></p>
    </AuthShell>
  );
}

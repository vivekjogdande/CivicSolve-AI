import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { Alert, ButtonLoading, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { EMAIL_RE } from '../utils/constants';

export default function CitizenLogin() {
  const { loginCitizen } = useAuth();
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
    if (!EMAIL_RE.test(f.email)) e.email = 'Enter a valid email address';
    if (!f.password) e.password = 'Enter your password';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await loginCitizen(f.email, f.password);
      const from = loc.state && loc.state.from && !loc.state.from.startsWith('/authority') && !loc.state.from.startsWith('/admin') ? loc.state.from : '/dashboard';
      navigate(from, { replace: true });
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Citizen login" subtitle="Welcome back. Log in to follow your complaints." aside={{ title: 'Every complaint deserves an answer', text: 'Track progress, see the cleanup proof, and have the final say on whether the river is really clean.' }}>
      <form onSubmit={submit} noValidate>
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Email" htmlFor="email" error={errs.email}><input id="email" type="email" className={`input ${errs.email ? 'invalid' : ''}`} autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password" htmlFor="password" error={errs.password}><input id="password" type="password" className={`input ${errs.password ? 'invalid' : ''}`} autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <ButtonLoading type="submit" loading={busy} className="btn btn-primary btn-block btn-lg">Log in</ButtonLoading>
      </form>
      <p className="small" style={{ marginTop: 16 }}>New here? <Link to="/citizen/register">Create an account</Link> · <Link to="/report">Report anonymously</Link></p>
      <p className="small muted">Officer? Use the <Link to="/authority/login">authority login</Link>.</p>
    </AuthShell>
  );
}

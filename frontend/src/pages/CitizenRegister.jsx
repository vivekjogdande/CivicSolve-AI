import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { Alert, ButtonLoading, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { EMAIL_RE, fieldErrors } from '../utils/constants';

export default function CitizenRegister() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errs, setErrs] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name';
    if (!EMAIL_RE.test(f.email)) e.email = 'Enter a valid email address';
    if (f.phone && !/^[+\d][\d\s-]{6,17}$/.test(f.phone)) e.phone = 'Enter a valid phone number or leave it blank';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'At least 8 characters, with a letter and a number';
    if (f.password !== f.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setErr('');
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = { name: f.name, email: f.email, password: f.password, confirmPassword: f.confirmPassword };
      if (f.phone.trim()) body.phone = f.phone.trim();
      await register(body);
      navigate('/dashboard', { replace: true });
    } catch (x) {
      setErrs(fieldErrors(x));
      setErr(x.message);
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your citizen account" subtitle="Track every complaint you file and confirm civic repairs." aside={{ title: 'Your reports, in one place', text: 'With an account you can follow complaints from your dashboard and confirm or dispute resolution proof. You can still report anonymously without an account.' }}>
      <form onSubmit={submit} noValidate>
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Full name" htmlFor="name" error={errs.name} required><input id="name" className={`input ${errs.name ? 'invalid' : ''}`} autoComplete="name" value={f.name} onChange={on('name')} /></Field>
        <Field label="Email" htmlFor="email" error={errs.email} required><input id="email" type="email" className={`input ${errs.email ? 'invalid' : ''}`} autoComplete="email" value={f.email} onChange={on('email')} /></Field>
        <Field label="Phone (optional)" htmlFor="phone" error={errs.phone}><input id="phone" type="tel" className={`input ${errs.phone ? 'invalid' : ''}`} autoComplete="tel" value={f.phone} onChange={on('phone')} /></Field>
        <Field label="Password" htmlFor="password" error={errs.password} hint="At least 8 characters, with a letter and a number" required><input id="password" type="password" className={`input ${errs.password ? 'invalid' : ''}`} autoComplete="new-password" value={f.password} onChange={on('password')} /></Field>
        <Field label="Confirm password" htmlFor="confirm" error={errs.confirmPassword} required><input id="confirm" type="password" className={`input ${errs.confirmPassword ? 'invalid' : ''}`} autoComplete="new-password" value={f.confirmPassword} onChange={on('confirmPassword')} /></Field>
        <ButtonLoading type="submit" loading={busy} className="btn btn-primary btn-block btn-lg">Create account</ButtonLoading>
      </form>
      <p className="small" style={{ marginTop: 16 }}>Already registered? <Link to="/citizen/login">Log in</Link> · <Link to="/portals">Other portals</Link></p>
    </AuthShell>
  );
}

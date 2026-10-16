import { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, ButtonLoading, Field } from '../components/ui';
import { ROLE_LABEL, fieldErrors } from '../utils/constants';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [p, setP] = useState({ name: user.name, phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pe, setPe] = useState({});
  const [we, setWe] = useState({});
  const [perr, setPerr] = useState('');
  const [werr, setWerr] = useState('');
  const [b1, setB1] = useState(false);
  const [b2, setB2] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault(); setPerr('');
    const er = {};
    if (p.name.trim().length < 2) er.name = 'Enter your name';
    setPe(er);
    if (Object.keys(er).length) return;
    setB1(true);
    try {
      const r = await api.patch('/api/auth/me', { name: p.name.trim(), ...(p.phone.trim() ? { phone: p.phone.trim() } : {}) });
      setUser(r.user);
      toast.success('Profile updated.');
    } catch (x) { setPe(fieldErrors(x)); setPerr(x.message); } finally { setB1(false); }
  };

  const changePw = async (e) => {
    e.preventDefault(); setWerr('');
    const er = {};
    if (!pw.currentPassword) er.currentPassword = 'Enter your current password';
    if (pw.newPassword.length < 8 || !/[A-Za-z]/.test(pw.newPassword) || !/\d/.test(pw.newPassword)) er.newPassword = 'At least 8 characters, with a letter and a number';
    if (pw.newPassword !== pw.confirm) er.confirm = 'Passwords do not match';
    setWe(er);
    if (Object.keys(er).length) return;
    setB2(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed.');
    } catch (x) { setWerr(x.message); } finally { setB2(false); }
  };

  return (
    <div className="stack" style={{ gap: 22, maxWidth: 640 }}>
      <h1 style={{ fontSize: '1.9rem', marginBottom: 0 }}>Profile &amp; settings</h1>
      <form className="card" onSubmit={saveProfile} noValidate>
        <h3>Your details</h3>
        {perr && <Alert type="error">{perr}</Alert>}
        <dl className="kv" style={{ marginBottom: 14 }}><dt>Email</dt><dd>{user.email}</dd><dt>Role</dt><dd>{ROLE_LABEL[user.role]}</dd>{user.department && user.department.name && <><dt>Department</dt><dd>{user.department.name}</dd></>}</dl>
        <Field label="Full name" htmlFor="pname" error={pe.name}><input id="pname" className={`input ${pe.name ? 'invalid' : ''}`} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
        <Field label="Phone (optional)" htmlFor="pphone" error={pe.phone}><input id="pphone" className="input" type="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
        <ButtonLoading type="submit" loading={b1}>Save changes</ButtonLoading>
      </form>
      <form className="card" onSubmit={changePw} noValidate>
        <h3>Change password</h3>
        {werr && <Alert type="error">{werr}</Alert>}
        <Field label="Current password" htmlFor="cp" error={we.currentPassword}><input id="cp" type="password" autoComplete="current-password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
        <Field label="New password" htmlFor="np" error={we.newPassword} hint="At least 8 characters, with a letter and a number"><input id="np" type="password" autoComplete="new-password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
        <Field label="Confirm new password" htmlFor="nc" error={we.confirm}><input id="nc" type="password" autoComplete="new-password" className="input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
        <ButtonLoading type="submit" loading={b2}>Update password</ButtonLoading>
      </form>
    </div>
  );
}

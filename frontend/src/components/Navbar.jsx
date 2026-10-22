import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, User, LogOut, Globe } from 'lucide-react';
import { useAuth, homeFor } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, isAuthed, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const links = [
    { to: '/', label: t.home, end: true },
    { to: '/report', label: t.reportIssue },
    { to: '/map', label: t.civicMap },
    { to: '/track', label: t.trackIssue },
    { to: '/transparency', label: t.transparency },
    { to: '/awareness', label: t.guide },
  ];

  useEffect(() => { setOpen(false); setMenu(false); }, [location.pathname]);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const doLogout = () => { logout(); navigate('/'); };

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link to="/" className="brand" aria-label="CivicSolve AI home">
          <img src="/favicon.svg" alt="" style={{ borderRadius: 8 }} />
          <span>CivicSolve <span style={{ color: 'var(--teal-600)', fontWeight: 800 }}>AI</span></span>
        </Link>
        <button type="button" className="nav-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`nav ${open ? 'open' : ''}`} aria-label="Main navigation">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>{l.label}</NavLink>
          ))}

          {/* Bilingual Switcher */}
          <div className="row" style={{ gap: 2, background: 'var(--slate-100)', padding: '2px 4px', borderRadius: 999, border: '1px solid var(--slate-200)', marginLeft: 4 }}>
            <Globe size={14} style={{ color: 'var(--muted)', marginLeft: 4 }} />
            <button
              type="button"
              onClick={() => setLang('en')}
              style={{
                background: lang === 'en' ? 'var(--navy-900)' : 'transparent',
                color: lang === 'en' ? '#fff' : 'var(--muted)',
                border: 'none',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('mr')}
              style={{
                background: lang === 'mr' ? 'var(--navy-900)' : 'transparent',
                color: lang === 'mr' ? '#fff' : 'var(--muted)',
                border: 'none',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              lang="mr"
            >
              मराठी
            </button>
          </div>

          {!isAuthed && <Link to="/portals" className="btn btn-primary btn-sm">{t.portals}</Link>}
          {isAuthed && (
            <>
              <div style={{ marginLeft: 8 }}><NotificationBell /></div>
              <div className="user-menu" ref={menuRef} style={{ marginLeft: 6 }}>
                <button type="button" className="nav-link row" style={{ gap: 8 }} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                  <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                  <span>{user.name.split(' ')[0]}</span>
                </button>
                {menu && (
                  <div className="menu-pop">
                    <div style={{ padding: '8px 12px' }}>
                      <strong>{user.name}</strong>
                      <div className="small muted">{user.email}</div>
                    </div>
                    <Link to={homeFor(user.role)}><LayoutDashboard size={16} /> {t.myDashboard}</Link>
                    <Link to="/profile"><User size={16} /> Profile & settings</Link>
                    <button type="button" onClick={doLogout}><LogOut size={16} /> {t.logout}</button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

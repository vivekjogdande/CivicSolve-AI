import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, User, LogOut } from 'lucide-react';
import { useAuth, homeFor } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About RiverCare' },
  { to: '/report', label: 'Report Pollution' },
  { to: '/map', label: 'Pollution Map' },
  { to: '/track', label: 'Track Complaint' },
  { to: '/awareness', label: 'Awareness' },
  { to: '/transparency', label: 'Transparency Dashboard' },
];

export default function Navbar() {
  const { user, isAuthed, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

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
        <Link to="/" className="brand" aria-label="RiverCare home">
          <img src="/favicon.svg" alt="" />
          RiverCare
        </Link>
        <button type="button" className="nav-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`nav ${open ? 'open' : ''}`} aria-label="Main navigation">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>{l.label}</NavLink>
          ))}
          {!isAuthed && <Link to="/portals" className="btn btn-primary btn-sm">Login</Link>}
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
                    <Link to={homeFor(user.role)}><LayoutDashboard size={16} /> My dashboard</Link>
                    <Link to="/profile"><User size={16} /> Profile & settings</Link>
                    <button type="button" onClick={doLogout}><LogOut size={16} /> Log out</button>
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

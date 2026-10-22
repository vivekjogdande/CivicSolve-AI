import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus2, Search, Map, BookOpen, UserCircle, Home, LogOut, Menu, ShieldAlert, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL } from '../utils/constants';
import NotificationBell from '../components/NotificationBell';

function linksFor(user) {
  if (user.role === 'CITIZEN') {
    return [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/report', label: 'Report Issue', icon: FilePlus2 },
      { to: '/track', label: 'Track Issue', icon: Search },
      { to: '/map', label: 'Civic Map', icon: Map },
      { to: '/transparency', label: 'Community Impact', icon: BarChart3 },
      { to: '/profile', label: 'Profile & Settings', icon: UserCircle },
    ];
  }
  const l = [{ to: '/authority', label: 'Authority Dashboard', icon: LayoutDashboard, end: true }];
  if (user.role === 'SENIOR_OFFICER' || user.role === 'ADMIN') l.push({ to: '/authority/senior', label: 'Senior Officer View', icon: ShieldAlert });
  if (user.role === 'ADMIN') l.push({ to: '/admin', label: 'Admin & Accounts', icon: Users });
  l.push({ to: '/map', label: 'Civic Map', icon: Map }, { to: '/transparency', label: 'Community Impact', icon: BarChart3 }, { to: '/profile', label: 'Profile & Settings', icon: UserCircle });
  return l;
}

/** Authenticated layout: sidebar navigation instead of the public top navbar. */
export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const authority = user.role !== 'CITIZEN';

  return (
    <div className="shell">
      <aside className={`sidebar ${authority ? 'authority' : ''} ${open ? 'open' : ''}`} aria-label="Dashboard navigation">
        <Link to="/" className="brand"><img src="/favicon.svg" alt="" /> CivicSolve AI</Link>
        <div className="side-label">{authority ? 'Authority portal' : 'Citizen portal'}</div>
        {linksFor(user).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <l.icon size={18} /> {l.label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <NavLink to="/" end className="side-link"><Home size={18} /> Back to website</NavLink>
        <button type="button" className="side-link" style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left', width: '100%' }} onClick={() => { logout(); navigate('/'); }}>
          <LogOut size={18} /> Log out
        </button>
      </aside>
      <div className="shell-main">
        <div className="shell-top">
          <button type="button" className="side-toggle" aria-label="Open navigation" onClick={() => setOpen((o) => !o)}><Menu size={20} /></button>
          <div style={{ flex: 1 }}>
            <strong>{user.name}</strong>
            <span className="chip" style={{ marginLeft: 10 }}>{ROLE_LABEL[user.role]}</span>
            {user.department && user.department.name && <span className="small muted" style={{ marginLeft: 10 }}>{user.department.name}</span>}
          </div>
          <NotificationBell />
        </div>
        <div className="shell-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

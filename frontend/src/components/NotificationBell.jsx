import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { fmtDateTime } from '../utils/constants';

export default function NotificationBell() {
  const { user, isAuthority } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);

  const load = useCallback(() => {
    api.get('/api/notifications').then((d) => { setData(d); setFailed(false); }).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [user, load]);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const readAll = () => api.post('/api/notifications/read-all').then(load).catch(() => {});
  const readOne = (id) => api.post(`/api/notifications/${id}/read`).then(load).catch(() => {});
  const linkFor = (n) => (n.complaintId ? (isAuthority ? `/authority/complaints/${n.complaintId}` : `/complaints/${n.complaintId}`) : '#');

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="bell" aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell size={18} />
        {data.unread > 0 && <span className="count">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      {open && (
        <div className="menu-pop notif-pop">
          <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
            <strong>Notifications</strong>
            {data.unread > 0 && <button type="button" className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={readAll}>Mark all read</button>}
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {failed && <p className="small muted" style={{ padding: 14 }}>Could not load notifications.</p>}
            {!failed && data.items.length === 0 && <p className="small muted" style={{ padding: 14 }}>You have no notifications yet.</p>}
            {data.items.map((n) => (
              <Link key={n.id} to={linkFor(n)} className={`notif-item ${n.isRead ? '' : 'unread'}`} onClick={() => { readOne(n.id); setOpen(false); }}>
                <strong>{n.title}</strong>
                <div>{n.message}</div>
                <span className="small muted">{fmtDateTime(n.createdAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

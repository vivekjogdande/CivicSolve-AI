import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader } from './ui';

/**
 * roles: array of allowed roles. Unauthenticated visitors go to the matching login page;
 * authenticated users with the wrong role go to /access-denied.
 * (The backend enforces the same rules; this only improves the experience.)
 */
export default function ProtectedRoute({ roles, portal = 'citizen', children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="container"><Loader label="Checking your session…" /></div>;
  if (!user) return <Navigate to={portal === 'authority' ? '/authority/login' : '/citizen/login'} state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/access-denied" replace />;
  return children;
}

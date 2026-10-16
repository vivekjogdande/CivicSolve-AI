import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { EmptyState } from '../components/ui';
import { useAuth, homeFor } from '../context/AuthContext';

export default function AccessDenied() {
  const { user } = useAuth();
  return (
    <div className="container section">
      <EmptyState icon={ShieldAlert} title="Access denied" action={<Link to={user ? homeFor(user.role) : '/portals'} className="btn btn-primary">{user ? 'Go to my dashboard' : 'Choose a portal'}</Link>}>
        Your account does not have permission to open this page.
      </EmptyState>
    </div>
  );
}

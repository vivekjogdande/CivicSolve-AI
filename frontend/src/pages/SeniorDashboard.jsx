import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import AuthorityTable from '../components/AuthorityTable';
import { Alert } from '../components/ui';

export default function SeniorDashboard() {
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div><h1 style={{ fontSize: '1.9rem', marginBottom: 4 }}><ShieldAlert size={26} style={{ verticalAlign: -3 }} /> Senior officer view</h1><p className="muted" style={{ margin: 0 }}>Open complaints that are escalated, flagged for senior review, or have been reopened at least twice.</p></div>
      <Alert type="info">Open a case to review the evidence history and rejected resolution attempts, then record your review note to clear the flag. Back to the <Link to="/authority">standard dashboard</Link>.</Alert>
      <AuthorityTable endpoint="/api/authority/senior/queue" showMine={false} />
    </div>
  );
}

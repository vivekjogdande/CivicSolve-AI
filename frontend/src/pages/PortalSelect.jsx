import { Link } from 'react-router-dom';
import { Users, Landmark } from 'lucide-react';
import { PageHero } from '../components/ui';

export default function PortalSelect() {
  return (
    <>
      <PageHero title="Choose your portal" subtitle="Citizens report and verify. Authorities investigate and submit proof." />
      <section className="section">
        <div className="container grid cols-2">
          <div className="card portal-card">
            <span className="icon-bubble"><Users size={24} /></span>
            <h3>Citizen Portal</h3>
            <p>Report pollution, track your complaints, and verify whether cleanup really happened.</p>
            <div className="row" style={{ marginTop: 'auto' }}>
              <Link to="/citizen/login" className="btn btn-primary">Citizen login</Link>
              <Link to="/citizen/register" className="btn btn-secondary">Create account</Link>
            </div>
            <p className="small muted" style={{ margin: 0 }}>No account needed to <Link to="/report">report anonymously</Link>.</p>
          </div>
          <div className="card portal-card authority">
            <span className="icon-bubble"><Landmark size={24} /></span>
            <h3>Authority Portal</h3>
            <p>Manage reports, investigate pollution and submit resolution evidence. Accounts are issued by an administrator.</p>
            <div className="row" style={{ marginTop: 'auto' }}>
              <Link to="/authority/login" className="btn btn-light">Authority login</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

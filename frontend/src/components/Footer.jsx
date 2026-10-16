import { Link } from 'react-router-dom';
import { Mail, MapPin, Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link to="/" className="brand"><img src="/favicon.svg" alt="" /> RiverCare</Link>
            <p className="small" style={{ marginTop: 12, maxWidth: 320 }}>
              A river pollution reporting, monitoring and verified-resolution platform focused on the Indrayani River in Maharashtra, India.
              A college project built for community-driven river protection.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><Link to="/about">About RiverCare</Link></li>
              <li><Link to="/map">Pollution Map</Link></li>
              <li><Link to="/awareness">Awareness</Link></li>
              <li><Link to="/transparency">Transparency Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4>Take action</h4>
            <ul>
              <li><Link to="/report">Report Pollution</Link></li>
              <li><Link to="/track">Track a Complaint</Link></li>
              <li><Link to="/anonymous">Anonymous Tracking</Link></li>
              <li><Link to="/portals">Citizen & Authority Login</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact & privacy</h4>
            <ul>
              <li className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><Mail size={15} /> <a href="mailto:contact@rivercare.example">contact@rivercare.example</a></li>
              <li className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><MapPin size={15} /> Indrayani River basin, Maharashtra</li>
              <li className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}><Shield size={15} style={{ marginTop: 4 }} /> <span>Public maps show approximate locations only. Reporter identities, contact details and anonymous tokens are never shown publicly.</span></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} RiverCare. Built as a college project.</span>
          <span>Not an official government service. In an emergency, contact local authorities.</span>
        </div>
      </div>
    </footer>
  );
}

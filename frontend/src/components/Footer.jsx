import { Link } from 'react-router-dom';
import { Mail, MapPin, Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link to="/" className="brand" style={{ color: '#fff' }}>
              <img src="/favicon.svg" alt="" style={{ borderRadius: 6 }} />
              <span>CivicSolve <span style={{ color: 'var(--teal-400)' }}>AI</span></span>
            </Link>
            <p className="small" style={{ marginTop: 12, maxWidth: 320, color: '#94a3b8', lineHeight: 1.6 }}>
              From Public Problems to Verified Solutions. Transforming civic complaint resolution with intelligent triage, explainable responder matching, and evidence-backed verification.
            </p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              <li><Link to="/about">About CivicSolve AI</Link></li>
              <li><Link to="/map">Live Civic Map</Link></li>
              <li><Link to="/transparency">Impact & Transparency</Link></li>
              <li><Link to="/track">Track Grievance</Link></li>
            </ul>
          </div>
          <div>
            <h4>Take Action</h4>
            <ul>
              <li><Link to="/report">Report a Problem</Link></li>
              <li><Link to="/anonymous">Anonymous Token Tracking</Link></li>
              <li><Link to="/portals">Sign In / Role Portals</Link></li>
              <li><Link to="/citizen/register">Citizen Registration</Link></li>
            </ul>
          </div>
          <div>
            <h4>Integrity & Privacy</h4>
            <ul>
              <li className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><Mail size={15} /> <a href="mailto:contact@civicsolve.ai">contact@civicsolve.ai</a></li>
              <li className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><MapPin size={15} /> Municipal Ward Operations, India</li>
              <li className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}><Shield size={15} style={{ marginTop: 4, flex: 'none' }} /> <span>Citizen privacy is strictly protected. Exact personal addresses and phone numbers are never exposed publicly.</span></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} CivicSolve AI · National Civic-Tech Innovation Platform.</span>
          <span>Democratizing municipal transparency and citizen verification.</span>
        </div>
      </div>
    </footer>
  );
}

import { Link } from 'react-router-dom';
import { Users, Landmark, Key, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { PageHero } from '../components/ui';
import TiltCard from '../components/TiltCard';

export default function PortalSelect() {
  return (
    <>
      <PageHero
        title="Civic Role Portals"
        subtitle="Citizens report and verify resolutions. Municipal authorities and field teams investigate and submit proof."
      />
      <section className="section">
        <div className="container grid cols-2" style={{ gap: 24 }}>
          {/* Citizen Gateway 3D Card */}
          <TiltCard maxTilt={14} depth={25} className="portal-tilt-wrapper">
            <div
              className="card portal-card"
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '1.5px solid rgba(45, 212, 191, 0.4)',
                background: 'linear-gradient(145deg, #ffffff, #f0fdfa)',
                boxShadow: '0 20px 40px -15px rgba(13, 148, 136, 0.25)',
              }}
            >
              <div className="row between" style={{ marginBottom: 12 }}>
                <span className="icon-bubble" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
                  <Users size={24} />
                </span>
                <span className="ai-badge" style={{ fontSize: '0.7rem' }}>
                  <Sparkles size={11} /> 3D Citizen Gateway
                </span>
              </div>
              <h3 style={{ fontSize: '1.35rem', marginBottom: 8 }}>Citizen Portal</h3>
              <p className="muted">
                Report civic problems, monitor live status on the municipal grid, and inspect before-and-after proof to verify
                actual on-ground completion.
              </p>
              <div className="row" style={{ marginTop: 'auto', gap: 10, paddingTop: 16 }}>
                <Link to="/citizen/login" className="btn btn-primary" style={{ background: 'var(--teal-600)' }}>
                  Citizen Login <ArrowRight size={14} />
                </Link>
                <Link to="/citizen/register" className="btn btn-secondary">
                  Register Account
                </Link>
              </div>
              <p className="small muted" style={{ margin: '14px 0 0' }}>
                No account required to <Link to="/report">report an issue anonymously</Link>.
              </p>
            </div>
          </TiltCard>

          {/* Municipal Authority Gateway 3D Card */}
          <TiltCard maxTilt={14} depth={25} className="portal-tilt-wrapper">
            <div
              className="card portal-card authority"
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(145deg, #0b192c, #06182a)',
                color: '#fff',
                border: '1.5px solid rgba(56, 189, 248, 0.4)',
                boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.6), 0 0 25px rgba(56, 189, 248, 0.2)',
              }}
            >
              <div className="row between" style={{ marginBottom: 12 }}>
                <span className="icon-bubble" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Landmark size={24} />
                </span>
                <span className="chip" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', fontSize: '0.7rem' }}>
                  Official Access
                </span>
              </div>
              <h3 style={{ color: '#fff', fontSize: '1.35rem', marginBottom: 8 }}>Authority & Responder Portal</h3>
              <p style={{ color: '#cbd5e1' }}>
                For Municipal Officers, PWD engineers, Water Board staff, Senior Reviewers, and Administrators. Manage
                priority queues, review AI triage, and submit evidence.
              </p>
              <div className="row" style={{ marginTop: 'auto', paddingTop: 16 }}>
                <Link to="/authority/login" className="btn btn-light" style={{ fontWeight: 700 }}>
                  Authority / Admin Login <ArrowRight size={14} />
                </Link>
              </div>
              <p className="small" style={{ margin: '14px 0 0', color: '#94a3b8' }}>
                Authority accounts are created and provisioned by administrators.
              </p>
            </div>
          </TiltCard>
        </div>

        {/* Demo Credentials Guide for Hackathon Judges */}
        <div className="container" style={{ marginTop: 28 }}>
          <div
            className="card"
            style={{
              background: '#f8fafc',
              border: '1px dashed var(--slate-300)',
              padding: 20,
            }}
          >
            <div className="row between" style={{ marginBottom: 12 }}>
              <div className="row" style={{ gap: 8, color: 'var(--navy-900)' }}>
                <Key size={18} color="var(--teal-600)" />
                <strong>Hackathon Demo Credentials (Pre-Seeded)</strong>
              </div>
              <span className="chip" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                Pre-configured for Testing
              </span>
            </div>
            <div className="grid cols-3" style={{ gap: 12 }}>
              <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid var(--slate-200)' }}>
                <strong style={{ fontSize: '0.88rem' }}>Citizen Portal:</strong>
                <div className="small mono muted">citizen.aarav@gmail.com</div>
                <div className="small mono muted">Password: DemoPass123</div>
              </div>
              <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid var(--slate-200)' }}>
                <strong style={{ fontSize: '0.88rem' }}>PWD Field Officer:</strong>
                <div className="small mono muted">officer.pwd@civicsolve.gov</div>
                <div className="small mono muted">Password: DemoPass123</div>
              </div>
              <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid var(--slate-200)' }}>
                <strong style={{ fontSize: '0.88rem' }}>System Administrator:</strong>
                <div className="small mono muted">admin@civicsolve.gov</div>
                <div className="small mono muted">Password: DemoPass123</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

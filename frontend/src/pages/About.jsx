import { Link } from 'react-router-dom';
import { PageHero } from '../components/ui';
import { ShieldCheck, Lock, Eye, BrainCircuit, Sparkles, Building2, CheckCircle2 } from 'lucide-react';

export default function About() {
  return (
    <>
      <PageHero
        title="About CivicSolve AI"
        subtitle="From Public Problems to Verified Solutions. A national-level civic problem-solving platform connecting citizens, municipal departments, and field responders."
      />
      <section className="section">
        <div className="container medium stack" style={{ gap: 28 }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--teal-600)' }}>The Civic Challenge</span>
            <h2>Why CivicSolve AI Exists</h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--slate-800)' }}>
              Across cities and municipalities, citizens encounter critical civic issues daily: deep potholes causing
              road accidents, hazardous open manholes, decaying garbage dumps, sewage overflows, and broken streetlights.
              Too often, complaints filed on traditional portals are marked &quot;Resolved&quot; administratively without physical
              inspections or verified work.
            </p>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--slate-800)' }}>
              <strong>CivicSolve AI transforms this journey into an evidence-verified lifecycle:</strong> every complaint is
              analyzed by AI for urgency and safety risks, smartly routed with explainable scoring, tracked in real-time,
              and only declared &quot;Resolved&quot; when the reporting citizen inspects photographic proof and confirms the repair.
            </p>
          </div>

          <div className="grid cols-2">
            <div className="card" style={{ border: '1px solid var(--slate-200)' }}>
              <span className="icon-bubble" style={{ background: '#ecfdf5', color: '#059669' }}>
                <BrainCircuit size={22} />
              </span>
              <h3>Intelligent AI Intake</h3>
              <p className="small muted" style={{ margin: 0 }}>
                Natural language processing and vision models categorize complaints, estimate priority (Low/Medium/High/Critical),
                detect life-safety hazards, and identify potential duplicate grievances within 350 meters.
              </p>
            </div>

            <div className="card" style={{ border: '1px solid var(--slate-200)' }}>
              <span className="icon-bubble" style={{ background: '#f0fdfa', color: '#0d9488' }}>
                <Building2 size={22} />
              </span>
              <h3>Explainable Smart Dispatch</h3>
              <p className="small muted" style={{ margin: 0 }}>
                Transparent responder matching algorithm weighing department expertise (35%), geographic ward proximity (30%),
                active field workload (20%), and role seniority (15%).
              </p>
            </div>

            <div className="card" style={{ border: '1px solid var(--slate-200)' }}>
              <span className="icon-bubble" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <ShieldCheck size={22} />
              </span>
              <h3>Evidence-Backed Proof</h3>
              <p className="small muted" style={{ margin: 0 }}>
                Authorities must upload photographic after-proof. Server-side EXIF inspection checks capture time, device metadata,
                and GPS proximity within 100 meters to flag doubtful or forged submissions.
              </p>
            </div>

            <div className="card" style={{ border: '1px solid var(--slate-200)' }}>
              <span className="icon-bubble" style={{ background: '#fef3c7', color: '#d97706' }}>
                <CheckCircle2 size={22} />
              </span>
              <h3>Citizen-Verified Resolution</h3>
              <p className="small muted" style={{ margin: 0 }}>
                Only the reporting citizen can confirm an issue resolved. If rejected, the case automatically reopens, increments
                rework counters, and flags senior oversight.
              </p>
            </div>
          </div>

          <div>
            <span className="eyebrow" style={{ color: 'var(--teal-600)' }}>Role Architecture</span>
            <h2>Who Does What on CivicSolve AI</h2>
            <ul style={{ lineHeight: 1.8, fontSize: '0.98rem' }}>
              <li>
                <strong>Citizens:</strong> Report civic issues (with account or anonymously), monitor live status, and inspect
                before/after proof to confirm or reopen resolutions.
              </li>
              <li>
                <strong>Field Officers:</strong> Receive matched assignments based on workload and proximity, record on-site
                investigation notes, and upload validated after-repair evidence.
              </li>
              <li>
                <strong>Senior Officers:</strong> Monitor priority queues, review escalated complaints, and audit repeatedly
                reopened civic cases.
              </li>
              <li>
                <strong>Administrators:</strong> Manage municipal department configurations, oversee officer dispatch rosters,
                and review aggregate ward analytics.
              </li>
            </ul>
          </div>

          <div className="card-flat" style={{ padding: 18, background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
            <p className="small muted" style={{ margin: 0 }}>
              CivicSolve AI — National Hackathon Edition. Built for municipal scalability, privacy compliance, and open public transparency.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

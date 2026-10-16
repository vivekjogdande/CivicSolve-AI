import { Link } from 'react-router-dom';
import { PageHero } from '../components/ui';
import { ShieldCheck, Lock, Eye, Bot } from 'lucide-react';

export default function About() {
  return (
    <>
      <PageHero title="About RiverCare" subtitle="A citizen-powered platform for reporting, tracking and verifying river cleanup on the Indrayani River." />
      <section className="section">
        <div className="container medium stack" style={{ gap: 24 }}>
          <div>
            <h2>Why it exists</h2>
            <p>The Indrayani flows through Alandi, Dehu and Pimpri-Chinchwad, carrying plastic, untreated sewage and industrial runoff along the way. Complaints are often filed, closed on paper and never seen again. RiverCare closes that loop: every report gets an ID, every update is visible, and a complaint counts as resolved only when the citizen who reported it agrees.</p>
          </div>
          <div className="grid cols-2">
            <div className="card"><span className="icon-bubble"><ShieldCheck size={22} /></span><h3>Proof, not promises</h3><p className="small muted" style={{ margin: 0 }}>Authorities must upload an after-cleanup photo. Its capture time and GPS position are checked against the original report, and doubtful files are flagged for review rather than silently accepted.</p></div>
            <div className="card"><span className="icon-bubble river"><Eye size={22} /></span><h3>Public accountability</h3><p className="small muted" style={{ margin: 0 }}>The <Link to="/transparency">transparency dashboard</Link> shows confirmation, reopen and unconfirmed-closure rates, with the formula and denominator for each.</p></div>
            <div className="card"><span className="icon-bubble"><Lock size={22} /></span><h3>Privacy by design</h3><p className="small muted" style={{ margin: 0 }}>You can report anonymously. Public maps show rounded locations only, and reporter names, contact details and confirmation tokens are never published.</p></div>
            <div className="card"><span className="icon-bubble river"><Bot size={22} /></span><h3>AI that only advises</h3><p className="small muted" style={{ margin: 0 }}>An optional local vision model can compare before and after photos. It runs on the server’s own machine, needs no paid key, and can never mark a complaint as resolved.</p></div>
          </div>
          <div>
            <h2>Who does what</h2>
            <ul>
              <li><strong>Citizens</strong> report pollution (with or without an account), track progress, and confirm or reject cleanups.</li>
              <li><strong>Officers</strong> investigate complaints for their department, add notes and submit cleanup proof.</li>
              <li><strong>Senior officers</strong> review escalated and repeatedly reopened cases.</li>
              <li><strong>Administrators</strong> create authority accounts. Nobody can give themselves authority access by registering.</li>
            </ul>
          </div>
          <div className="card-flat"><p className="small muted">RiverCare is a college project built for demonstration and future deployment. Contact: <a href="mailto:kalmeghrajeshree88@gmail.com">kalmeghrajeshree88@gmail.com</a></p></div>
        </div>
      </section>
    </>
  );
}

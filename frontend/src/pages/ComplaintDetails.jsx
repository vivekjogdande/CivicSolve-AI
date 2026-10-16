import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { Alert, Async, PageHero } from '../components/ui';
import { AttemptHistory, ComplaintSummary, Media, PublicNotes, StatusNote, Timeline } from '../components/ComplaintParts';
import DecisionPanel from '../components/DecisionPanel';
import { ComplaintMap } from '../components/MapView';

/** Full detail page for the account holder who reported the complaint. Others are pointed to the public view. */
export default function ComplaintDetails() {
  const { complaintId } = useParams();
  const { isCitizen, loading } = useAuth();
  const state = useFetch(() => api.get(`/api/complaints/${encodeURIComponent(complaintId)}`), [complaintId, isCitizen], { enabled: isCitizen && !loading });

  if (!isCitizen && !loading) {
    return (
      <>
        <PageHero title={`Complaint ${complaintId}`} subtitle="Private details are available to the reporter only." />
        <section className="section"><div className="container narrow stack">
          <Alert type="info">Log in with the account that filed this complaint to see photographs and evidence, or use your confirmation token if it was anonymous.</Alert>
          <div className="row"><Link to="/citizen/login" state={{ from: `/complaints/${complaintId}` }} className="btn btn-primary">Citizen login</Link><Link to="/anonymous" className="btn btn-secondary">Anonymous tracking</Link><Link to={`/track?id=${complaintId}`} className="btn btn-ghost">Public tracking page</Link></div>
        </div></section>
      </>
    );
  }

  return (
    <>
      <PageHero title={`Complaint ${complaintId}`} subtitle="Full details, evidence and timeline." />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container medium">
          <Async state={state}>
            {({ complaint: c }) => {
              const confirm = async () => (await api.post(`/api/complaints/${c.complaintId}/confirm`)).complaint;
              const reject = async (fd) => (await api.postForm(`/api/complaints/${c.complaintId}/reject`, fd)).complaint;
              return (
                <div className="stack" style={{ gap: 20 }}>
                  <StatusNote status={c.status} />
                  <DecisionPanel complaint={c} confirm={confirm} reject={reject} onUpdated={(updated) => state.setData({ complaint: updated })} />
                  <ComplaintSummary c={c} />
                  <div className="card"><h3>Your evidence</h3><div className="gallery">{c.media.map((m) => <Media key={m.url} m={m} />)}</div></div>
                  <ComplaintMap items={[c]} className="map-box short" />
                  <AttemptHistory attempts={c.resolutionAttempts} />
                  <PublicNotes notes={c.publicNotes} />
                  <div className="card"><h3>Progress timeline</h3><Timeline items={c.timeline} /></div>
                  <Link to="/dashboard" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>Back to dashboard</Link>
                </div>
              );
            }}
          </Async>
        </div>
      </section>
    </>
  );
}

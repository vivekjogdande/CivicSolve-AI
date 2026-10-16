import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Alert, Async, PageHero } from '../components/ui';
import { AttemptHistory, StatusNote } from '../components/ComplaintParts';
import DecisionPanel from '../components/DecisionPanel';

export default function ResolutionConfirmation() {
  const { complaintId } = useParams();
  const state = useFetch(() => api.get(`/api/complaints/${encodeURIComponent(complaintId)}`), [complaintId]);
  return (
    <>
      <PageHero title="Verify the cleanup" subtitle={`Complaint ${complaintId}: compare before and after, then tell us whether it is fixed.`} />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container medium">
          <Async state={state}>
            {({ complaint: c }) => {
              const confirm = async () => (await api.post(`/api/complaints/${c.complaintId}/confirm`)).complaint;
              const reject = async (fd) => (await api.postForm(`/api/complaints/${c.complaintId}/reject`, fd)).complaint;
              const waiting = c.status === 'AWAITING_CITIZEN_CONFIRMATION';
              return (
                <div className="stack" style={{ gap: 20 }}>
                  <StatusNote status={c.status} />
                  {!waiting && c.status !== 'RESOLVED_CITIZEN_CONFIRMED' && c.status !== 'CLOSED_UNCONFIRMED' && <Alert type="info">There is no cleanup waiting for your confirmation right now.</Alert>}
                  <DecisionPanel complaint={c} confirm={confirm} reject={reject} onUpdated={(u) => state.setData({ complaint: u })} />
                  <AttemptHistory attempts={c.resolutionAttempts} />
                  <Link to={`/complaints/${c.complaintId}`} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>Open full complaint</Link>
                </div>
              );
            }}
          </Async>
        </div>
      </section>
    </>
  );
}

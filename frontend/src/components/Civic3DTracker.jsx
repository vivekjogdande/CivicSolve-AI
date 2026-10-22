import { CheckCircle2, Circle, Clock, Sparkles, ShieldCheck, ArrowRight, BrainCircuit, UserCheck, Wrench } from 'lucide-react';
import TiltCard from './TiltCard';

const MILESTONES = [
  { key: 'INTAKE', label: '01. Grievance Intake', icon: Circle, desc: 'GPS & Evidence Latched' },
  { key: 'AI_TRIAGE', label: '02. AI Triage', icon: BrainCircuit, desc: 'Categorized & Hazard Scored' },
  { key: 'DISPATCH', label: '03. Official Dispatch', icon: UserCheck, desc: 'Ward Officer Assigned' },
  { key: 'RESOLUTION', label: '04. Evidence Cleanup', icon: Wrench, desc: 'Audit Verified Proof' },
  { key: 'VERIFIED', label: '05. Citizen Verified', icon: ShieldCheck, desc: 'Signed & Case Closed' },
];

function getStageIndex(status) {
  switch (status) {
    case 'REPORTED':
      return 0;
    case 'AI_ANALYZED':
      return 1;
    case 'ASSIGNED':
      return 2;
    case 'IN_PROGRESS':
      return 2;
    case 'RESOLVED':
    case 'AWAITING_CITIZEN_CONFIRMATION':
      return 3;
    case 'CITIZEN_CONFIRMED':
    case 'CLOSED':
      return 4;
    default:
      return 0;
  }
}

export default function Civic3DTracker({ status = 'REPORTED' }) {
  const currentStage = getStageIndex(status);

  return (
    <TiltCard maxTilt={6} depth={15} className="civic-3d-tracker-wrap">
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(11, 25, 44, 0.95), rgba(6, 24, 44, 0.95))',
          border: '1.5px solid rgba(45, 212, 191, 0.35)',
          borderRadius: 'var(--radius)',
          padding: '20px 24px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4), 0 0 25px rgba(13, 148, 136, 0.15)',
          color: '#fff',
        }}
      >
        <div className="row between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="ai-badge" style={{ fontSize: '0.72rem', padding: '3px 10px' }}>
              <Sparkles size={12} /> 3D Spatial Lifecycle Track
            </span>
            <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>Real-time civic pipeline state</span>
          </div>
          <span
            className="chip mono"
            style={{
              background: 'rgba(45, 212, 191, 0.15)',
              color: '#2dd4bf',
              border: '1px solid rgba(45, 212, 191, 0.4)',
              fontSize: '0.75rem',
            }}
          >
            STAGE 0{currentStage + 1} OF 05
          </span>
        </div>

        {/* 3D Isometric Stepper Bar */}
        <div className="spatial-stepper-track">
          {MILESTONES.map((step, idx) => {
            const isCompleted = idx < currentStage;
            const isCurrent = idx === currentStage;
            const StepIcon = step.icon;

            return (
              <div
                key={step.key}
                className={`spatial-step-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
              >
                <div className="spatial-step-pod">
                  <div className="spatial-step-icon">
                    {isCompleted ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                  </div>
                  <div className="spatial-step-info">
                    <span className="spatial-step-title">{step.label}</span>
                    <span className="spatial-step-desc">{step.desc}</span>
                  </div>
                </div>
                {idx < MILESTONES.length - 1 && (
                  <div className={`spatial-step-laser ${idx < currentStage ? 'charged' : ''}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TiltCard>
  );
}

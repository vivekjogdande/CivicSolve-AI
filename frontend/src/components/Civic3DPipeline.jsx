import { useState } from 'react';
import {
  FileText,
  BrainCircuit,
  Building2,
  Camera,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Cpu,
} from 'lucide-react';
import TiltCard from './TiltCard';

const STAGES = [
  {
    id: 1,
    title: 'Grievance Intake',
    tag: 'Citizen Gateway',
    icon: FileText,
    accent: 'var(--teal-500)',
    badge: 'Stage 01',
    metric: 'Anonymous / Account',
    summary: 'Citizen drops GPS pin, provides title, description, and uploads photographic evidence.',
    details: [
      'Multi-format photo & video support (JPG, PNG, WebP, MP4)',
      'Sub-meter GPS coordinate anchoring with reverse landmark lookup',
      'One-time anonymous confirmation token with SHA-256 cryptographic hash',
    ],
    livePreview: {
      type: 'Citizen Report',
      field1: 'Coordinates: 18.5912°N, 73.7621°E',
      field2: 'Evidence: Verified photo attachment (EXIF latched)',
    },
  },
  {
    id: 2,
    title: 'AI Neural Triage',
    tag: 'Intelligence Layer',
    icon: BrainCircuit,
    accent: '#38bdf8',
    badge: 'Stage 02',
    metric: '94% Confidence',
    summary: 'Automated civic categorization, priority classification, safety hazard extraction, and duplicate detection.',
    details: [
      'Instant categorization: Potholes, Open Manhole, Water Pipe, Sewage, Streetlight',
      'Safety hazard extraction: flags collision risks, fatal fall dangers, public health vectors',
      'Duplicate clustering: searches 400m radius with text keyword similarity index',
    ],
    livePreview: {
      type: 'AI Triage Result',
      field1: 'Category: POTHOLES_ROAD_DAMAGE (High Priority)',
      field2: 'Hazard: Two-wheeler skidding risk on arterial corridor',
    },
  },
  {
    id: 3,
    title: 'Smart Dispatch',
    tag: 'Multi-Criteria Match',
    icon: Building2,
    accent: '#f59e0b',
    badge: 'Stage 03',
    metric: 'Explainable Score',
    summary: 'Multi-criteria responder routing balancing department domain, proximity, queue workload, and officer authority.',
    details: [
      'Expertise weighting (35%): targets PWD, Municipal Sanitation, Water Board, or Electricity',
      'Proximity weighting (30%): routes to active field officers in nearest municipal ward',
      'Workload capacity (20%): prevents queue bottlenecks on overburdened field responders',
    ],
    livePreview: {
      type: 'Responder Routing',
      field1: 'Matched: Anil Deshmukh (PWD Roads Lead) · 92% Match',
      field2: 'Queue: 1 active task · Immediate field availability',
    },
  },
  {
    id: 4,
    title: 'Evidence Resolution',
    tag: 'Field Proof',
    icon: Camera,
    accent: '#ec4899',
    badge: 'Stage 04',
    metric: 'EXIF + GPS Audited',
    summary: 'Field crews complete on-ground repair and upload after-cleanup evidence with strict validation checks.',
    details: [
      'Timestamp verification: capture time must strictly follow initial grievance submission',
      'Geofence proximity: photo GPS coordinates verified within 100 meters of reported site',
      'Anti-tamper check: duplicate photograph re-use automatically rejected via SHA-256',
    ],
    livePreview: {
      type: 'Validation Audit',
      field1: 'EXIF: Captured 28 meters from complaint spot',
      field2: 'Checks: [PASS] Timestamp · [PASS] GPS · [PASS] Non-duplicate',
    },
  },
  {
    id: 5,
    title: 'Citizen Verification',
    tag: 'Final Authority',
    icon: ShieldCheck,
    accent: '#10b981',
    badge: 'Stage 05',
    metric: 'Zero False Resolves',
    summary: 'The reporting citizen inspects before-and-after evidence. Only the citizen can confirm resolution.',
    details: [
      'Side-by-side holographic before/after evidence comparison slider',
      'Citizen rejection rights: citizen can reopen with explanation and fresh condition photo',
      'Automatic escalation: unresolved cases reopened 2+ times escalate to Senior Officer queue',
    ],
    livePreview: {
      type: 'Citizen Confirmation',
      field1: 'Status: Citizen Confirmed & Cryptographically Signed',
      field2: 'Audit Log: Immutable record appended to public transparency ledger',
    },
  },
];

export default function Civic3DPipeline() {
  const [activeStage, setActiveStage] = useState(2); // Default to AI Neural Triage
  const stage = STAGES.find((s) => s.id === activeStage) || STAGES[1];
  const Icon = stage.icon;

  return (
    <section className="section" style={{ background: 'var(--navy-950)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Background Lighting Mesh */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.25) 0%, transparent 65%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '5%',
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 65%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-head center">
          <span className="eyebrow" style={{ color: 'var(--teal-400)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Cpu size={14} /> Interactive 3D Lifecycle Architecture
            </span>
          </span>
          <h2 style={{ color: '#fff' }}>The 5-Stage Verified Civic Pipeline</h2>
          <p style={{ color: '#94a3b8', margin: '0 auto', maxWidth: 620 }}>
            Inspect how CivicSolve AI moves public issues from citizen detection to AI neural classification,
            smart dispatch, field validation, and tamper-resistant citizen confirmation.
          </p>
        </div>

        {/* 3D Stage Navigation Pills */}
        <div className="pipeline-nav-3d">
          {STAGES.map((s) => {
            const SIcon = s.icon;
            const isCurrent = s.id === activeStage;
            return (
              <button
                key={s.id}
                type="button"
                className={`pipeline-nav-btn ${isCurrent ? 'active' : ''}`}
                onClick={() => setActiveStage(s.id)}
              >
                <SIcon size={16} style={{ color: isCurrent ? '#fff' : s.accent }} />
                <span>{s.badge}: {s.title}</span>
              </button>
            );
          })}
        </div>

        {/* 3D Focal Showcase Stage */}
        <div className="pipeline-showcase-3d">
          {/* Left: 3D Tilt Card with Deep Spatial Visualizer */}
          <TiltCard
            className="pipeline-3d-card"
            maxTilt={10}
            depth={28}
            style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(11, 25, 44, 0.85))',
              border: `1.5px solid ${stage.accent}55`,
              borderRadius: 'var(--radius-lg)',
              padding: '32px 28px',
              boxShadow: `0 20px 50px -15px ${stage.accent}33`,
            }}
          >
            <div className="row between" style={{ marginBottom: 16 }}>
              <div className="row" style={{ gap: 10 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${stage.accent}22`,
                    border: `1px solid ${stage.accent}`,
                    display: 'grid',
                    placeItems: 'center',
                    color: stage.accent,
                  }}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <span className="small muted" style={{ color: stage.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {stage.tag}
                  </span>
                  <h3 style={{ color: '#fff', margin: 0, fontSize: '1.4rem' }}>{stage.title}</h3>
                </div>
              </div>
              <span className="chip" style={{ background: `${stage.accent}22`, color: stage.accent, border: `1px solid ${stage.accent}66` }}>
                {stage.metric}
              </span>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 20 }}>
              {stage.summary}
            </p>

            <div className="stack" style={{ gap: 10, marginBottom: 24 }}>
              {stage.details.map((d, i) => (
                <div key={i} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} style={{ color: stage.accent, flex: 'none', marginTop: 3 }} />
                  <span style={{ color: '#94a3b8', fontSize: '0.92rem' }}>{d}</span>
                </div>
              ))}
            </div>

            {/* Live Holographic Telemetry Box */}
            <div
              style={{
                background: 'rgba(6, 14, 26, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                padding: '14px 18px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              }}
            >
              <div className="row between" style={{ marginBottom: 6, color: stage.accent }}>
                <span style={{ fontWeight: 700 }}>▸ {stage.livePreview.type}</span>
                <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>3D Telemetry Feed</span>
              </div>
              <div style={{ color: '#e2e8f0', marginBottom: 4 }}>{stage.livePreview.field1}</div>
              <div style={{ color: '#94a3b8' }}>{stage.livePreview.field2}</div>
            </div>
          </TiltCard>

          {/* Right: 3D Spatial Pipeline Hologram Stepper */}
          <div className="pipeline-stages-list">
            {STAGES.map((s, idx) => {
              const SIcon = s.icon;
              const isSelected = s.id === activeStage;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveStage(s.id)}
                  className={`pipeline-step-item ${isSelected ? 'active' : ''}`}
                  style={{
                    cursor: 'pointer',
                    padding: '16px 20px',
                    borderRadius: 12,
                    background: isSelected ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.5)',
                    border: isSelected ? `1.5px solid ${s.accent}` : '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.25s ease',
                    boxShadow: isSelected ? `0 10px 25px -8px ${s.accent}44` : 'none',
                  }}
                >
                  <div className="row between">
                    <div className="row" style={{ gap: 12 }}>
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: isSelected ? s.accent : 'rgba(255, 255, 255, 0.06)',
                          color: isSelected ? '#fff' : '#94a3b8',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                        }}
                      >
                        0{idx + 1}
                      </span>
                      <div>
                        <strong style={{ color: isSelected ? '#fff' : '#cbd5e1', fontSize: '0.98rem' }}>
                          {s.title}
                        </strong>
                        <div className="small muted" style={{ color: isSelected ? s.accent : '#64748b' }}>
                          {s.tag}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={16} style={{ color: isSelected ? s.accent : '#475569', transform: isSelected ? 'translateX(4px)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/ui';
import { ExternalLink, AlertTriangle, CheckCircle, ShieldAlert, Zap, Droplets, Trash2 } from 'lucide-react';

const T = {
  en: {
    title: 'Civic Problem-Solving Guide',
    sub: 'Standards, priority criteria, and best practices for reporting and resolving municipal civic issues.',
    standardsH: 'Municipal Civic Standards & Emergency Guidelines',
    standardsSub: 'How municipal departments evaluate, categorize, and prioritize civic grievances.',
    tipsH: 'How to Submit an Actionable Civic Report',
    tips: [
      ['Take Clear, Geotagged Photos', 'Capture both a close-up of the hazard (e.g. pothole depth, broken manhole) and a wide-angle shot showing landmarks or street signs.'],
      ['Pin the Exact Geographic Location', 'Enable GPS location on your device or drop a pin accurately on the map to ensure field crews find the spot without delays.'],
      ['Check for Existing Hotspot Reports', 'Use CivicSolve AI’s duplicate detection to follow and upvote existing nearby reports rather than fragmenting municipal work orders.'],
      ['Document Immediate Safety Risks', 'Note whether the issue poses urgent traffic hazards, pedestrian injury risks, or electrical shock dangers for emergency escalation.'],
    ],
    categoriesH: 'Common Civic Categories & Response Timelines',
    categories: [
      {
        icon: AlertTriangle,
        name: 'Potholes & Road Damage',
        dept: 'Public Works Department (PWD)',
        sla: '24 – 48 Hours',
        desc: 'Road surface cave-ins, deep potholes on transit corridors, and broken dividers that pose high accident risks to motorists and cyclists.'
      },
      {
        icon: ShieldAlert,
        name: 'Open Manholes & Broken Drain Covers',
        dept: 'Municipal Stormwater / Drainage',
        sla: 'Immediate (< 4 Hours)',
        desc: 'Uncovered sewer shafts or collapsed chamber lids. Classified as CRITICAL emergency due to fatal fall hazards during night or monsoon waterlogging.'
      },
      {
        icon: Trash2,
        name: 'Garbage Dumps & Solid Waste Overflow',
        dept: 'Solid Waste Management (SWM)',
        sla: '12 – 24 Hours',
        desc: 'Chronic dumping spots, overflowing community bins, organic waste heaps causing foul odour, disease vectors, or burning toxic smoke.'
      },
      {
        icon: Droplets,
        name: 'Water Pipeline Bursts & Contamination',
        dept: 'Water Supply & Sanitation',
        sla: '6 – 12 Hours',
        desc: 'High-pressure mains leaks wasting potable drinking water, submerged roadway waterlogging, or sewage seepage into supply pipes.'
      },
      {
        icon: Zap,
        name: 'Streetlight Blackouts & Exposed Cables',
        dept: 'Electrical Infrastructure Division',
        sla: '24 Hours',
        desc: 'Continuous stretch outages causing pedestrian blind spots, dangling live electrical wires, or broken junction box covers.'
      },
    ],
    verifyH: 'Evidence-Based Resolution Workflow',
    verifySteps: [
      'Field Crew Dispatch: Municipal team visits the reported GPS location and conducts repair works.',
      'Geotagged Proof Upload: Crew uploads an "After" photo with embedded timestamp and location metadata.',
      'AI Visual Inspection: CivicSolve AI vision models compare before/after condition to verify structural repair.',
      'Citizen Final Confirmation: You receive a notification to verify or reject the resolution before the ticket is officially closed.'
    ],
    linksH: 'Official Portals & Citizen Charters',
    cta: 'Have an issue in your neighborhood? Report now',
  },
  mr: {
    title: 'नागरी समस्या निवारण मार्गदर्शक',
    sub: 'महापालिका नागरी समस्या नोंदवण्यासाठी व सोडवण्यासाठी आवश्यक मानके, प्राधान्यक्रम आणि नियमावली.',
    standardsH: 'महापालिका नागरी मानके व आपत्कालीन मार्गदर्शक तत्त्वे',
    standardsSub: 'महापालिका विभाग नागरिकांच्या तक्रारींचे मूल्यांकन, वर्गीकरण आणि निराकरण कसे करतात.',
    tipsH: 'प्रभावी तक्रार कशी नोंदवावी',
    tips: [
      ['स्पष्ट आणि अचूक फोटो घ्या', 'समस्येचा जवळून फोटो (उदा. खड्ड्याची खोली, तुटलेले मॅनहोल) आणि परिसरातील खांब किंवा दुकानाचा संदर्भ दिसेल असा फोटो घ्या.'],
      ['अचूक GPS स्थान निवडा', 'मोबाईलचे लोकेशन सुरू ठेवा किंवा नकाशावर योग्य ठिकाणी पिन लावा जेणेकरून महापालिका पथक थेट पोहोचू शकेल.'],
      ['आधीच नोंदवलेली तक्रार तपासा', 'CivicSolve AI च्या ड्युप्लिकेट तपासणीचा वापर करून एकाच समस्येवर एकाधिक तक्रारींऐवजी मूळ तक्रारीला पाठिंबा (Upvote) द्या.'],
      ['तातडीचा धोका नमूद करा', 'अपघाताची शक्यता, नागरिकांना इजा किंवा विद्युत शॉकचा धोका असल्यास तातडीने आपत्कालीन श्रेणी निवडा.'],
    ],
    categoriesH: 'प्रमुख नागरी समस्या व निराकरण कालावधी (SLA)',
    categories: [
      {
        icon: AlertTriangle,
        name: 'खड्डे व रस्त्यांचे नुकसान',
        dept: 'सार्वजनिक बांधकाम विभाग (PWD)',
        sla: '२४ – ४८ तास',
        desc: 'रस्त्यावरील मोठे खड्डे, खचलेले रस्ते आणि दुभाजकांचे नुकसान ज्यामुळे वाहनचालक आणि पादचाऱ्यांना अपघाताचा गंभीर धोका असतो.'
      },
      {
        icon: ShieldAlert,
        name: 'उघडी मॅनहोल्स व तुटलेली गटार झाकणे',
        dept: 'मलनिस्सारण व जलनिःसारण विभाग',
        sla: 'तातडीने (< ४ तास)',
        desc: 'उघडी गटारे किंवा तुटलेली मॅनहोल झाकणे. रात्रीच्या वेळी किंवा पावसात जीवघेणा धोका असल्यामुळे अति-गंभीर (CRITICAL) आपत्कालीन श्रेणी.'
      },
      {
        icon: Trash2,
        name: 'कचऱ्याचे ढीग व घनकचरा समस्या',
        dept: 'घनकचरा व्यवस्थापन विभाग',
        sla: '१२ – २४ तास',
        desc: 'उघड्यावर साचलेला कचरा, तुडुंब भरलेले कंटेनर, दुर्गंधी व आरोग्यास धोका निर्माण करणारे कचऱ्याचे ढीग.'
      },
      {
        icon: Droplets,
        name: 'जलवाहिनी गळती व दूषित पाणी',
        dept: 'पाणी पुरवठा विभाग',
        sla: '६ – १२ तास',
        desc: 'पिण्याच्या पाण्याची मुख्य पाईपलाईन फुटणे, पाण्याचा अपव्यय किंवा पिण्याच्या पाण्यात सांडपाणी मिसळणे.'
      },
      {
        icon: Zap,
        name: 'पथदिवे बंद असणे व उघड्या विद्युत तारा',
        dept: 'विद्युत विभाग',
        sla: '२४ तास',
        desc: 'रस्त्यावरील पथदिवे बंद असणे, अंधारामुळे सुरक्षिततेचा प्रश्न किंवा उघड्या जिवंत वीज तारा.'
      },
    ],
    verifyH: 'पुरावा-आधारित पारदर्शक निराकरण प्रक्रिया',
    verifySteps: [
      'कर्मचारी भेट: महापालिकेचे पथक थेट GPS नोंदवलेल्या ठिकाणी जाऊन दुरुस्तीचे काम पूर्ण करते.',
      'काम पूर्ण झाल्याचा फोटो: कामाचे पुरावे म्हणून दुरुस्तीनंतरचा फोटो आणि वेळेची नोंद सिस्टीममध्ये अपलोड केली जाते.',
      'AI द्वारे पडताळणी: CivicSolve AI कॉम्प्युटर व्हिजनद्वारे पूर्वीचा व नंतरचा फोटो तपासून कामाची खात्री करतो.',
      'नागरिकांची अंतिम मंजुरी: तक्रारदार नागरिकाला सूचना मिळते. काम समाधानकारक असेल तरच तक्रार बंद होते, अन्यथा फेरविचार केला जातो.'
    ],
    linksH: 'अधिकृत पोर्टल व नागरिक सनद',
    cta: 'तुमच्या परिसरात समस्या आहे? आत्ताच तक्रार नोंदवा',
  },
};

const OFFICIAL_LINKS = [
  ['Ministry of Housing and Urban Affairs (MoHUA)', 'https://mohua.gov.in/'],
  ['Swachh Bharat Urban Mission Portal', 'https://swachhbharaturban.gov.in/'],
  ['Pune Municipal Corporation (PMC) Citizen Charter', 'https://pmc.gov.in/'],
  ['National Grievance Portal (CPGRAMS)', 'https://pgportal.gov.in/'],
];

export default function Awareness() {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('cs_lang') || localStorage.getItem('rc_lang') === 'mr' ? 'mr' : 'en';
    } catch {
      return 'en';
    }
  });
  const t = T[lang] || T.en;

  const choose = (l) => {
    setLang(l);
    try {
      localStorage.setItem('cs_lang', l);
    } catch {
      /* ignore */
    }
  };

  return (
    <div lang={lang} className={lang === 'mr' ? 'lang-mr' : ''}>
      <PageHero title={t.title} subtitle={t.sub}>
        <div className="lang-switch" role="group" aria-label="Language selection" style={{ marginTop: 18 }}>
          <button
            type="button"
            className={lang === 'en' ? 'active' : ''}
            aria-pressed={lang === 'en'}
            onClick={() => choose('en')}
          >
            English
          </button>
          <button
            type="button"
            className={lang === 'mr' ? 'active' : ''}
            aria-pressed={lang === 'mr'}
            onClick={() => choose('mr')}
            lang="mr"
          >
            मराठी
          </button>
        </div>
      </PageHero>

      <section className="section">
        <div className="container medium stack" style={{ gap: 36 }}>
          {/* Actionable Reporting Tips */}
          <div>
            <h2>{t.tipsH}</h2>
            <div className="grid cols-2">
              {t.tips.map(([h, p]) => (
                <div key={h} className="card hover">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={18} color="var(--teal-600)" />
                    {h}
                  </h3>
                  <p className="small muted" style={{ margin: 0 }}>
                    {p}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Categories and SLAs */}
          <div>
            <h2>{t.categoriesH}</h2>
            <div className="stack" style={{ gap: 14 }}>
              {t.categories.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.name} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <span className="icon-bubble" style={{ background: 'var(--teal-100)', color: 'var(--teal-600)', marginTop: 2 }}>
                      <Icon size={24} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div className="row between" style={{ marginBottom: 4 }}>
                        <h3 style={{ margin: 0 }}>{c.name}</h3>
                        <span className="badge" style={{ background: 'var(--forest-50)', color: 'var(--navy-800)', fontWeight: 600 }}>
                          SLA: {c.sla}
                        </span>
                      </div>
                      <p className="small muted" style={{ margin: '0 0 6px' }}>
                        {c.desc}
                      </p>
                      <span className="small" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>
                        Responsible: {c.dept}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence-Based Resolution Flow */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--navy-950) 0%, var(--navy-900) 100%)', color: '#fff', border: 'none' }}>
            <h2 style={{ color: '#fff' }}>{t.verifyH}</h2>
            <ol style={{ paddingLeft: 20, margin: '14px 0 0' }}>
              {t.verifySteps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: 10, color: 'var(--slate-200)' }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Official Portals */}
          <div>
            <h2>{t.linksH}</h2>
            <ul style={{ paddingLeft: 20 }}>
              {OFFICIAL_LINKS.map(([l, u]) => (
                <li key={u} style={{ marginBottom: 8 }}>
                  <a href={u} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {l} <ExternalLink size={13} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Banner */}
          <div className="cta-band" style={{ borderRadius: 'var(--radius-lg)' }}>
            <h2>{t.cta}</h2>
            <Link to="/report" className="btn btn-light btn-lg">
              {lang === 'mr' ? 'नागरी तक्रार नोंदवा' : 'Report Civic Issue'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  X,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Phone,
  ArrowRight,
  Send,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const FAQ_DATA = {
  en: [
    {
      q: 'Which category should I select for an open manhole or broken drainage lid?',
      a: 'Select "Open Manholes & Safety Hazards". Because this presents a life-critical fall hazard (especially at night or in rain), it is automatically prioritized as CRITICAL with an emergency response SLA under 4 hours.',
      tag: 'Category Guide',
    },
    {
      q: 'What details and photos should I submit for the fastest resolution?',
      a: 'Submit: 1) One clear close-up of the hazard. 2) One wide-angle photo showing nearby shop boards or street signs. 3) Enable GPS so the field crew gets exact meter coordinates. 4) Note any immediate danger to pedestrians or school children.',
      tag: 'Best Practices',
    },
    {
      q: 'How does anonymous reporting work? What is the confirmation token?',
      a: 'You can submit reports without creating an account. You will receive a unique 64-character confirmation token shown ONCE upon submission. Save this token! It allows you to view updates, inspect repair photos, and approve or reopen the case from the Track page.',
      tag: 'Anonymous Access',
    },
    {
      q: 'What happens if a field crew claims an issue is fixed, but it isn’t?',
      a: 'CivicSolve AI does NOT allow authorities to unilaterally close tickets. When an officer marks a ticket resolved, you receive a review prompt. You can inspect the after-photo and click "No, still a problem" with a new photo. This automatically reopens the case and escalates it to a Senior Officer.',
      tag: 'Verification',
    },
    {
      q: 'What are the official municipal response timelines (SLAs)?',
      a: '• Open Manholes: Immediate (< 4 Hours)\n• Potable Water Pipe Bursts: 6 – 12 Hours\n• Solid Waste / Garbage: 12 – 24 Hours\n• Streetlight Outages: 24 Hours\n• Potholes & Arterial Roads: 24 – 48 Hours',
      tag: 'Municipal Standards',
    },
    {
      q: 'What are the municipal emergency helplines for Pune / Maharashtra?',
      a: '• Municipal Corporation Toll-Free: 1800-1030-222\n• Electricity Board (MSEDCL): 1912\n• Police Control Room: 112\n• Fire & Disaster Emergency: 101',
      tag: 'Emergency Contacts',
    },
  ],
  mr: [
    {
      q: 'उघडे मॅनहोल किंवा तुटलेल्या गटारासाठी कोणती श्रेणी निवडावी?',
      a: '"उघडी मॅनहोल्स व तुटलेली गटार झाकणे" ही श्रेणी निवडा. रात्री किंवा पावसात यात पडून जीव जाण्याचा धोका असल्यामुळे ही अति-गंभीर (CRITICAL) आपत्कालीन श्रेणी मानली जाते आणि ४ तासांच्या आत कारवाई अपेक्षित असते.',
      tag: 'श्रेणी मार्गदर्शक',
    },
    {
      q: 'तक्रार लवकर सुटण्यासाठी कोणते फोटो व तपशील द्यावेत?',
      a: '१) समस्येचा जवळून एक स्पष्ट फोटो. २) परिसरातील दुकान किंवा खांब दिसेल असा दूरचा फोटो. ३) मोबाईलचे GPS लोकेशन सुरू ठेवा. ४) लहान मुले किंवा पादचाऱ्यांना असलेला धोका वर्णनात स्पष्ट लिहा.',
      tag: 'तक्रार पद्धती',
    },
    {
      q: 'गोपनीय (अनामिक) तक्रार कशी काम करते? कन्फर्मेशन टोकन काय आहे?',
      a: 'खाते न उघडताही तक्रार नोंदवता येते. तक्रार नोंदवल्यावर एक ६४-अक्षरी गुप्त टोकन मिळते. ते जपून ठेवा! त्या टोकनद्वारे तुम्ही तक्रारीची प्रगती पाहू शकता आणि काम पूर्ण झाल्यावर मंजुरी किंवा फेरविचार करू शकता.',
      tag: 'अनामिक प्रवेश',
    },
    {
      q: 'अधिकाऱ्यांनी काम पूर्ण झाल्याचा दावा केला पण काम झाले नसेल तर?',
      a: 'CivicSolve AI मध्ये अधिकारी परस्पर तक्रार बंद करू शकत नाहीत. अधिकारी दुरुस्तीचा फोटो अपलोड करतात. तो फोटो पाहून "नाही, समस्या कायम आहे" असे सांगून तुम्ही तक्रार पुन्हा उघडू शकता. यामुळे तक्रार थेट वरिष्ठ अधिकाऱ्यांकडे जाते.',
      tag: 'पडताळणी',
    },
    {
      q: 'महापालिकेचे अधिकृत निराकरण कालावधी (SLA) काय आहेत?',
      a: '• उघडे मॅनहोल: तातडीने (< ४ तास)\n• पिण्याच्या पाण्याची गळती: ६ ते १२ तास\n• कचऱ्याचे ढीग: १२ ते २४ तास\n• पथदिवे बंद: २४ तास\n• रस्त्यावरील खड्डे: २४ ते ४८ तास',
      tag: 'महापालिका मानके',
    },
    {
      q: 'पुणे / महाराष्ट्रातील आपत्कालीन हेल्पलाईन क्रमांक काय आहेत?',
      a: '• महानगरपालिका टोल-फ्री: १८००-१०३०-२२२\n• महावितरण वीज तक्रार: १९१२\n• पोलीस नियंत्रण कक्ष: ११२\n• अग्निशामक व आपत्ती: १०१',
      tag: 'संपर्क क्रमांक',
    },
  ],
};

export default function CivicAssistantWidget() {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [query, setQuery] = useState('');

  const faqs = FAQ_DATA[lang] || FAQ_DATA.en;

  const filteredFaqs = query.trim()
    ? faqs.filter(
        (f) =>
          f.q.toLowerCase().includes(query.toLowerCase()) ||
          f.a.toLowerCase().includes(query.toLowerCase()) ||
          f.tag.toLowerCase().includes(query.toLowerCase())
      )
    : faqs;

  return (
    <>
      {/* Floating Trigger Button */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--teal-600) 100%)',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 30px rgba(11, 25, 44, 0.4)',
              borderRadius: 999,
              padding: '12px 20px',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
            }}
            aria-label="Open Civic Knowledge Assistant"
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Sparkles size={16} color="#5eead4" />
            </span>
            <span>{lang === 'mr' ? 'नागरी सहाय्यक AI' : 'Civic Guide AI'}</span>
          </button>
        )}
      </div>

      {/* Assistant Modal / Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 420,
            maxWidth: 'calc(100vw - 32px)',
            height: 580,
            maxHeight: 'calc(100vh - 48px)',
            background: 'var(--paper)',
            borderRadius: 'var(--radius)',
            border: '1.5px solid var(--slate-300)',
            boxShadow: '0 24px 60px rgba(11, 25, 44, 0.35)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--navy-950) 0%, var(--navy-900) 100%)',
              color: '#fff',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(45, 212, 191, 0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--teal-400)',
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '1rem', display: 'block', lineHeight: 1.2 }}>
                  {lang === 'mr' ? 'नागरी ज्ञान सहाय्यक' : 'Civic Knowledge Assistant'}
                </strong>
                <span className="small" style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  {lang === 'mr' ? 'मार्गदर्शक व महापालिका मानके' : 'Guidance & Municipal Standards'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Box */}
          <div style={{ padding: '10px 14px', background: 'var(--slate-50)', borderBottom: '1px solid var(--line)' }}>
            <div className="row" style={{ gap: 8, background: '#fff', border: '1px solid var(--slate-300)', borderRadius: 8, padding: '6px 10px' }}>
              <Search size={16} color="var(--muted)" />
              <input
                type="text"
                placeholder={lang === 'mr' ? 'प्रश्न किंवा विषय शोधा (उदा. मॅनहोल, खड्डे)...' : 'Ask or search topic (e.g. manhole, pothole, token)...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.86rem',
                  width: '100%',
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {filteredFaqs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)' }}>
                <HelpCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p className="small">
                  {lang === 'mr'
                    ? 'या विषयावर थेट माहिती आढळली नाही. खालील "तक्रार नोंदवा" वर क्लिक करून AI स्वयं-वर्गीकरण वापरा.'
                    : 'No specific topic matched. Click "Report an Issue" to use real-time AI auto-categorization.'}
                </p>
              </div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {filteredFaqs.map((item, idx) => {
                  const isSelected = selectedIdx === idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        border: isSelected ? '1.5px solid var(--teal-600)' : '1px solid var(--line)',
                        borderRadius: 10,
                        background: isSelected ? 'var(--teal-50)' : '#fff',
                        padding: 12,
                        cursor: 'pointer',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onClick={() => setSelectedIdx(isSelected ? null : idx)}
                    >
                      <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <span
                            className="chip"
                            style={{
                              fontSize: '0.68rem',
                              padding: '1px 8px',
                              marginBottom: 4,
                              background: isSelected ? 'var(--teal-100)' : 'var(--slate-100)',
                              color: isSelected ? 'var(--teal-600)' : 'var(--navy-900)',
                            }}
                          >
                            {item.tag}
                          </span>
                          <strong
                            style={{
                              fontSize: '0.88rem',
                              display: 'block',
                              color: 'var(--forest-700)',
                              marginTop: 2,
                            }}
                          >
                            {item.q}
                          </strong>
                        </div>
                        <ChevronRight
                          size={16}
                          style={{
                            color: isSelected ? 'var(--teal-600)' : 'var(--muted)',
                            transform: isSelected ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.18s',
                            flex: 'none',
                            marginTop: 4,
                          }}
                        />
                      </div>
                      {isSelected && (
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 8,
                            borderTop: '1px solid rgba(0,0,0,0.06)',
                            fontSize: '0.85rem',
                            color: 'var(--slate-700)',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with Disclaimer & CTA */}
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--slate-50)',
              borderTop: '1px solid var(--line)',
            }}
          >
            <p className="small muted" style={{ fontSize: '0.72rem', margin: '0 0 8px', lineHeight: 1.3 }}>
              {lang === 'mr'
                ? 'सूचना: ही माहिती नागरिकांच्या मार्गदर्शनासाठी आहे; अंतिम निर्णय संबंधित प्रभाग अधिकाऱ्यांचा असतो.'
                : 'Notice: Guidance is advisory & informational; official municipal actions are determined by assigned ward officers.'}
            </p>
            <Link
              to="/report"
              className="btn btn-primary btn-block btn-sm"
              style={{
                background: 'var(--teal-600)',
                gap: 6,
                fontWeight: 600,
              }}
              onClick={() => setIsOpen(false)}
            >
              {lang === 'mr' ? 'तक्रार नोंदवा' : 'Report an Issue Now'} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

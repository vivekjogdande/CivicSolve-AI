import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/ui';
import { ExternalLink } from 'lucide-react';

const VIDEO_ID = 'Em_kIA7RET8';
const VIDEO_URL = 'https://youtu.be/Em_kIA7RET8?si=OvAeOt9h3LicvZs5';

const T = {
  en: {
    title: 'Environmental Awareness',
    sub: 'Understand what harms our rivers and what each of us can do about it.',
    videoH: 'Watch: why river pollution matters',
    videoFallback: 'Video not loading? Watch it on YouTube',
    tipsH: 'Prevention tips',
    tips: [
      ['Never dump waste in or near the river', 'Puja flowers, idols, packaging and household garbage should go to designated collection points, not the water or the banks.'],
      ['Cut single-use plastic', 'Carry a cloth bag and a bottle. Plastic breaks into microplastics that stay in the river and in fish for decades.'],
      ['Know where your drain goes', 'Many drains empty straight into the river. Keep oils, paint and chemicals out of them.'],
      ['Report early', 'A small spill reported on day one is far easier to clean than a large one reported in week three.'],
    ],
    plasticH: 'Plastic waste',
    plastic: 'Plastic bags, bottles and packaging collect along banks and in slow stretches, trapping other debris, harming fish and birds, and blocking drains that worsen floods. Most of it enters the river from nearby streets, markets and religious offerings.',
    sewageH: 'Sewage discharge',
    sewage: 'Untreated sewage lowers dissolved oxygen, spreads disease, and causes foam, bad smell and fish deaths. Signs include grey or green water, foam near outlets, and a strong odour. Report the outlet location with a photo.',
    cleanupH: 'Organise a community cleanup',
    cleanup: ['Pick a short river stretch and tell the local municipal office or gram panchayat beforehand.', 'Photograph the stretch before you start, and again when you finish.', 'Wear gloves and closed shoes; sort plastic, glass and other waste into separate bags.', 'Never handle chemical containers, medical waste or dead animals: report them on RiverCare instead.', 'Arrange for the collected waste to be taken away so it does not return to the river.'],
    readH: 'Further reading',
    cta: 'Report pollution you see',
  },
  mr: {
    title: 'पर्यावरण जनजागृती',
    sub: 'आपल्या नद्यांना काय हानी पोहोचवते आणि प्रत्येकजण काय करू शकतो ते समजून घ्या.',
    videoH: 'व्हिडिओ पहा: नदी प्रदूषण का महत्त्वाचे आहे',
    videoFallback: 'व्हिडिओ दिसत नाही? YouTube वर पहा',
    tipsH: 'प्रदूषण टाळण्याचे उपाय',
    tips: [
      ['नदीत किंवा नदीकाठी कचरा टाकू नका', 'निर्माल्य, मूर्ती, प्लास्टिक आणि घरगुती कचरा ठरलेल्या संकलन केंद्रात द्या; पाण्यात किंवा काठावर टाकू नका.'],
      ['एकदाच वापरायचे प्लास्टिक टाळा', 'कापडी पिशवी आणि स्वतःची बाटली सोबत ठेवा. प्लास्टिकचे सूक्ष्म कण नदीत आणि माशांमध्ये अनेक वर्षे राहतात.'],
      ['तुमची गटार कुठे जाते ते जाणून घ्या', 'अनेक गटारे थेट नदीत सोडली जातात. तेल, रंग आणि रसायने त्यात टाकू नका.'],
      ['लवकर तक्रार करा', 'पहिल्याच दिवशी नोंदवलेली छोटी गळती तिसऱ्या आठवड्यातील मोठ्या प्रदूषणापेक्षा स्वच्छ करणे खूप सोपे असते.'],
    ],
    plasticH: 'प्लास्टिक कचरा',
    plastic: 'प्लास्टिक पिशव्या, बाटल्या आणि वेष्टन नदीकाठी आणि संथ प्रवाहात साचतात. त्यामुळे मासे आणि पक्ष्यांना धोका होतो आणि गटारे तुंबून पूर वाढतो. यातील बहुतांश कचरा जवळचे रस्ते, बाजार आणि धार्मिक विधींमधून नदीत येतो.',
    sewageH: 'सांडपाणी प्रवाह',
    sewage: 'प्रक्रिया न केलेले सांडपाणी पाण्यातील ऑक्सिजन कमी करते, रोग पसरवते आणि फेस, दुर्गंधी व मासे मरण्यास कारणीभूत ठरते. करडे किंवा हिरवे पाणी, नाल्याजवळ फेस आणि तीव्र वास ही लक्षणे आहेत. फोटोसह ठिकाण नोंदवा.',
    cleanupH: 'सामुदायिक स्वच्छता मोहीम आयोजित करा',
    cleanup: ['नदीचा छोटा पट्टा निवडा आणि आधी स्थानिक महानगरपालिका किंवा ग्रामपंचायतीला कळवा.', 'सुरू करण्यापूर्वी आणि संपल्यावर त्या पट्ट्याचे फोटो काढा.', 'हातमोजे आणि बंद चपला वापरा; प्लास्टिक, काच आणि इतर कचरा वेगवेगळ्या पिशव्यांत ठेवा.', 'रसायनांचे डबे, वैद्यकीय कचरा किंवा मृत प्राण्यांना हात लावू नका; त्यांची RiverCare वर तक्रार करा.', 'गोळा केलेला कचरा उचलला जाईल याची व्यवस्था करा, म्हणजे तो पुन्हा नदीत जाणार नाही.'],
    readH: 'अधिक माहिती',
    cta: 'तुम्ही पाहिलेले प्रदूषण नोंदवा',
  },
};

const LINKS = [
  ['Central Pollution Control Board: water quality', 'https://cpcb.nic.in/water-pollution/'],
  ['Maharashtra Pollution Control Board', 'https://mpcb.gov.in/'],
  ['Namami Gange: community river programme', 'https://nmcg.nic.in/'],
];

export default function Awareness() {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('rc_lang') === 'mr' ? 'mr' : 'en'; } catch { return 'en'; } });
  const t = T[lang];
  const choose = (l) => { setLang(l); try { localStorage.setItem('rc_lang', l); } catch { /* ignore */ } };
  return (
    <div lang={lang} className={lang === 'mr' ? 'lang-mr' : ''}>
      <PageHero title={t.title} subtitle={t.sub}>
        <div className="lang-switch" role="group" aria-label="Language" style={{ marginTop: 18 }}>
          <button type="button" className={lang === 'en' ? 'active' : ''} aria-pressed={lang === 'en'} onClick={() => choose('en')}>English</button>
          <button type="button" className={lang === 'mr' ? 'active' : ''} aria-pressed={lang === 'mr'} onClick={() => choose('mr')} lang="mr">मराठी</button>
        </div>
      </PageHero>
      <section className="section">
        <div className="container medium stack" style={{ gap: 36 }}>
          <div>
            <h2>{t.videoH}</h2>
            <div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`} title={t.videoH} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>
            <p className="small" style={{ marginTop: 8 }}><a href={VIDEO_URL} target="_blank" rel="noopener noreferrer">{t.videoFallback} <ExternalLink size={13} style={{ verticalAlign: -1 }} /></a></p>
          </div>
          <div>
            <h2>{t.tipsH}</h2>
            <div className="grid cols-2">{t.tips.map(([h, p]) => <div key={h} className="card"><h3>{h}</h3><p className="small muted" style={{ margin: 0 }}>{p}</p></div>)}</div>
          </div>
          <div className="grid cols-2">
            <div className="card"><h3>{t.plasticH}</h3><p className="small" style={{ margin: 0 }}>{t.plastic}</p></div>
            <div className="card"><h3>{t.sewageH}</h3><p className="small" style={{ margin: 0 }}>{t.sewage}</p></div>
          </div>
          <div>
            <h2>{t.cleanupH}</h2>
            <ol>{t.cleanup.map((c) => <li key={c} style={{ marginBottom: 6 }}>{c}</li>)}</ol>
          </div>
          <div>
            <h2>{t.readH}</h2>
            <ul>{LINKS.map(([l, u]) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer">{l}</a></li>)}</ul>
          </div>
          <div className="cta-band"><h2>{t.cta}</h2><Link to="/report" className="btn btn-light btn-lg">{lang === 'mr' ? 'तक्रार नोंदवा' : 'Report Pollution'}</Link></div>
        </div>
      </section>
    </div>
  );
}

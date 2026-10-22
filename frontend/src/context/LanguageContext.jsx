import { createContext, useContext, useState, useEffect } from 'react';

const TRANSLATIONS = {
  en: {
    brandTagline: 'Smarter Cities, Better Communities.',
    home: 'Home',
    reportIssue: 'Report an Issue',
    civicMap: 'Civic Map',
    trackIssue: 'Track Issue',
    transparency: 'Community Impact',
    guide: 'Civic Guide',
    portals: 'Sign In / Portals',
    myDashboard: 'My Dashboard',
    logout: 'Log Out',
    heroSub: 'Citizens report civic issues, track real-time resolution progress, and help municipal authorities prioritize public problems with AI-assisted triage and verified evidence.',
    exploreDashboard: 'Explore Civic Dashboard',
    exploreMap: 'Explore Civic Map',
    quickStartTitle: 'Quick Grievance Drafter & Citizen Start',
    yourName: 'Your Full Name (optional for anonymous)',
    namePlaceholder: 'e.g. Ramesh Kulkarni',
    selectCategory: 'Select Civic Category',
    issueDescription: 'Describe the problem location & hazard',
    descPlaceholder: 'e.g. Massive pothole on Karve Road near Metro pillar 42 causing traffic slowdown...',
    proceedToReport: 'Proceed to Official Report',
    guestAnonymous: 'Or report anonymously without signing in',
    statsReported: 'Civic Issues Reported',
    statsActive: 'Under Active Response',
    statsVerified: 'Citizen-Verified Fixes',
    statsWards: 'Civic Wards Monitored',
  },
  mr: {
    brandTagline: 'स्मार्ट शहरे, समृद्ध समुदाय.',
    home: 'मुख्यपृष्ठ',
    reportIssue: 'तक्रार नोंदवा',
    civicMap: 'नागरी नकाशा',
    trackIssue: 'स्थिती तपासा',
    transparency: 'पारदर्शकता',
    guide: 'नागरी मार्गदर्शक',
    portals: 'प्रवेश / पोर्टल्स',
    myDashboard: 'माझा डॅशबोर्ड',
    logout: 'बाहेर पडा',
    heroSub: 'नागरिक नागरी समस्या नोंदवू शकतात, प्रगतीचा मागोवा घेऊ शकतात आणि AI ट्रायज व पुराव्यासह महापालिकेला समस्या सोडवण्यास मदत करू शकतात.',
    exploreDashboard: 'नागरी डॅशबोर्ड पहा',
    exploreMap: 'नागरी नकाशा पहा',
    quickStartTitle: 'त्वरित तक्रार मसुदा व नागरिक सुरुवात',
    yourName: 'आपले पूर्ण नाव (गोपनीय तक्रारीसाठी ऐच्छिक)',
    namePlaceholder: 'उदा. रमेश कुलकर्णी',
    selectCategory: 'नागरी श्रेणी निवडा',
    issueDescription: 'समस्येचे ठिकाण व धोक्याचे वर्णन करा',
    descPlaceholder: 'उदा. कर्वे रस्त्यावर मेट्रो पिलर ४२ जवळ मोठा खड्डा ज्यामुळे वाहने घसरत आहेत...',
    proceedToReport: 'अधिकृत तक्रार नोंदवा',
    guestAnonymous: 'किंवा खाते न उघडता गुप्तपणे तक्रार करा',
    statsReported: 'नोंदवलेल्या नागरी समस्या',
    statsActive: 'कार्यवाही सुरू असलेल्या',
    statsVerified: 'नागरिकांनी मंजूर केलेल्या दुरुस्त्या',
    statsWards: 'निरीक्षणाखालील प्रभाग / वॉर्ड',
  },
};

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: TRANSLATIONS.en,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('cs_lang') || localStorage.getItem('rc_lang');
      return saved === 'mr' ? 'mr' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = (newLang) => {
    const l = newLang === 'mr' ? 'mr' : 'en';
    setLangState(l);
    try {
      localStorage.setItem('cs_lang', l);
    } catch {
      /* ignore */
    }
  };

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

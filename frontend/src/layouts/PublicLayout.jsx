import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Ambient3DCanvas from '../components/Ambient3DCanvas';
import CivicAssistantWidget from '../components/CivicAssistantWidget';

export default function PublicLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <Ambient3DCanvas />
      <a href="#main" className="skip-link">Skip to main content</a>
      <Navbar />
      <main id="main" style={{ position: 'relative', zIndex: 1 }}><Outlet /></main>
      <CivicAssistantWidget />
      <Footer />
    </>
  );
}

import { Routes, Route } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import About from './pages/About';
import PortalSelect from './pages/PortalSelect';
import PollutionMap from './pages/PollutionMap';
import Awareness from './pages/Awareness';
import Transparency from './pages/Transparency';
import NotFound from './pages/NotFound';
import AccessDenied from './pages/AccessDenied';

import CitizenRegister from './pages/CitizenRegister';
import CitizenLogin from './pages/CitizenLogin';
import CitizenDashboard from './pages/CitizenDashboard';
import ReportPollution from './pages/ReportPollution';
import TrackComplaint from './pages/TrackComplaint';
import ComplaintDetails from './pages/ComplaintDetails';
import ResolutionConfirmation from './pages/ResolutionConfirmation';
import AnonymousTracking from './pages/AnonymousTracking';
import Profile from './pages/Profile';

import AuthorityLogin from './pages/AuthorityLogin';
import AuthorityDashboard from './pages/AuthorityDashboard';
import AuthorityComplaintDetail from './pages/AuthorityComplaintDetail';
import SeniorDashboard from './pages/SeniorDashboard';
import AdminDashboard from './pages/AdminDashboard';

const AUTH = ['OFFICER', 'SENIOR_OFFICER', 'ADMIN'];
const SENIOR = ['SENIOR_OFFICER', 'ADMIN'];
const ANY = ['CITIZEN', ...AUTH];

export default function App() {
  return (
    <Routes>
      {/* Public site (top navbar + footer) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/portals" element={<PortalSelect />} />
        <Route path="/report" element={<ReportPollution />} />
        <Route path="/map" element={<PollutionMap />} />
        <Route path="/track" element={<TrackComplaint />} />
        <Route path="/anonymous" element={<AnonymousTracking />} />
        <Route path="/awareness" element={<Awareness />} />
        <Route path="/transparency" element={<Transparency />} />
        <Route path="/complaints/:complaintId" element={<ComplaintDetails />} />
        <Route path="/complaints/:complaintId/confirm" element={<ProtectedRoute roles={['CITIZEN']}><ResolutionConfirmation /></ProtectedRoute>} />
        <Route path="/citizen/register" element={<CitizenRegister />} />
        <Route path="/citizen/login" element={<CitizenLogin />} />
        <Route path="/authority/login" element={<AuthorityLogin />} />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Authenticated dashboards (sidebar layout) */}
      <Route element={<ProtectedRoute roles={ANY}><DashboardLayout /></ProtectedRoute>}>
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route element={<ProtectedRoute roles={['CITIZEN']}><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<CitizenDashboard />} />
      </Route>
      <Route element={<ProtectedRoute roles={AUTH} portal="authority"><DashboardLayout /></ProtectedRoute>}>
        <Route path="/authority" element={<AuthorityDashboard />} />
        <Route path="/authority/complaints/:complaintId" element={<AuthorityComplaintDetail />} />
      </Route>
      <Route element={<ProtectedRoute roles={SENIOR} portal="authority"><DashboardLayout /></ProtectedRoute>}>
        <Route path="/authority/senior" element={<SeniorDashboard />} />
      </Route>
      <Route element={<ProtectedRoute roles={['ADMIN']} portal="authority"><DashboardLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

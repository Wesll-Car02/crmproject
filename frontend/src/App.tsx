import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';

// Pages
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import LeadsPage from './pages/Leads/LeadsPage';
import LeadDetailPage from './pages/Leads/LeadDetailPage';
import OpportunitiesPage from './pages/Opportunities/OpportunitiesPage';
import OpportunityDetailPage from './pages/Opportunities/OpportunityDetailPage';
import ProposalsPage from './pages/Proposals/ProposalsPage';
import ContractsPage from './pages/Contracts/ContractsPage';
import CPQPage from './pages/CPQ/CPQPage';
import CadencePage from './pages/Cadence/CadencePage';
import FinancialPage from './pages/Financial/FinancialPage';
import ChatPage from './pages/Chat/ChatPage';
import CampaignsPage from './pages/Campaigns/CampaignsPage';
import AutomationsPage from './pages/Automations/AutomationsPage';
import LandingPagesPage from './pages/LandingPages/LandingPagesPage';
import SchedulingPage from './pages/Scheduling/SchedulingPage';
import CustomerSuccessPage from './pages/CustomerSuccess/CustomerSuccessPage';
import ProspectingPage from './pages/Prospecting/ProspectingPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import AIPage from './pages/AI/AIPage';
import SettingsPage from './pages/Settings/SettingsPage';
import AdminPage from './pages/Admin/AdminPage';
import TagsPage from './pages/Tags/TagsPage';
import PublicBookingPage from './pages/Public/PublicBookingPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/book/:userSlug" element={<PublicBookingPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
          <Route path="proposals" element={<ProposalsPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="cpq" element={<CPQPage />} />
          <Route path="cadence" element={<CadencePage />} />
          <Route path="financial" element={<FinancialPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="automations" element={<AutomationsPage />} />
          <Route path="landing-pages" element={<LandingPagesPage />} />
          <Route path="scheduling" element={<SchedulingPage />} />
          <Route path="customer-success" element={<CustomerSuccessPage />} />
          <Route path="prospecting" element={<ProspectingPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="ai" element={<AIPage />} />
          <Route path="tags" element={<TagsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminPage />} />
          {/* <Route path="test/:id" element={<TestRoutePage />} /> */}
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { LoginPage } from './pages/LoginPage'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { ServicesPage } from './pages/ServicesPage'
import { PhoneNumbersPage } from './pages/PhoneNumbersPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { SecurityPage } from './pages/SecurityPage'
import { CustomersPage } from './pages/CustomersPage'
import { LeadsPage } from './pages/LeadsPage'
import { InboxPage } from './pages/InboxPage'
import { ContentPage } from './pages/ContentPage'
import { CampaignsPage } from './pages/CampaignsPage'
import { KnowledgeBasePage } from './pages/KnowledgeBasePage'
import { AiAssistantPage } from './pages/AiAssistantPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReportsPage } from './pages/ReportsPage'
import { ServiceDetailPage } from './pages/ServiceDetailPage'

function ProtectedRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/phone-numbers" element={<PhoneNumbersPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/content" element={<ContentPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/services/:slug" element={<ServiceDetailPage />} />
        <Route path="/ai" element={<AiAssistantPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-neutral-500">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  if (!session) return <LoginPage />
  return <ProtectedRoutes />
}

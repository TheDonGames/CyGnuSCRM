import { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastContainer } from './components/Toast';
import { FeedbackProvider } from './components/FeedbackModal';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RepairsPage } from './pages/RepairsPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { DevicesPage } from './pages/DevicesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { WarrantyPage } from './pages/WarrantyPage';
import { WhatsAppWorkspacePage } from './pages/WhatsAppWorkspacePage';
import { ActivityPage } from './pages/ActivityPage';
import { LogsPage } from './pages/LogsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AutomationRulesPage } from './pages/AutomationRulesPage';
import { SettingsPage } from './pages/SettingsPage';
import { InventoryPage } from './pages/InventoryPage';
import { SuppliersPage } from './pages/SuppliersPage';
import type { PageKey } from './components/Layout';

function AppContent() {
  const { service } = useStore();
  const [page, setPage] = useState<PageKey>('dashboard');

  const user = service.getCurrentUser();

  if (!user) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage onNavigate={setPage} />;
      case 'repairs':
        return <RepairsPage />;
      case 'customers':
        return <ProfilesPage />;
      case 'devices':
        return <DevicesPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'warranty':
        return <WarrantyPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'whatsapp':
        return <WhatsAppWorkspacePage />;
      case 'users':
        return <UsersPage />;
      case 'activity':
        return <ActivityPage />;
      case 'logs':
        return <LogsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'rules':
        return <AutomationRulesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setPage} />;
    }
  };

  return (
    <>
      <ProtectedRoute page={page} onNavigate={setPage}>
        {renderPage()}
      </ProtectedRoute>
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ThemeProvider>
        <FeedbackProvider>
          <AppContent />
        </FeedbackProvider>
      </ThemeProvider>
    </StoreProvider>
  );
}

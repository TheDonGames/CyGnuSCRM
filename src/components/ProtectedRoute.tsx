import { useEffect, type ReactNode } from 'react';
import { useStore } from '../context/StoreContext';
import { showToast } from './Toast';
import { Layout, type PageKey } from './Layout';

interface ProtectedRouteProps {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

const ADMIN_ONLY_PAGES: PageKey[] = ['users', 'rules', 'logs', 'activity', 'settings'];

export function ProtectedRoute({ page, onNavigate, children }: ProtectedRouteProps) {
  const { service } = useStore();
  const user = service.getCurrentUser();

  useEffect(() => {
    if (!user) return;

    const normalizedRole = user.role.toLowerCase();
    if (ADMIN_ONLY_PAGES.includes(page) && normalizedRole !== 'admin') {
      showToast('warning', 'Access Denied: Admin privileges required.');
      onNavigate('dashboard');
    }
  }, [user, page, onNavigate]);

  if (!user) return null;

  const normalizedRole = user.role.toLowerCase();
  if (ADMIN_ONLY_PAGES.includes(page) && normalizedRole !== 'admin') {
    return null;
  }

  return (
    <Layout currentPage={page} onNavigate={onNavigate}>
      {children}
    </Layout>
  );
}

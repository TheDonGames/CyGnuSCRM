import { useState, useEffect, type ReactNode } from 'react';
import { LayoutDashboard, Wrench, Users, CircleUser as UserCircle, Smartphone, FileText, ShieldCheck, Boxes, MessageCircle, Bell, Send, ScrollText, Activity, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight, RefreshCw, Lock, CircleDot, Clock, Sun, Moon } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import { isUserActive, formatTimeAgo } from '../utils/helpers';
import { showToast } from './Toast';

// ============================================================
// Page keys — all navigable views in the application
// ============================================================

export type PageKey =
  | 'dashboard'
  | 'repairs'
  | 'customers'
  | 'devices'
  | 'invoices'
  | 'warranty'
  | 'inventory'
  | 'whatsapp'
  | 'rules'
  | 'notifications'
  | 'users'
  | 'logs'
  | 'activity'
  | 'settings';

// ============================================================
// Navigation taxonomy — categorized per menubar.py
// ============================================================

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
  badge?: 'queued';
}

interface NavCategory {
  label: string;
  items: NavItem[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    label: 'Workspace',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
      { key: 'repairs', label: 'Repairs / Tickets', icon: <Wrench className="h-5 w-5" /> },
      { key: 'customers', label: 'Customer Profiles', icon: <UserCircle className="h-5 w-5" /> },
      { key: 'devices', label: 'Devices', icon: <Smartphone className="h-5 w-5" /> },
    ],
  },
  {
    label: 'Logistics & Finance',
    items: [
      { key: 'invoices', label: 'Invoices Hub', icon: <FileText className="h-5 w-5" /> },
      { key: 'warranty', label: 'Warranty Status', icon: <ShieldCheck className="h-5 w-5" /> },
      { key: 'inventory', label: 'Inventory / Stock', icon: <Boxes className="h-5 w-5" /> },
    ],
  },
  {
    label: 'Communications',
    items: [
      { key: 'whatsapp', label: 'WhatsApp Integration', icon: <MessageCircle className="h-5 w-5" /> },
      { key: 'rules', label: 'Auto-Notify Rules', icon: <Bell className="h-5 w-5" />, adminOnly: true },
      { key: 'notifications', label: 'Outbox Log', icon: <Send className="h-5 w-5" />, badge: 'queued' },
    ],
  },
  {
    label: 'Administrative',
    items: [
      { key: 'users', label: 'Users Management', icon: <Users className="h-5 w-5" />, adminOnly: true },
      { key: 'logs', label: 'Central Audit Trail', icon: <ScrollText className="h-5 w-5" />, adminOnly: true },
      { key: 'activity', label: 'System Activity Log', icon: <Activity className="h-5 w-5" />, adminOnly: true },
      { key: 'settings', label: 'System Settings', icon: <Settings className="h-5 w-5" />, adminOnly: true },
    ],
  },
];

// ============================================================
// Layout component
// ============================================================

interface LayoutProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { state, service } = useStore();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const user = service.getCurrentUser();

  // Live clock — updates every second
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  const normalizedRole = user.role.toLowerCase();
  const activeUsers = state.users.filter((u) => isUserActive(u.last_seen));
  const queuedCount = state.notifications.filter((n) => n.status === 'queued').length;
  const handleLogout = () => {
    service.logout();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    service.heartbeat();
    setTimeout(() => {
      setRefreshing(false);
      showToast('success', 'System data refreshed');
    }, 600);
  };

  const handleNavigate = (page: PageKey) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  // Filter categories by role
  const visibleCategories = NAV_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => !item.adminOnly || normalizedRole === 'admin'),
  })).filter((cat) => cat.items.length > 0);

  // ============================================================
  // Sidebar content (shared between desktop + mobile)
  // ============================================================

  const renderNavItem = (item: NavItem) => {
    const active = currentPage === item.key;
    const showLabel = !collapsed;
    return (
      <div key={item.key} className="relative group">
        <button
          onClick={() => handleNavigate(item.key)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
            active
              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <span className={active ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}>{item.icon}</span>
          {showLabel && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge === 'queued' && queuedCount > 0 && (
                <span className="ml-auto rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {queuedCount}
                </span>
              )}
            </>
          )}
        </button>
        {/* Tooltip when collapsed */}
        {collapsed && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block">
            <div className="whitespace-nowrap rounded-md bg-gray-900 dark:bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
              {item.label}
              {item.badge === 'queued' && queuedCount > 0 && (
                <span className="ml-1.5 text-amber-300">({queuedCount})</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNavContent = (isMobile = false) => (
    <>
      {/* Brand header */}
      <div className={`flex items-center gap-3 border-b border-gray-200 dark:border-slate-700 ${collapsed && !isMobile ? 'justify-center px-3 py-4' : 'px-5 py-4'}`}>
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shrink-0">
          <ShieldCheck className="h-6 w-6" />
          {/* Live connectivity indicator */}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
          </span>
        </div>
        {(!collapsed || isMobile) && (
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">CyGnuS SARL</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">CRM Pro Repair</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {visibleCategories.map((cat, idx) => (
          <div key={cat.label} className={idx > 0 ? 'mt-5' : ''}>
            {(!collapsed || isMobile) && (
              <p className="px-3 mb-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {cat.label}
              </p>
            )}
            {collapsed && !isMobile && idx > 0 && <div className="mx-3 my-3 border-t border-gray-100 dark:border-slate-700" />}
            <div className="space-y-0.5">
              {cat.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Active users widget */}
      {(!collapsed || isMobile) && (
        <div className="px-3 pt-2 pb-3">
          <div className="rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 p-3">
            <div className="mb-2.5 flex items-center gap-2">
              <CircleDot className="h-3.5 w-3.5 shrink-0 text-emerald-500 animate-pulse-soft" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {activeUsers.length} Active Now
              </span>
            </div>
            <div className="space-y-1.5">
              {state.users.slice(0, 3).map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      isUserActive(u.last_seen) ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                  <span className="truncate font-medium text-gray-700 dark:text-gray-300">{u.username}</span>
                  <span className="ml-auto shrink-0 text-gray-400">{formatTimeAgo(u.last_seen)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User profile footer */}
      <div className={`border-t border-gray-200 dark:border-slate-700 p-3 ${collapsed && !isMobile ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-3 rounded-lg ${collapsed && !isMobile ? 'justify-center p-2' : 'px-2 py-1.5'}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 font-semibold text-sm shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{normalizedRole}</p>
            </div>
          )}
          {(!collapsed || isMobile) && (
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  // ============================================================
  // Desktop collapse toggle button
  // ============================================================

  const collapseButton = (
    <button
      onClick={() => setCollapsed(!collapsed)}
      className="absolute -right-3 top-20 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-500 shadow-sm transition-all hover:text-brand-600 dark:hover:text-brand-400 hover:shadow-md"
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
    </button>
  );

  // ============================================================
  // Global header (desktop)
  // ============================================================

  const desktopHeader = (
    <header className="hidden lg:flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-3">
      <div />
      <div className="flex items-center gap-3">
        {/* Live clock */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 font-mono tabular-nums">
          <Clock className="h-3 w-3 text-gray-300 dark:text-gray-600" />
          {clock.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          {' · '}
          {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white"
          title="Refresh System Data"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>

        {/* User profile area */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200 dark:border-slate-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 font-semibold text-xs">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{user.username}</p>
            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">{normalizedRole}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800"
            title="Lock / Switch User"
          >
            <Lock className="h-3.5 w-3.5" />
            Lock
          </button>
        </div>
      </div>
    </header>
  );

  // ============================================================
  // Mobile header
  // ============================================================

  const mobileHeader = (
    <header className="lg:hidden flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
      <button
        onClick={() => setSidebarOpen(true)}
        className="rounded-lg p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        <span className="font-semibold text-gray-900 dark:text-white">CyGnuS SARL</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={handleRefresh}
          className="rounded-lg p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );

  // (status footer removed — connectivity shown inline in sidebar + header)

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex relative flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {collapseButton}
        {renderNavContent()}
      </aside>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col bg-white dark:bg-slate-900 animate-slide-in-left">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-2 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 z-10"
            >
              <X className="h-5 w-5" />
            </button>
            {renderNavContent(true)}
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {desktopHeader}
        {mobileHeader}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

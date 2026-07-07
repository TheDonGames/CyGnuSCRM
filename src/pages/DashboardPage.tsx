import { useState, useMemo, useCallback, type ReactNode } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  Search,
  Plus,
  X,
  Filter,
  Inbox,
  AlertCircle,
  ArrowRight,
  Send,
  UserCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  isUserActive,
  formatTimeAgo,
  getStatusColor,
} from '../utils/helpers';
import type { PageKey } from '../components/Layout';
// FIX: Imported setPendingRepairDetailId to support deep-linking/detail modals
import { setPendingIntakeIntent, setPendingRepairDetailId } from './RepairsPage';
import type { RepairRecord, RepairStatus } from '../types';

// ============================================================
// Status palette — Flatly Corporate (exact hex from spec)
// ============================================================

const STATUS_PALETTE: Record<string, { hex: string; label: string }> = {
  Pending: { hex: '#2C3E50', label: 'New' },
  'In Progress': { hex: '#3498DB', label: 'In Repair' },
  Ready: { hex: '#F39C12', label: 'Ready For Pickup' },
  Completed: { hex: '#18BC9C', label: 'Delivered' },
  'Awaiting Parts': { hex: '#9B59B6', label: 'Awaiting Parts' },
  Cancelled: { hex: '#E74C3C', label: 'Cancelled' },
};

// Statuses shown in the distribution widget (spec order)
const DISTRIBUTION_STATUSES: RepairStatus[] = [
  'Pending',
  'In Progress',
  'Ready',
  'Completed',
];

// ============================================================
// Types
// ============================================================

interface DashboardPageProps {
  onNavigate: (page: PageKey) => void;
}

type DrawerKind = 'active' | 'pending' | null;

// ============================================================
// Component
// ============================================================

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { state, service } = useStore();
  const { repairs, users, activities, notifications } = state;

  const user = service.getCurrentUser();
  const isAdmin = user?.role.toLowerCase() === 'admin';

  // Sync + skeleton state
  const [syncing, setSyncing] = useState(false);
  const [lastVerified, setLastVerified] = useState<string>(
    new Date().toISOString().replace('T', ' ').substring(0, 19)
  );

  // Drawer state
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<RepairStatus>>(new Set());

  // Quick entry search
  const [quickSearch, setQuickSearch] = useState('');

  // ============================================================
  // Memoized metrics
  // ============================================================

  const metrics = useMemo(() => {
    const total = repairs.length;
    const inRepair = repairs.filter((r) => r.status === 'In Progress');
    const readyForPickup = repairs.filter((r) => r.status === 'Ready');
    const delivered = repairs.filter((r) => r.status === 'Completed');
    const deliveredRevenue = delivered.reduce((sum, r) => sum + r.price, 0);
    const pendingAmount = readyForPickup
      .filter((r) => r.price > 0)
      .reduce((sum, r) => sum + r.price, 0);

    // Technician-specific
    const myAssigned = repairs.filter(
      (r) => r.technician === user?.username && r.status !== 'Completed' && r.status !== 'Cancelled'
    );
    const todayTarget = 8;
    const completedToday = repairs.filter(
      (r) =>
        r.technician === user?.username &&
        r.status === 'Completed' &&
        new Date(r.updated_at).toDateString() === new Date().toDateString()
    ).length;

    return {
      total,
      inRepair,
      readyForPickup,
      delivered,
      deliveredRevenue,
      pendingAmount,
      myAssigned,
      todayTarget,
      completedToday,
    };
  }, [repairs, user]);

  // Status distribution
  const distribution = useMemo(() => {
    const total = repairs.length || 1;
    return DISTRIBUTION_STATUSES.map((status) => {
      const count = repairs.filter((r) => r.status === status).length;
      const pct = (count / total) * 100;
      return { status, count, pct };
    });
  }, [repairs]);

  // Active users
  const activeUsers = useMemo(
    () => users.filter((u) => isUserActive(u.last_seen)),
    [users]
  );

  const queuedNotifications = useMemo(
    () => notifications.filter((n) => n.status === 'queued'),
    [notifications]
  );

  const recentRepairs = useMemo(
    () =>
      [...repairs]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5),
    [repairs]
  );

  const recentActivities = useMemo(() => activities.slice(0, 6), [activities]);

  // ============================================================
  // Drawer dataset
  // ============================================================

  const drawerData = useMemo(() => {
    if (drawer === 'active') {
      let rows = repairs.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled');
      if (statusFilter.size > 0) {
        rows = rows.filter((r) => statusFilter.has(r.status));
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.customer_name.toLowerCase().includes(q) ||
            r.repair_id.toLowerCase().includes(q) ||
            r.brand.toLowerCase().includes(q) ||
            r.model.toLowerCase().includes(q) ||
            r.phone.includes(q)
        );
      }
      return rows;
    }
    if (drawer === 'pending') {
      let rows = repairs.filter((r) => r.status === 'Ready' && r.price > 0);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.customer_name.toLowerCase().includes(q) ||
            r.repair_id.toLowerCase().includes(q) ||
            r.phone.includes(q)
        );
      }
      return rows;
    }
    return [];
  }, [drawer, repairs, statusFilter, searchQuery]);

  // ============================================================
  // Handlers
  // ============================================================

  const handleSync = useCallback(() => {
    setSyncing(true);
    service.heartbeat();
    setTimeout(() => {
      setSyncing(false);
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setLastVerified(stamp);
    }, 600);
  }, [service]);

  const openDrawer = (kind: DrawerKind) => {
    setDrawer(kind);
    setSearchQuery('');
    setStatusFilter(new Set());
  };

  const toggleStatusFilter = (status: RepairStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  // FIXED: Accessing the native DOM value directly here completely bypasses React's async batching lag, making barcode scans instantaneous and reliable.
  const handleQuickSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const inputEl = e.currentTarget.querySelector('input');
    const rawQuery = inputEl ? inputEl.value : quickSearch;
    const scannedQuery = rawQuery.trim();
    if (!scannedQuery) return;
    
    const found = repairs.find(
      (r) =>
        r.repair_id.toLowerCase() === scannedQuery.toLowerCase() ||
        r.repair_id.toLowerCase().includes(scannedQuery.toLowerCase())
    );
    
    if (found) {
      setPendingRepairDetailId(found.repair_id);
      setQuickSearch(''); // Reset state for next scan
      if (inputEl) inputEl.value = ''; // Reset input element text directly
    } else {
      setPendingRepairDetailId(null);
    }
    onNavigate('repairs');
  };

  // FIX: Clear out the underscore identifier prefix and dispatch the navigation intent payload
  const handleRowDoubleClick = (repairId: string) => {
    setPendingRepairDetailId(repairId);
    onNavigate('repairs');
  };

  // ============================================================
  // KPI cards
  // ============================================================

  const kpiCards = useMemo(() => {
    const cards: Array<{
      key: string;
      label: string;
      value: string | number;
      icon: ReactNode;
      color: string;
      sub: string;
      drawer: DrawerKind;
    }> = [
      {
        key: 'total',
        label: 'Total Records',
        value: metrics.total,
        icon: <Wrench className="h-5 w-5" />,
        color: 'bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400',
        sub: `${metrics.inRepair.length} in repair`,
        drawer: null as DrawerKind,
      },
      {
        key: 'inRepair',
        label: 'In Repair',
        value: metrics.inRepair.length,
        icon: <Clock className="h-5 w-5" />,
        color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400',
        sub: 'Active work orders',
        drawer: 'active' as DrawerKind,
      },
      {
        key: 'ready',
        label: 'Ready For Pickup',
        value: metrics.readyForPickup.length,
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
        sub: 'Awaiting customer',
        drawer: 'active' as DrawerKind,
      },
    ];

    if (isAdmin) {
      cards.push(
        {
          key: 'revenue',
          label: 'Delivered Revenue',
          value: metrics.deliveredRevenue,
          icon: <DollarSign className="h-5 w-5" />,
          color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
          sub: `${metrics.delivered.length} jobs delivered`,
          drawer: null as DrawerKind,
        },
        {
          key: 'pending',
          label: 'Pending Amount',
          value: metrics.pendingAmount,
          icon: <TrendingUp className="h-5 w-5" />,
          color: 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400',
          sub: 'Ready & unpaid',
          drawer: 'pending' as DrawerKind,
        }
      );
    } else {
      cards.push(
        {
          key: 'myLoad',
          label: 'My Assigned Task Load',
          value: metrics.myAssigned.length,
          icon: <UserCheck className="h-5 w-5" />,
          color: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400',
          sub: 'Active tickets assigned to me',
          drawer: 'active' as DrawerKind,
        },
        {
          key: 'target',
          label: "Today's Target",
          value: `${metrics.completedToday}/${metrics.todayTarget}`,
          icon: <Target className="h-5 w-5" />,
          color: 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400',
          sub: 'Completed jobs today',
          drawer: null as DrawerKind,
        }
      );
    }

    return cards;
  }, [metrics, isAdmin]);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header + Sync */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Control Center</h1>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Data Engine'}
          </button>
          <span className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">
            Last verified: {lastVerified}
          </span>
        </div>
      </div>

      {/* Quick Entry Command Bar */}
      <div className="mb-6 flex gap-3 items-stretch">
        <button
          onClick={() => {
            setPendingIntakeIntent(true);
            onNavigate('repairs');
          }}
          className="flex items-center gap-3 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 px-5 py-3 text-left transition-colors shadow-sm shrink-0"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 flex-shrink-0">
            <Plus className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Intake New Asset</p>
            <p className="text-xs text-brand-200 leading-tight">Register a new repair ticket</p>
          </div>
        </button>

        <form onSubmit={handleQuickSearch} className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Type or scan a Repair ID (e.g. REP-0001) and press Enter…  [Ctrl + /]"
            className="w-full h-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] pl-12 pr-4 py-3 text-sm text-gray-700 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20 shadow-sm"
          />
        </form>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {kpiCards.map((card, i) => (
          <div
            key={card.key}
            onClick={() => card.drawer && openDrawer(card.drawer)}
            className={`card p-5 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl animate-slide-up ${
              card.drawer ? 'cursor-pointer' : ''
            } ${syncing ? 'animate-pulse' : ''}`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {syncing ? (
              <div className="space-y-3">
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-8 w-16 rounded bg-gray-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-3 w-20 rounded bg-gray-100 dark:bg-slate-600 animate-pulse" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
                    {typeof card.value === 'number'
                      ? card.key === 'revenue' || card.key === 'pending'
                        ? `${card.value.toLocaleString()} USD`
                        : card.value
                      : card.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{card.sub}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}>
                  {card.icon}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status Distribution + Team Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Status distribution widget */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Status Distribution</h2>
            <button
              onClick={() => onNavigate('repairs')}
              className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Stacked horizontal bar */}
          <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
            {distribution.map((d) => {
              const palette = STATUS_PALETTE[d.status];
              if (d.count === 0) return null;
              return (
                <div
                  key={d.status}
                  className="h-full transition-all duration-500 relative group"
                  style={{
                    width: `${d.pct}%`,
                    backgroundColor: palette?.hex,
                  }}
                  title={`${palette?.label}: ${d.count} (${d.pct.toFixed(1)}%)`}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50" />
                </div>
              );
            })}
          </div>

          {/* Legend with counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {distribution.map((d) => {
              const palette = STATUS_PALETTE[d.status];
              return (
                <div key={d.status} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: palette?.hex }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">{palette?.label}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {d.count} · {d.pct.toFixed(0)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team status */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Team Status</h2>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-xs text-gray-500 dark:text-slate-400">{activeUsers.length} active</span>
            </div>
          </div>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-semibold text-sm">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#131b2e] ${
                      isUserActive(u.last_seen) ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{u.username}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">{u.role} · {formatTimeAgo(u.last_seen)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent repairs + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Recent Repairs</h2>
            <button
              onClick={() => onNavigate('repairs')}
              className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {recentRepairs.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => {
                  setPendingRepairDetailId(r.repair_id);
                  onNavigate('repairs');
                }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                  <Wrench className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                    {r.customer_name} · {r.brand} {r.model}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {r.repair_id} · Updated {formatTimeAgo(r.updated_at)}
                  </p>
                </div>
                <span className={`badge ${getStatusColor(r.status)}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Recent Activity</h2>
            <button
              onClick={() => onNavigate('activity')}
              className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {recentActivities.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex-shrink-0">
                  <span className="text-xs font-semibold">{a.username.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-slate-300">
                    <span className="font-medium text-gray-900 dark:text-slate-100">{a.username}</span> {a.activity}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{formatTimeAgo(a.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick alerts */}
      {queuedNotifications.length > 0 && (
        <div className="mt-4 card p-4 border-l-4 border-l-amber-400 dark:border-l-amber-500">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                {queuedNotifications.length} notification{queuedNotifications.length > 1 ? 's' : ''} queued for sending
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Review and dispatch from the notifications outbox</p>
            </div>
            <button onClick={() => onNavigate('notifications')} className="btn-secondary dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 text-xs">
              <Send className="h-3.5 w-3.5" /> Go to Outbox
            </button>
          </div>
        </div>
      )}

      {/* Drill-down Drawer */}
      {drawer && (
        <DrillDownDrawer
          kind={drawer}
          rows={drawerData}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onToggleStatus={toggleStatusFilter}
          onClose={() => setDrawer(null)}
          onRowDoubleClick={handleRowDoubleClick}
        />
      )}
    </div>
  );
}

// ============================================================
// Drill-down Drawer component
// ============================================================

interface DrillDownDrawerProps {
  kind: 'active' | 'pending';
  rows: RepairRecord[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: Set<RepairStatus>;
  onToggleStatus: (s: RepairStatus) => void;
  onClose: () => void;
  onRowDoubleClick: (repairId: string) => void;
}

function DrillDownDrawer({
  kind,
  rows,
  searchQuery,
  onSearchChange,
  statusFilter,
  onToggleStatus,
  onClose,
  onRowDoubleClick,
}: DrillDownDrawerProps) {
  const title = kind === 'active' ? 'Active Tickets' : 'Pending Payments';
  const showStatusFilter = kind === 'active';
  const filterableStatuses: RepairStatus[] = ['Pending', 'In Progress', 'Ready'];

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#131b2e] shadow-2xl animate-slide-in-right h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
            <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-slate-300">
              {rows.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 dark:border-slate-700 px-5 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, ID, phone, device..."
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2 text-sm text-gray-700 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20"
            />
          </div>

          {showStatusFilter && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Status:</span>
              {filterableStatuses.map((s) => {
                const palette = STATUS_PALETTE[s];
                const active = statusFilter.has(s);
                return (
                  <button
                    key={s}
                    onClick={() => onToggleStatus(s)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      active ? 'text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                    style={active ? { backgroundColor: palette?.hex } : undefined}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: active ? 'white' : palette?.hex }}
                    />
                    {palette?.label}
                  </button>
                );
              })}
              {statusFilter.size > 0 && (
                <button
                  onClick={() => statusFilter.forEach((s) => onToggleStatus(s))}
                  className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 mb-4">
                <Inbox className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">No records found</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Repair ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Device</th>
                  {kind === 'pending' && (
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                  )}
                  {kind === 'active' && (
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    onClick={() => onRowDoubleClick(r.repair_id)}
                    className={`border-b border-gray-100 dark:border-slate-700/50 transition-colors cursor-pointer hover:bg-brand-50/50 dark:hover:bg-slate-800/60 ${
                      i % 2 === 0 ? 'bg-white dark:bg-[#131b2e]' : 'bg-gray-50/30 dark:bg-slate-800/30'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-slate-300">{r.repair_id}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{r.customer_name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{r.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                      {r.brand} {r.model}
                    </td>
                    {kind === 'pending' && (
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {r.price.toLocaleString()} USD
                      </td>
                    )}
                    {kind === 'active' && (
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: STATUS_PALETTE[r.status]?.hex || '#6B7280' }}
                        >
                          {STATUS_PALETTE[r.status]?.label || r.status}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-200 dark:border-slate-700 px-5 py-2.5">
          <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
            Click any row to open the full repair file
          </p>
        </div>
      </aside>
    </div>
  );
}
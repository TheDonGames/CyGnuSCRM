import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Users, CircleUser as UserCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Pencil, KeyRound, ShieldCheck, X, ArrowUpDown, Inbox, Wrench, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { showToast } from '../components/Toast';
import { isUserActive, formatDateTime } from '../utils/helpers';
import { CustomerDatabaseView } from '../components/CustomerDatabaseView';
import type { UserRole } from '../types';

// ============================================================
// Types — Profile entities
// ============================================================

type StaffStatus = 'Online' | 'Offline' | 'Inactive';
type EntityType = 'customers' | 'staff';

interface StaffProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: StaffStatus;
  created_at: string;
}

type SortDir = 'asc' | 'desc';

interface SortState {
  field: string;
  dir: SortDir;
}

// ============================================================
// Component
// ============================================================

export function ProfilesPage() {
  const { state, service } = useStore();
  const currentUser = service.getCurrentUser();
  const isAdmin = currentUser?.role.toLowerCase() === 'admin';

  // Entity type toggle
  const [entityType, setEntityType] = useState<EntityType>('customers');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search (debounced)
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Sorting
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' });

  // Action menu (Hoisted)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Edit modal
  const [editModal, setEditModal] = useState<{ type: EntityType; id: string } | null>(null);

  // Reset credentials modal
  const [resetModal, setResetModal] = useState<{ id: string; username: string } | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  // Role change modal
  const [roleModal, setRoleModal] = useState<{ id: string; username: string; currentRole: UserRole } | null>(null);

  // ============================================================
  // Debounce search input
  // ============================================================

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Reset filters when switching entity type
  useEffect(() => {
    setStatusFilter('all');
    setRoleFilter('all');
    setCurrentPage(1);
    setSort({ field: entityType === 'customers' ? 'name' : 'username', dir: 'asc' });
  }, [entityType]);

  // ============================================================
  // Build profiles
  // ============================================================

  const staffProfiles = useMemo<StaffProfile[]>(() => {
    return state.users.map((u) => {
      const active = isUserActive(u.last_seen);
      let status: StaffStatus = 'Offline';
      if (active) status = 'Online';
      else if (!u.last_login) status = 'Inactive';
      return {
        id: u.id,
        username: u.username,
        email: '—',
        role: u.role,
        status,
        created_at: u.created_at,
      };
    });
  }, [state.users]);

  // ============================================================
  // Apply search + filters + sort (staff only)
  // ============================================================

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    let rows = staffProfiles;
    if (q) {
      rows = rows.filter(
        (r) =>
          r.username.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (roleFilter !== 'all') {
      rows = rows.filter((r) => r.role === roleFilter);
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sort.field as keyof StaffProfile];
      const bv = b[sort.field as keyof StaffProfile];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      return sort.dir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [staffProfiles, searchQuery, statusFilter, roleFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  // ============================================================
  // Handlers
  // ============================================================

  const handleSort = (field: string) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { field, dir: 'asc' };
    });
  };

  const handleOpenEdit = (id: string) => {
    setActionMenuId(null);
    setEditModal({ type: entityType, id });
  };

  const handleAction = (action: 'edit' | 'reset' | 'role', id: string) => {
    setActionMenuId(null);
    setMenuPosition(null);
    if (action === 'edit') {
      setEditModal({ type: entityType, id });
    } else if (action === 'reset' && entityType === 'staff') {
      const user = state.users.find((u) => u.id === id);
      if (user) {
        setTempPassword(generateTempPassword());
        setResetModal({ id, username: user.username });
      }
    } else if (action === 'role' && entityType === 'staff') {
      const user = state.users.find((u) => u.id === id);
      if (user) {
        setRoleModal({ id, username: user.username, currentRole: user.role });
      }
    }
  };

  const handleSaveEdit = (updates: Record<string, string>) => {
    if (!editModal) return;
    if (editModal.type === 'staff') {
      service.updateUser(editModal.id, {
        username: updates.username,
        password: updates.password,
      });
      showToast('success', `Staff profile updated`);
    }
    setEditModal(null);
  };

  const handleConfirmReset = () => {
    if (!resetModal) return;
    service.updateUser(resetModal.id, { password: tempPassword });
    showToast('success', `Password reset for ${resetModal.username}. Temporary password: ${tempPassword}`);
    setResetModal(null);
  };

  const handleConfirmRole = (newRole: UserRole) => {
    if (!roleModal) return;
    if (roleModal.id === currentUser?.id && newRole !== currentUser.role) {
      showToast('error', 'You cannot change your own role');
      return;
    }
    service.updateUser(roleModal.id, { role: newRole });
    showToast('success', `${roleModal.username} role changed to ${newRole}`);
    setRoleModal(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showToast('success', 'Copied to clipboard'));
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Online', label: 'Online' },
    { value: 'Offline', label: 'Offline' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Profiles Management</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          {entityType === 'customers'
            ? 'Customer relationship management'
            : `${staffProfiles.length} staff accounts · ${staffProfiles.filter((s) => s.status === 'Online').length} online`}
        </p>
      </div>

      <div className="mb-4 flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-slate-900/50 p-1 w-fit">
        <button
          onClick={() => setEntityType('customers')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            entityType === 'customers'
              ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm'
              : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
        >
          <UserCircle className="h-4 w-4" /> Customer Database
        </button>
        {isAdmin && (
          <button
            onClick={() => setEntityType('staff')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              entityType === 'staff'
                ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="h-4 w-4" /> Staff Accounts
          </button>
        )}
      </div>

      {/* Conditional content: Customer Database or Staff Accounts */}
      {entityType === 'customers' ? (
        <CustomerDatabaseView />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by username or email..."
                className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] pl-10 pr-4 py-2 text-sm text-gray-700 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] px-3 py-2 text-sm text-gray-700 dark:text-slate-100 focus:border-brand-400 focus:outline-none"
            >
              {statusOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] px-3 py-2 text-sm text-gray-700 dark:text-slate-100 focus:border-brand-400 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="technician">Technician</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] px-3 py-2 text-sm text-gray-700 dark:text-slate-100 focus:border-brand-400 focus:outline-none"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50 dark:bg-[#0b0f19] border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <SortHeader label="Username" field="username" sort={sort} onSort={handleSort} />
                    <SortHeader label="Email" field="email" sort={sort} onSort={handleSort} />
                    <SortHeader label="Role" field="role" sort={sort} onSort={handleSort} />
                    <SortHeader label="Status" field="status" sort={sort} onSort={handleSort} />
                    <SortHeader label="Date Created" field="created_at" sort={sort} onSort={handleSort} />
                    <th className="px-4 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 mb-4">
                            <Inbox className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">No staff found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, i) => (
                      <tr
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        className={`border-b border-gray-100 dark:border-slate-800 transition-colors hover:bg-brand-50/40 dark:hover:bg-brand-950/20 animate-slide-up ${
                          i % 2 === 0 ? 'bg-white dark:bg-[#131b2e]' : 'bg-gray-50/30 dark:bg-slate-800/10'
                        }`}
                        style={{ animationDelay: `${i * 30}ms` }}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button')) return;
                          handleOpenEdit(row.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenEdit(row.id);
                          }
                        }}
                      >
                        <StaffRow
                          row={row as StaffProfile}
                          onMenuToggle={(event) => {
                            if (actionMenuId === row.id) {
                              setActionMenuId(null);
                              setMenuPosition(null);
                              return;
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            const menuWidth = 224;
                            const x = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth));
                            const y = Math.max(12, Math.min(window.innerHeight - 200, rect.bottom + 4));
                            setActionMenuId(row.id);
                            setMenuPosition({ x, y });
                          }}
                        />
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-800 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Showing {filteredData.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredData.length)} of{' '}
                {filteredData.length} records
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Staff Action Menu */}
          {actionMenuId && (
            <>
              <div
                className="fixed inset-0 z-[60]"
                onClick={() => { setActionMenuId(null); setMenuPosition(null); }}
              />
              <div
                className="fixed z-[70] w-56 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] py-1.5 shadow-xl animate-fade-in"
                style={{ top: menuPosition?.y ?? 0, left: menuPosition?.x ?? 0 }}
              >
                <button
                  onClick={() => handleAction('edit', actionMenuId)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Pencil className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Edit Profile Details
                </button>
                <button
                  onClick={() => handleAction('reset', actionMenuId)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <KeyRound className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Reset Credentials
                </button>
                <div className="my-1.5 border-t border-gray-100 dark:border-slate-800" />
                <button
                  onClick={() => handleAction('role', actionMenuId)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Modify Access Role
                </button>
              </div>
            </>
          )}

          {/* Edit Profile Drawer */}
          {editModal && (
            <EditProfileDrawer
              modal={editModal}
              staff={state.users.find((u) => u.id === editModal.id) || null}
              onSave={handleSaveEdit}
              onClose={() => setEditModal(null)}
            />
          )}

          {/* Reset Credentials Drawer */}
          {resetModal && (
            <div className="fixed inset-0 z-[80] flex justify-end">
              <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm animate-fade-in" onClick={() => setResetModal(null)} />
              <aside className="relative z-10 flex w-full max-w-md flex-col bg-white dark:bg-[#131b2e] shadow-2xl animate-slide-in-right border-l border-gray-200 dark:border-slate-800">
                <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-transparent" />
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-800">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 mb-0.5">Staff Account</p>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 leading-tight">Reset Credentials</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{resetModal.username}</p>
                  </div>
                  <button onClick={() => setResetModal(null)} className="ml-4 shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 px-6 py-5 space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 px-4 py-3">
                    <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">Issue a temporary access string for <span className="font-semibold">{resetModal.username}</span>. They must change it on next login.</p>
                  </div>
                  <div>
                    <label className="label">Temporary Password</label>
                    <div className="flex gap-2">
                      <input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} className="input flex-1 font-mono" />
                      <button onClick={() => copyToClipboard(tempPassword)} className="btn-secondary" title="Copy to clipboard">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setTempPassword(generateTempPassword())} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                    Generate new random password
                  </button>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-[#131b2e]">
                  <button onClick={() => setResetModal(null)} className="btn-secondary">Cancel</button>
                  <button onClick={handleConfirmReset} className="btn-primary">Confirm Reset</button>
                </div>
              </aside>
            </div>
          )}

          {/* Role Change Drawer */}
          {roleModal && (
            <div className="fixed inset-0 z-[80] flex justify-end">
              <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm animate-fade-in" onClick={() => setRoleModal(null)} />
              <aside className="relative z-10 flex w-full max-w-md flex-col bg-white dark:bg-[#131b2e] shadow-2xl animate-slide-in-right border-l border-gray-200 dark:border-slate-800">
                <div className="h-0.5 w-full bg-gradient-to-r from-brand-500 via-brand-400 to-transparent" />
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-800">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 mb-0.5">Access Control</p>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 leading-tight">Modify Access Role</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{roleModal.username}</p>
                  </div>
                  <button onClick={() => setRoleModal(null)} className="ml-4 shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 px-6 py-5 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-slate-400">Select a permission level for <span className="font-semibold text-gray-900 dark:text-slate-100">{roleModal.username}</span>.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleConfirmRole('admin')}
                      className={`flex flex-col items-center gap-2.5 rounded-xl border-2 p-5 transition-all ${roleModal.currentRole === 'admin' ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/20' : 'border-gray-200 dark:border-slate-700 hover:border-brand-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                    >
                      <ShieldCheck className={`h-7 w-7 ${roleModal.currentRole === 'admin' ? 'text-brand-600' : 'text-gray-400 dark:text-slate-500'}`} />
                      <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">Admin</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400 text-center leading-tight">Full system access</span>
                    </button>
                    <button
                      onClick={() => handleConfirmRole('technician')}
                      className={`flex flex-col items-center gap-2.5 rounded-xl border-2 p-5 transition-all ${roleModal.currentRole === 'technician' ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/20' : 'border-gray-200 dark:border-slate-700 hover:border-brand-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                    >
                      <Wrench className={`h-7 w-7 ${roleModal.currentRole === 'technician' ? 'text-brand-600' : 'text-gray-400 dark:text-slate-500'}`} />
                      <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">Technician</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400 text-center leading-tight">Repair workflow access</span>
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Cleaned up sub-components
// ============================================================

interface SortHeaderProps {
  label: string;
  field: string;
  sort: SortState;
  onSort: (field: string) => void;
  align?: 'left' | 'right';
}

function SortHeader({ label, field, sort, onSort, align = 'left' }: SortHeaderProps) {
  const isActive = sort.field === field;
  return (
    <th
      className={`px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(field)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        {isActive ? sort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 text-gray-300" />}
      </span>
    </th>
  );
}

function StaffRow({ row, onMenuToggle }: { row: StaffProfile; onMenuToggle: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${row.role === 'admin' ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}>
              {row.username.charAt(0).toUpperCase()}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white dark:border-[#131b2e] ${row.status === 'Online' ? 'bg-emerald-500' : row.status === 'Inactive' ? 'bg-red-400' : 'bg-gray-300'}`} />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{row.username}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400">{row.email}</td>
      <td className="px-4 py-2.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${row.role === 'admin' ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>
          {row.role === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
          {row.role}
        </span>
      </td>
      <td className="px-4 py-2.5"><StatusPill status={row.status} /></td>
      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400">{formatDateTime(row.created_at)}</td>
      <td className="px-4 py-2.5">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMenuToggle(e); }}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </td>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string; icon?: React.ReactNode }> = {
    Active: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', icon: <CheckCircle2 className="h-3 w-3" /> },
    Online: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', icon: <CheckCircle2 className="h-3 w-3" /> },
    Suspended: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', icon: <AlertCircle className="h-3 w-3" /> },
    Inactive: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', icon: <AlertCircle className="h-3 w-3" /> },
    Offline: { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  };
  const c = config[status] || { bg: 'bg-gray-100 dark:bg-slate-800', text: 'text-gray-600 dark:text-slate-400', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${c.bg} ${c.text} px-2.5 py-0.5 text-xs font-medium`}>
      {c.icon || <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />}
      {status}
    </span>
  );
}

function EditProfileDrawer({ modal, staff, onSave, onClose }: { modal: { type: string; id: string }; staff: any; onSave: (u: Record<string, string>) => void; onClose: () => void }) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    if (staff) return { username: String(staff.username ?? ''), password: String(staff.password ?? '') };
    return {};
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="relative z-10 flex w-full max-w-md flex-col bg-white dark:bg-[#131b2e] shadow-2xl animate-slide-in-right border-l border-gray-200 dark:border-slate-800">
        <div className="h-0.5 w-full bg-gradient-to-r from-brand-500 via-brand-400 to-transparent" />
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 mb-0.5">Staff Profile</p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 leading-tight">Edit — {staff?.username}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Update profile details</p>
          </div>
          <button onClick={onClose} className="ml-4 shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form id="edit-profile-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div><label className="label">Username</label><input className="input" value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} autoFocus required /></div>
          <div><label className="label">Password</label><input className="input font-mono" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
        </form>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-[#131b2e]">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="edit-profile-form" className="btn-primary">Save Changes</button>
        </div>
      </aside>
    </div>
  );
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 10; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return `Temp${result}`;
}
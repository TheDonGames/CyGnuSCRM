import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Wrench,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronDown as ChevronDownIcon,
  Layers,
  User,
  DollarSign,
  Printer,
  ScanLine,
  ClipboardCheck,
  Receipt,
  Building2,
  FileText,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getStatusColor, getStatusDotColor, formatDate } from '../utils/helpers';
import { RepairDrawer } from '../components/RepairDrawer';
import { RepairDetailDrawer } from '../components/RepairDetailDrawer';
import { DocumentPreviewModal, type PreviewType } from '../components/DocumentPreviewModal';
import { showToast } from '../components/Toast';
import type { RepairRecord, RepairStatus } from '../types';

const STATUSES: RepairStatus[] = [
  'Pending',
  'In Progress',
  'Awaiting Parts',
  'Ready',
  'Completed',
  'Cancelled',
];

// Module-level intent flags — set by Dashboard before navigating
export let pendingIntakeIntent = false;
export function setPendingIntakeIntent(v: boolean) { pendingIntakeIntent = v; }

export let pendingRepairDetailId: string | null = null;
export function setPendingRepairDetailId(repairId: string | null) { pendingRepairDetailId = repairId; }

type SortField = 'repair_id' | 'customer_name' | 'date_in' | 'price';
type SortDirection = 'asc' | 'desc';

export function RepairsPage() {
  const { state, service } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<RepairRecord | null>(null);
  const [detailRepair, setDetailRepair] = useState<RepairRecord | null>(null);
  const [printMenuOpenId, setPrintMenuOpenId] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType | null>(null);
  const [previewRepair, setPreviewRepair] = useState<RepairRecord | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('repair_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Auto-open drawer if Dashboard requested intake
  useEffect(() => {
    if (pendingIntakeIntent) {
      pendingIntakeIntent = false;
      setEditingRepair(null);
      setFormOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!pendingRepairDetailId) return;

    const requestedId = pendingRepairDetailId;
    pendingRepairDetailId = null;

    const repairToOpen = state.repairs.find(
      (r) => r.repair_id === requestedId || r.id === requestedId
    );

    if (repairToOpen) {
      setDetailRepair(repairToOpen);
    }
  }, [state.repairs]);

  // حساب عدد الفواتير لكل حالة بشكل ديناميكي للـ Badges العليا
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: state.repairs.length };
    STATUSES.forEach((s) => {
      counts[s] = state.repairs.filter((r) => r.status === s).length;
    });
    return counts;
  }, [state.repairs]);

  // إدارة الترتيب عند الضغط على الهيدر
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // الفلترة والبحث والترتيب المتقدم بعد حل مشكلة الـ Empty String
  const filteredAndSorted = useMemo(() => {
    // 1. الفلترة والبحث النظيف
    const res = state.repairs.filter((r) => {
      const q = search.toLowerCase().trim();
      
      // إذا ما في نص بحث، اعرض حسب فلتر الحالة فقط
      if (!q) return statusFilter === 'all' || r.status === statusFilter;

      // استخراج الأرقام فقط للبحث بـ phone_norm
      const digitQuery = q.replace(/\D/g, '');

      // حماية الحقول بـ || '' لمنع الـ Crash وفحص ذكي للهاتف
      const matchesSearch =
        (r.customer_name || '').toLowerCase().includes(q) ||
        (r.repair_id || '').toLowerCase().includes(q) ||
        (r.phone || '').includes(q) ||
        (r.brand || '').toLowerCase().includes(q) ||
        (r.model || '').toLowerCase().includes(q) ||
        (r.serial || '').toLowerCase().includes(q) ||
        (digitQuery ? (r.phone_norm || '').includes(digitQuery) : false); // حماية الفحص الرقمي هنا

      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // 2. الترتيب (Sorting)
    return res.sort((a, b) => {
      let modifier = sortDirection === 'asc' ? 1 : -1;
      
      if (sortField === 'price') {
        return ((a.price || 0) - (b.price || 0)) * modifier;
      }
      if (sortField === 'date_in') {
        return (new Date(a.date_in || 0).getTime() - new Date(b.date_in || 0).getTime()) * modifier;
      }
      
      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();
      
      if (valA < valB) return -1 * modifier;
      if (valA > valB) return 1 * modifier;
      return 0;
    });
  }, [state.repairs, search, statusFilter, sortField, sortDirection]);

  const handleCreate = () => {
    setEditingRepair(null);
    setFormOpen(true);
  };

  const handleViewDetails = (repair: RepairRecord) => {
    setDetailRepair(repair);
  };

  const handleEdit = (repair: RepairRecord) => {
    setEditingRepair(repair);
    setFormOpen(true);
  };

  const handleDelete = (repair: RepairRecord) => {
    if (confirm(`Delete repair ${repair.repair_id} for ${repair.customer_name}?`)) {
      service.deleteRepair(repair.id);
      showToast('success', `Repair ${repair.repair_id} deleted`);
    }
  };

  // رندر أيقونة الأسهم البروفشنال للهيدرز
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1.5 opacity-40 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3.5 w-3.5 ml-1.5 text-brand-600 font-bold" /> 
      : <ChevronDown className="h-3.5 w-3.5 ml-1.5 text-brand-600 font-bold" />;
  };

  // توليد لون عشوائي وثابت لكل تكنشن لعرض الـ Avatar بشكل جذاب
  const getTechAvatarStyle = (techName: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-sky-100 text-sky-700 border-sky-200',
      'bg-pink-100 text-pink-700 border-pink-200',
    ];
    let sum = 0;
    const nameStr = techName || 'UN';
    for (let i = 0; i < nameStr.length; i++) sum += nameStr.charCodeAt(i);
    return colors[sum % colors.length];
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Repairs Workflow</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor, assign, and update active repair operations.
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary shadow-sm hover:shadow transition-all duration-200">
          <Plus className="h-4 w-4 stroke-[2.5]" /> New Repair Order
        </button>
      </div>

      {/* International Grade Quick Filter Tabs */}
      <div className="flex overflow-x-auto pb-px border-b border-gray-200 dark:border-slate-700 mb-5 gap-1 no-scrollbar">
        <button
          onClick={() => setStatusFilter('all')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-all whitespace-nowrap ${
            statusFilter === 'all'
              ? 'border-brand-600 dark:border-brand-400 text-brand-600 dark:text-brand-400 bg-brand-50/40 dark:bg-brand-900/20'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
          }`}
        >
          <Layers className="h-4 w-4" />
          All Orders
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
            statusFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
          }`}>
            {statusCounts.all}
          </span>
        </button>

        {STATUSES.map((s) => {
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'border-brand-600 dark:border-brand-400 text-brand-600 dark:text-brand-400 bg-brand-50/40 dark:bg-brand-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${getStatusDotColor(s)}`} />
              {s}
              <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
              }`}>
                {statusCounts[s] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Advanced Search Component */}
      <div className="card p-4 mb-5 shadow-sm border border-gray-200/80 dark:border-slate-700/60 bg-white dark:bg-[#131b2e]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Global search by client profile, Ticket ID, phone, hardware serial, or device model..."
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-gray-200/70 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Enterprise Grid Data Table */}
      <div className="card overflow-hidden shadow-sm border border-gray-200/80 dark:border-slate-700/60 bg-white dark:bg-[#131b2e] rounded-xl">
        <div className="overflow-x-auto whitespace-nowrap">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50/70 dark:bg-[#0b0f19] border-b border-gray-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 select-none">
                <th onClick={() => handleSort('repair_id')} className="group px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center">Ticket ID {renderSortIcon('repair_id')}</div>
                </th>
                <th onClick={() => handleSort('customer_name')} className="group px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center">Client Details {renderSortIcon('customer_name')}</div>
                </th>
                <th className="px-4 py-3 w-52">Asset & Issue</th>
                <th className="px-4 py-3">Workflow Status</th>
                <th className="px-4 py-3">Assigned Tech</th>
                <th onClick={() => handleSort('date_in')} className="group px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors whitespace-nowrap">
                  <div className="flex items-center">Date Logged {renderSortIcon('date_in')}</div>
                </th>
                <th onClick={() => handleSort('price')} className="group px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center">Cost (USD) {renderSortIcon('price')}</div>
                </th>
                <th className="px-4 py-3 text-right sticky right-0 bg-gray-50/70 dark:bg-[#0b0f19] border-l border-transparent dark:border-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/70">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-gray-400">
                    <div className="bg-gray-50 dark:bg-slate-700 h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100 dark:border-slate-600">
                      <Wrench className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-base font-medium text-gray-700 dark:text-gray-300">No repair records match criteria</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try resetting your search query or switching active work status filters.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((r) => (
                  <tr
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                    onClick={() => handleViewDetails(r)}
                    onDoubleClick={() => handleEdit(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleViewDetails(r);
                      }
                    }}
                  >
                    {/* ID */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold bg-gray-100 dark:bg-slate-800/70 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 px-2 py-1 rounded">
                        {r.repair_id}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{r.customer_name}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{r.phone}</span>
                      </div>
                    </td>

                    {/* Device */}
                    <td className="px-4 py-2">
                      <div className="max-w-52">
                        <p className="font-medium text-gray-800 dark:text-slate-200 text-sm truncate" title={`${r.brand} ${r.model}`}>
                          {r.brand} <span className="text-gray-500 dark:text-slate-400 font-normal">{r.model}</span>
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5" title={r.problem}>
                          {r.problem}
                        </p>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`badge px-2.5 py-1 text-xs font-medium rounded-md shadow-sm border border-black/5 dark:border-white/5 ${getStatusColor(r.status)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 inline-block ${getStatusDotColor(r.status)}`} />
                        {r.status}
                      </span>
                    </td>

                    {/* Tech Avatar */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      {r.technician ? (
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 rounded-full border flex items-center justify-center text-xs font-bold font-mono tracking-tighter ${getTechAvatarStyle(r.technician)}`}>
                            {r.technician.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-slate-300 capitalize">{r.technician}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500 italic text-sm">
                          <div className="h-7 w-7 rounded-full border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center">
                            <User className="h-3 w-3 text-gray-400 dark:text-slate-500" />
                          </div>
                          <span>Unassigned</span>
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-slate-400">{formatDate(r.date_in)}</span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center text-gray-900 dark:text-white font-bold font-mono text-sm">
                        <DollarSign className="h-3.5 w-3.5 text-gray-400 -mr-0.5 stroke-[2.5]" />
                        {(r.price || 0).toFixed(0)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white dark:bg-[#131b2e] group-hover:bg-slate-50/80 dark:group-hover:bg-[#1a2540] border-l border-transparent dark:border-slate-800/60 transition-colors" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailRepair(r)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400 border border-transparent hover:border-brand-100 dark:hover:border-brand-800 transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(r)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-100 dark:hover:border-blue-800 transition-all"
                          title="Edit Ticket"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 border border-transparent hover:border-red-100 dark:hover:border-red-800 transition-all"
                          title="Delete Ticket"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {/* Print dropdown */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintMenuOpenId(printMenuOpenId === r.id ? null : r.id);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800 transition-all"
                            title="Print Documents"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {printMenuOpenId === r.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-lg z-50 overflow-hidden py-1">
                              {[
                                { key: 'barcode' as const, icon: ScanLine, label: 'Print Label' },
                                { key: 'deposit' as const, icon: ClipboardCheck, label: 'Deposit Receipt' },
                                { key: 'standard' as const, icon: Receipt, label: 'Standard Receipt' },
                                { key: 'corporate' as const, icon: Building2, label: 'Corporate Receipt' },
                                { key: 'invoice' as const, icon: FileText, label: 'Final Invoice' },
                              ].map(({ key, icon: Icon, label }) => (
                                <button
                                  key={key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewType(key);
                                    setPreviewRepair(r);
                                    setPrintMenuOpenId(null);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-brand-700 dark:hover:text-brand-400 transition-colors"
                                >
                                  <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
                                  {label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* International Grade Grid Summary Footer */}
        <div className="bg-gray-50 dark:bg-[#0b0f19] border-t border-gray-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between text-xs text-gray-500 dark:text-slate-500 font-medium">
          <div>
            Showing <span className="text-gray-700 dark:text-gray-300 font-bold">{filteredAndSorted.length}</span> of <span className="text-gray-700 dark:text-gray-300 font-bold">{state.repairs.length}</span> total tracking tickets.
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
            <span>Sorted by: <span className="text-brand-600 dark:text-brand-400 font-semibold capitalize">{sortField.replace('_', ' ')}</span> ({sortDirection.toUpperCase()})</span>
          </div>
        </div>
      </div>

      {/* Drawer Container Component */}
      <RepairDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingRepair={editingRepair}
      />

      {/* Right-side Detail Drawer */}
      <RepairDetailDrawer
        repair={detailRepair}
        open={!!detailRepair}
        onClose={() => setDetailRepair(null)}
        onEdit={(repair) => {
          setDetailRepair(null);
          handleEdit(repair);
        }}
        onPrint={(type, repair) => {
          setPreviewType(type);
          setPreviewRepair(repair);
        }}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={previewType !== null}
        type={previewType}
        repair={previewRepair}
        onClose={() => setPreviewType(null)}
      />
    </div>
  );
}
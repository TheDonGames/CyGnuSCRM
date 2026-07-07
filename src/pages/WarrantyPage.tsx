import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Smartphone,
  User,
  Calendar,
  History,
  Timer,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { showToast } from '../components/Toast';
import { formatDate } from '../utils/helpers';
import type { RepairRecord } from '../types';

const DEFAULT_WARRANTY_DAYS = 90;

interface WarrantyAsset {
  id: string;
  repairId: string;
  customerName: string;
  phone: string;
  deviceDescription: string;
  serial: string;
  deliveryDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'Active' | 'Expired' | 'Claim Window';
  isClaimed: boolean;
  rawRecord: RepairRecord;
}

type SortField = 'expiryDate' | 'customerName' | 'daysRemaining' | 'repairId';
type SortDir = 'asc' | 'desc';

export function WarrantyPage() {
  const { state } = useStore();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expired' | 'Claims'>('All');
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'expiryDate', dir: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyAsset | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const warranties = useMemo<WarrantyAsset[]>(() => {
    const records = state.repairs;
    const now = new Date();

    return records
      .filter((r) => r.status === 'Completed' || r.status === 'Ready' || r.date_out)
      .map((repair) => {
        const startTimestamp = repair.date_out || repair.date_in;
        const startDate = new Date(startTimestamp);
        const expiryDate = new Date(startDate);
        expiryDate.setDate(startDate.getDate() + DEFAULT_WARRANTY_DAYS);

        const timeDiff = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        const subsequentTickets = records.filter(
          (r) =>
            r.serial === repair.serial &&
            r.serial !== '—' &&
            new Date(r.date_in).getTime() > new Date(repair.date_in).getTime()
        );
        const isClaimed = subsequentTickets.length > 0;

        let status: 'Active' | 'Expired' | 'Claim Window' = 'Active';
        if (isClaimed) status = 'Claim Window';
        else if (daysRemaining <= 0) status = 'Expired';

        return {
          id: repair.id,
          repairId: repair.repair_id || `REP-${repair.id.substring(0, 4)}`,
          customerName: repair.customer_name,
          phone: repair.phone,
          deviceDescription: `${repair.brand} ${repair.model}`,
          serial: repair.serial || '—',
          deliveryDate: startTimestamp,
          expiryDate: expiryDate.toISOString(),
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          status,
          isClaimed,
          rawRecord: repair,
        };
      });
  }, [state.repairs]);

  const metrics = useMemo(() => {
    let active = 0, expired = 0, claims = 0;
    warranties.forEach((w) => {
      if (w.status === 'Active') active++;
      if (w.status === 'Expired') expired++;
      if (w.status === 'Claim Window') claims++;
    });
    return { active, expired, claims, total: warranties.length };
  }, [warranties]);

  const filteredData = useMemo(() => {
    let result = [...warranties];
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        w =>
          w.repairId.toLowerCase().includes(q) ||
          w.customerName.toLowerCase().includes(q) ||
          w.deviceDescription.toLowerCase().includes(q) ||
          w.serial.toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'Active') result = result.filter((w) => w.status === 'Active');
    if (statusFilter === 'Expired') result = result.filter((w) => w.status === 'Expired');
    if (statusFilter === 'Claims') result = result.filter((w) => w.status === 'Claim Window');
    result.sort((a, b) => {
      let av = a[sort.field];
      let bv = b[sort.field];
      if (sort.field === 'daysRemaining') {
        return sort.dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
      }
      return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return result;
  }, [warranties, searchQuery, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  const handleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getStatusBadge = (status: WarrantyAsset['status']) => {
    if (status === 'Active') return 'bg-green-50 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-400 border-green-200 dark:border-emerald-900/30';
    if (status === 'Claim Window') return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30';
    return 'bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-300 border-gray-200 dark:border-slate-700/30';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            Warranty Status Control
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Monitor active post-repair guarantees, calculate track timelines, and supervise return claims.
          </p>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 dark:bg-slate-900/50 p-1 self-start md:self-auto">
          {(['All', 'Active', 'Claims', 'Expired'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1 ${
                statusFilter === f
                  ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm'
                  : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              {f === 'Active' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              {f === 'Claims' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              {f === 'All' ? `All Coverage (${metrics.total})` :
               f === 'Active' ? `Active (${metrics.active})` :
               f === 'Claims' ? `Claims Raised (${metrics.claims})` :
               `Expired (${metrics.expired})`}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Active Guard Assays</p>
            <p className="text-xl font-black text-gray-900 dark:text-slate-100">{metrics.active} Items</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Return Loss Rate</p>
            <p className="text-xl font-black text-gray-900 dark:text-slate-100">
              {metrics.total > 0 ? ((metrics.claims / metrics.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-slate-500 dark:text-slate-400">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Standard Window Duration</p>
            <p className="text-xl font-black text-gray-900 dark:text-slate-100">{DEFAULT_WARRANTY_DAYS} Days</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter protected inventory assets via job id, customer signature, or hardware index..."
            className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] pl-10 pr-4 py-2 text-sm text-gray-700 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50 dark:bg-[#0b0f19] text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-800 select-none">
              <tr>
                <th className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('repairId')}>
                  <div className="flex items-center gap-1.5">Origin Job <SlidersHorizontal className="h-3 w-3 text-gray-400 dark:text-slate-500" /></div>
                </th>
                <th className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('customerName')}>
                  <div className="flex items-center gap-1.5">Billed Holder <SlidersHorizontal className="h-3 w-3 text-gray-400 dark:text-slate-500" /></div>
                </th>
                <th className="px-5 py-3">Hardware Profile</th>
                <th className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 text-center transition-colors" onClick={() => handleSort('expiryDate')}>
                  <div className="flex items-center justify-center gap-1.5">Coverage Expiration <SlidersHorizontal className="h-3 w-3 text-gray-400 dark:text-slate-500" /></div>
                </th>
                <th className="px-5 py-3 cursor-pointer text-center hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('daysRemaining')}>
                  <div className="flex items-center justify-center gap-1.5">Timeline Delta <SlidersHorizontal className="h-3 w-3 text-gray-400 dark:text-slate-500" /></div>
                </th>
                <th className="px-5 py-3 text-center">Status Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 font-medium">
                    No active or registered item guarantees correspond with chosen filter variables.
                  </td>
                </tr>
              ) : (
                paginatedData.map((w) => (
                  <tr
                    key={w.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    onClick={() => { setSelectedWarranty(w); setDrawerOpen(true); }}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800/70 text-gray-900 dark:text-slate-200 rounded px-2 py-0.5 text-xs font-bold border border-gray-200 dark:border-slate-700 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
                        {w.repairId}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-gray-900 dark:text-slate-100">{w.customerName}</span>
                        <span className="text-gray-400 dark:text-slate-500 mt-0.5">{w.phone}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800 dark:text-slate-200">{w.deviceDescription}</span>
                        <span className="text-[11px] font-mono text-gray-400 dark:text-slate-500 mt-0.5">SN: {w.serial}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs font-medium text-gray-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(w.expiryDate)}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-gray-900 dark:text-slate-100 text-xs">
                      {w.status === 'Expired' ? (
                        <span className="text-gray-400 dark:text-slate-500">—</span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300">
                          <Clock className="h-3 w-3 text-gray-400 dark:text-slate-500" /> {w.daysRemaining} days left
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(w.status)}`}>
                        {w.status === 'Claim Window' && <AlertCircle className="h-3 w-3" />}
                        {w.status === 'Claim Window' ? 'Claim Filed' : w.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 dark:bg-[#0b0f19] border-t border-gray-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between text-xs text-gray-500 dark:text-slate-500 font-medium select-none">
          <div>
            Showing <span className="text-gray-700 dark:text-slate-300 font-bold">{filteredData.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span> to{' '}
            <span className="text-gray-700 dark:text-slate-300 font-bold">{Math.min(safePage * pageSize, filteredData.length)}</span> of{' '}
            <span className="text-gray-700 dark:text-slate-300 font-bold">{filteredData.length}</span> registry records.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-gray-600 dark:text-slate-400">Page <span className="font-bold text-gray-800 dark:text-slate-200">{safePage}</span> of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer Backdrop */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity animate-fade-in" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Right Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-[#131b2e] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-slate-800 flex flex-col ${
        drawerOpen && selectedWarranty ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {selectedWarranty && (
          <>
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-[#0b0f19]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Warranty Audit Checklist</h3>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Asset Reference: {selectedWarranty.repairId}</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-800 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Hardware Profile */}
              <div className="border border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f19] rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Smartphone className="h-4 w-4 text-gray-400 dark:text-slate-500 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900 dark:text-slate-100 block">{selectedWarranty.deviceDescription}</span>
                    <span className="font-mono text-gray-500 dark:text-slate-400 mt-0.5 block">Serial: {selectedWarranty.serial}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200/60 dark:border-slate-800/60 pt-2.5 flex items-start gap-2.5">
                  <User className="h-4 w-4 text-gray-400 dark:text-slate-500 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-semibold text-gray-900 dark:text-slate-100 block">{selectedWarranty.customerName}</span>
                    <span className="text-gray-500 dark:text-slate-400 mt-0.5 block">{selectedWarranty.phone}</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Protection Timeline Logs
                </h4>
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-2 space-y-4">
                  <div className="relative pl-5">
                    <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-emerald-500" />
                    <div className="text-xs">
                      <span className="font-bold text-gray-900 dark:text-slate-100">Job Delivered / Dispatched</span>
                      <p className="text-gray-400 dark:text-slate-500 mt-0.5">{formatDate(selectedWarranty.deliveryDate)}</p>
                    </div>
                  </div>
                  <div className="relative pl-5">
                    <div className={`absolute -left-[5px] top-1 h-2 w-2 rounded-full ${selectedWarranty.status === 'Expired' ? 'bg-gray-400' : 'bg-brand-500'}`} />
                    <div className="text-xs">
                      <span className="font-bold text-gray-900 dark:text-slate-100">Calculated Expiration Point</span>
                      <p className="text-gray-400 dark:text-slate-500 mt-0.5">{formatDate(selectedWarranty.expiryDate)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Context */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Historical Service Origin
                </h4>
                <div className="bg-white dark:bg-[#0b0f19] border border-gray-100 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs shadow-sm">
                  <div>
                    <span className="text-gray-400 dark:text-slate-500 block font-medium">Addressed Component Failure</span>
                    <span className="text-gray-800 dark:text-slate-200 font-medium">{selectedWarranty.rawRecord.problem || '—'}</span>
                  </div>
                  {selectedWarranty.rawRecord.technician_notes && (
                    <div className="pt-1.5 border-t border-gray-50 dark:border-slate-800">
                      <span className="text-gray-400 dark:text-slate-500 block font-medium">Technician Repair Manifest Summary</span>
                      <p className="text-gray-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border border-dashed border-gray-200 dark:border-slate-700 mt-1">
                        {selectedWarranty.rawRecord.technician_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Claim Warning */}
              {selectedWarranty.status === 'Claim Window' && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 flex gap-3 text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-900 dark:text-amber-300">Linked Return Claim Discovered</span>
                    This specific device assembly has returned to the workshop configuration on a subsequent repair ticket. Cross-reference internal parts manifests to confirm if active components are eligible for coverage.
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Clock,
  AlertTriangle,
  Copy,
  Cpu,
  History,
  SlidersHorizontal,
  X,
  User,
  Phone,
  Calendar
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { showToast } from '../components/Toast';
import { formatDate } from '../utils/helpers';
import type { RepairRecord, RepairStatus } from '../types';

interface DeviceAsset {
  serial: string;
  brand: string;
  model: string;
  latest_customer: string;
  latest_phone: string;
  latest_status: RepairStatus;
  last_seen: string;
  repairs: RepairRecord[];
  is_board_level: boolean;
}

type SortField = 'serial' | 'brand' | 'tickets_count' | 'last_seen';
type SortDir = 'asc' | 'desc';

export function DevicesPage() {
  const { state } = useStore();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'last_seen', dir: 'desc' });
  const [filterType, setFilterType] = useState<'all' | 'repeat' | 'pcb'>('all');

  const [selectedDevice, setSelectedDevice] = useState<DeviceAsset | null>(null);
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

  const devices = useMemo<DeviceAsset[]>(() => {
    const registry = new Map<string, RepairRecord[]>();
    for (const repair of state.repairs) {
      const serialKey = repair.serial?.trim() || 'UNKNOWN-SERIAL';
      if (serialKey === 'UNKNOWN-SERIAL' || serialKey === '—') continue;
      const existing = registry.get(serialKey) || [];
      existing.push(repair);
      registry.set(serialKey, existing);
    }
    return Array.from(registry.entries()).map(([serial, records]) => {
      const sortedRecords = [...records].sort(
        (a, b) => new Date(b.date_in).getTime() - new Date(a.date_in).getTime()
      );
      const latest = sortedRecords[0];
      const pcbKeywords = ['power', 'short', 'ic', 'board', 'circuit', 'micro', 'soldering', 'capacitor', 'mosfet', 'rail', 'bios'];
      const isBoardLevel = sortedRecords.some(r => {
        const textToSearch = `${r.mof} ${r.problem} ${r.technician_notes}`.toLowerCase();
        return pcbKeywords.some(keyword => textToSearch.includes(keyword));
      });
      return {
        serial,
        brand: latest.brand,
        model: latest.model,
        latest_customer: latest.customer_name,
        latest_phone: latest.phone,
        latest_status: latest.status,
        last_seen: latest.date_in,
        repairs: sortedRecords,
        is_board_level: isBoardLevel,
      };
    });
  }, [state.repairs]);

  const filteredData = useMemo(() => {
    let result = [...devices];
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        d =>
          d.serial.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q) ||
          d.model.toLowerCase().includes(q) ||
          d.latest_customer.toLowerCase().includes(q)
      );
    }
    if (filterType === 'repeat') result = result.filter(d => d.repairs.length > 1);
    else if (filterType === 'pcb') result = result.filter(d => d.is_board_level);
    result.sort((a, b) => {
      let av: any = a[sort.field as keyof DeviceAsset];
      let bv: any = b[sort.field as keyof DeviceAsset];
      if (sort.field === 'tickets_count') { av = a.repairs.length; bv = b.repairs.length; }
      if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av;
      return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return result;
  }, [devices, searchQuery, filterType, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  const handleSort = (field: SortField) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showToast('success', 'Serial copied to clipboard'));
  };

  const getBadgeStyle = (status: RepairStatus) => {
    switch (status) {
      case 'Completed': return 'bg-green-50 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-400 border-green-200 dark:border-emerald-900/30';
      case 'In Progress': return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
      case 'Awaiting Parts': return 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/30';
      case 'Ready': return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30';
      case 'Cancelled': return 'bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700/30';
      default: return 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700/30';
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in relative">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2.5">
            <Smartphone className="h-6 w-6 text-brand-600" />
            Device Asset Registry
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Centralized hardware logs tracking unique units across multi-ticket lifetimes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 dark:bg-slate-900/50 p-1 self-start md:self-auto">
          <button
            onClick={() => { setFilterType('all'); setCurrentPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filterType === 'all' ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
          >
            All Hardware ({devices.length})
          </button>
          <button
            onClick={() => { setFilterType('repeat'); setCurrentPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1 ${filterType === 'repeat' ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Repeat Offenses
          </button>
          <button
            onClick={() => { setFilterType('pcb'); setCurrentPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1 ${filterType === 'pcb' ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
          >
            <Cpu className="h-3.5 w-3.5 text-brand-500" />
            PCB Component Level
          </button>
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
            placeholder="Search assets by serial, brand, model, or customer..."
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
                <th className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('serial')}>
                  <div className="flex items-center gap-1.5">Hardware Serial <SlidersHorizontal className="h-3 w-3 text-gray-400 dark:text-slate-500" /></div>
                </th>
                <th className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('brand')}>
                  <div className="flex items-center gap-1.5">Device Description <SlidersHorizontal className="h-3 w-3 text-gray-400 dark:text-slate-500" /></div>
                </th>
                <th className="px-5 py-3">Latest Owner</th>
                <th className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 text-center transition-colors" onClick={() => handleSort('tickets_count')}>
                  <div className="flex items-center justify-center gap-1.5">Tickets History <SlidersHorizontal className="h-3 w-3 text-gray-400 dark:text-slate-500" /></div>
                </th>
                <th className="px-5 py-3 text-center">Live Status</th>
                <th className="px-5 py-3 cursor-pointer text-right hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('last_seen')}>
                  <div className="flex items-center justify-end gap-1.5">Last Intake <SlidersHorizontal className="h-3 w-3 text-gray-400 dark:text-slate-500" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 font-medium">
                    No monitored device assets match your search parameters.
                  </td>
                </tr>
              ) : (
                paginatedData.map((device) => (
                  <tr
                    key={device.serial}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => { setSelectedDevice(device); setDrawerOpen(true); }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-gray-100 dark:bg-slate-800/70 text-gray-800 dark:text-slate-200 rounded px-2 py-0.5 text-xs font-bold border border-gray-200 dark:border-slate-700 tracking-wider">
                          {device.serial}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(device.serial); }}
                          className="p-1 text-gray-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-slate-100 font-semibold">{device.brand} {device.model}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {device.repairs.length > 1 && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="h-2.5 w-2.5" /> Repeat Offender
                            </span>
                          )}
                          {device.is_board_level && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-400">
                              <Cpu className="h-2.5 w-2.5" /> PCB Level Repair
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-slate-100">{device.latest_customer}</span>
                        <span className="text-gray-400 dark:text-slate-500 mt-0.5">{device.latest_phone}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800/70 px-2.5 py-1 text-xs font-bold text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                        <History className="h-3 w-3 text-gray-400 dark:text-slate-500" /> {device.repairs.length}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getBadgeStyle(device.latest_status)}`}>
                        {device.latest_status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-600 dark:text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(device.last_seen)}
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
            <span className="text-gray-700 dark:text-slate-300 font-bold">{filteredData.length}</span> registry assets.
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

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className={`relative z-50 flex w-full max-w-md flex-col bg-white dark:bg-[#131b2e] shadow-2xl border-l border-gray-200 dark:border-slate-800 transition-transform duration-300 ease-in-out ${drawerOpen && selectedDevice ? 'translate-x-0' : 'translate-x-full'}`}>
            {selectedDevice && (
              <>
                <div className="h-0.5 w-full bg-gradient-to-r from-brand-500 via-brand-400 to-transparent" />
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 mb-0.5">Device Asset</p>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 leading-tight">{selectedDevice.brand} {selectedDevice.model}</h3>
                    <p className="text-xs font-mono text-gray-400 dark:text-slate-500 mt-0.5">{selectedDevice.serial}</p>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="ml-4 shrink-0 rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  <div className="rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0b0f19] p-4 space-y-2.5">
                    <div className="flex items-center gap-2.5 text-xs">
                      <User className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
                      <span className="font-medium text-gray-900 dark:text-slate-100">{selectedDevice.latest_customer}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-slate-400">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
                      <span>{selectedDevice.latest_phone}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
                      <span>Last Intake: <span className="font-medium text-gray-800 dark:text-slate-200">{formatDate(selectedDevice.last_seen)}</span></span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5" />
                      Service History ({selectedDevice.repairs.length})
                    </h4>
                    <div className="relative border-l-2 border-gray-100 dark:border-slate-800 ml-2 space-y-4">
                      {selectedDevice.repairs.map((ticket) => (
                        <div key={ticket.id} className="relative pl-5">
                          <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-white dark:bg-[#131b2e] border-2 border-brand-400" />
                          <div className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] p-3.5 hover:border-gray-300 dark:hover:border-slate-700 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/20 px-2 py-0.5 rounded border border-brand-100 dark:border-brand-800">
                                {ticket.repair_id}
                              </span>
                              <span className={`text-xs font-medium rounded-full border px-2 py-0.5 ${getBadgeStyle(ticket.status)}`}>{ticket.status}</span>
                            </div>
                            <div className="text-xs space-y-1.5">
                              <div>
                                <span className="text-gray-400 dark:text-slate-500 block font-medium mb-0.5">Problem</span>
                                <span className="text-gray-700 dark:text-slate-300">{ticket.problem || '—'}</span>
                              </div>
                              {ticket.technician_notes && (
                                <div className="pt-1">
                                  <span className="text-gray-400 dark:text-slate-500 block font-medium mb-0.5">Technician Notes</span>
                                  <p className="text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50 p-2 rounded border border-gray-200 dark:border-slate-700 italic">
                                    {ticket.technician_notes}
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-800 mt-2">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{formatDate(ticket.date_in)}</span>
                                <span>·</span>
                                <span className="font-medium text-gray-600 dark:text-slate-400">@{ticket.technician || 'unassigned'}</span>
                                <span className="ml-auto font-semibold text-gray-800 dark:text-slate-200">${ticket.price}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Truck,
  Phone,
  Mail,
  Globe,
  MapPin,
  Inbox,
  X,
  Pencil,
  Trash2,
  Package,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { showToast } from '../components/Toast';
import type { Supplier } from '../types';

const DK_INPUT =
  'w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#0b0f19] px-3 py-2 text-sm text-gray-900 dark:text-slate-100 ' +
  'placeholder-gray-400 dark:placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const DK_LABEL = 'block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5';

export function SuppliersPage() {
  const { state, service } = useStore();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const suppliers = state.suppliers || [];

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [suppliers, searchQuery]);

  const topSupplier = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of state.inventory) {
      if (item.supplier_id) {
        counts.set(item.supplier_id, (counts.get(item.supplier_id) || 0) + 1);
      }
    }
    let maxId = '';
    let maxCount = 0;
    counts.forEach((c, id) => { if (c > maxCount) { maxCount = c; maxId = id; } });
    return suppliers.find((s) => s.id === maxId)?.name || '—';
  }, [suppliers, state.inventory]);

  const handleDelete = (id: string) => {
    service.deleteSupplier(id);
    showToast('success', 'Supplier removed');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Supplier Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Manage vendor relationships and procurement contacts
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setDrawerOpen(true); }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Supplier
        </button>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard
          icon={<Truck className="h-5 w-5" />}
          label="Total Suppliers"
          value={String(suppliers.length)}
          color="blue"
        />
        <MetricCard
          icon={<Package className="h-5 w-5" />}
          label="Items Linked"
          value={String(state.inventory.filter((i) => i.supplier_id).length)}
          color="emerald"
        />
        <MetricCard
          icon={<Truck className="h-5 w-5" />}
          label="Top Supplier"
          value={topSupplier}
          color="amber"
        />
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] pl-10 pr-4 py-2 text-sm text-gray-700 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50 dark:bg-[#0b0f19] border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Address</th>
                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Items</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 mb-4">
                        <Inbox className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        {suppliers.length === 0 ? 'No suppliers yet' : 'No results found'}
                      </p>
                      {suppliers.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                          Add your first supplier to get started
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => {
                  const itemCount = state.inventory.filter((item) => item.supplier_id === s.id).length;
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-gray-100 dark:border-slate-800 transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/10 ${
                        i % 2 === 0 ? 'bg-white dark:bg-[#131b2e]' : 'bg-gray-50/30 dark:bg-slate-800/10'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs font-bold shadow-sm">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{s.name}</span>
                            {s.website && (
                              <span className="block text-[10px] text-gray-400 dark:text-slate-500 truncate max-w-[150px]">{s.website}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400 font-mono">{s.phone || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">{s.email || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 max-w-[200px] truncate">{s.address || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100 text-right">{itemCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditing(s); setDrawerOpen(true); }}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Drawer */}
      {drawerOpen && (
        <SupplierDrawer
          editing={editing}
          onClose={() => { setDrawerOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'blue' | 'emerald' | 'amber' }) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/30',
  };
  const iconBg = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate max-w-[150px]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SupplierDrawer({ editing, onClose }: { editing: Supplier | null; onClose: () => void }) {
  const { service } = useStore();
  const [form, setForm] = useState({
    name: editing?.name || '',
    phone: editing?.phone || '',
    email: editing?.email || '',
    website: editing?.website || '',
    address: editing?.address || '',
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('error', 'Supplier name is required'); return; }

    if (editing) {
      service.updateSupplier(editing.id, form);
      showToast('success', `${form.name} updated`);
    } else {
      service.addSupplier(form);
      showToast('success', `${form.name} added`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="relative z-10 flex w-full max-w-md flex-col bg-white dark:bg-[#131b2e] shadow-2xl animate-slide-in-right border-l border-gray-200 dark:border-slate-800">
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent" />
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-0.5">
              {editing ? 'Edit Supplier' : 'New Supplier'}
            </p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 leading-tight">
              {editing ? editing.name : 'Add Supplier'}
            </h2>
          </div>
          <button onClick={onClose} className="ml-4 shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form id="supplier-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className={DK_LABEL}>Name <span className="text-red-500">*</span></label>
            <input className={DK_INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="iFixit Wholesale" required />
          </div>
          <div>
            <label className={DK_LABEL}>Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className={DK_INPUT + ' pl-10'} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
            </div>
          </div>
          <div>
            <label className={DK_LABEL}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className={DK_INPUT + ' pl-10'} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="orders@supplier.com" />
            </div>
          </div>
          <div>
            <label className={DK_LABEL}>Website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className={DK_INPUT + ' pl-10'} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://supplier.com" />
            </div>
          </div>
          <div>
            <label className={DK_LABEL}>Business Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea className={DK_INPUT + ' pl-10 resize-none'} rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Industrial Blvd, Suite 100" />
            </div>
          </div>
        </form>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-[#131b2e]">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="supplier-form" className="btn-primary">
            {editing ? 'Save Changes' : 'Add Supplier'}
          </button>
        </div>
      </aside>
    </div>
  );
}

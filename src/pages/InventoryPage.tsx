import { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Package,
  TrendingDown,
  DollarSign,
  Edit2,
  Trash2,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCcw,
  RotateCcw,
  History,
  X,
  Filter,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { showToast } from '../components/Toast';
import { useStore } from '../context/StoreContext';
import type {
  InventoryItem,
  InventoryCategory,
  InventoryTransactionType,
} from '../types';
import { INVENTORY_CATEGORIES } from '../types';
import { formatDate, formatDateTime } from '../utils/helpers';

// ============================================================
// Helpers
// ============================================================

function stockStatus(item: InventoryItem): 'ok' | 'low' | 'out' {
  if (item.quantity === 0) return 'out';
  if (item.quantity <= item.min_quantity) return 'low';
  return 'ok';
}

function StockBadge({ item }: { item: InventoryItem }) {
  const status = stockStatus(item);
  if (status === 'out') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/40 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Out of Stock
      </span>
    );
  }
  if (status === 'low') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        Low ({item.quantity})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {item.quantity} in stock
    </span>
  );
}

// ============================================================
// Item Form Drawer (Add / Edit) — slide-over from right
// ============================================================

const EMPTY_ITEM_FORM = {
  sku: '',
  name: '',
  category: 'Other' as InventoryCategory,
  description: '',
  quantity: 0,
  min_quantity: 1,
  unit_price: 0,
  supplier: '',
  location: '',
};

interface ItemFormDrawerProps {
  open: boolean;
  onClose: () => void;
  editing: InventoryItem | null;
}

// Shared input / label styles for the drawer surface
const DK_INPUT =
  'w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#0b0f19] px-3 py-2 text-sm text-gray-900 dark:text-slate-100 ' +
  'placeholder-gray-400 dark:placeholder-slate-500 transition-colors focus:border-brand-500 focus:outline-none ' +
  'focus:ring-2 focus:ring-brand-500/20';
const DK_LABEL = 'block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5';

function ItemFormDrawer({ open, onClose, editing }: ItemFormDrawerProps) {
  const { service } = useStore();
  const [form, setForm] = useState(EMPTY_ITEM_FORM);

  // Sync form state whenever the target item or open state changes
  useEffect(() => {
    if (editing) {
      setForm({
        sku: editing.sku,
        name: editing.name,
        category: editing.category,
        description: editing.description,
        quantity: editing.quantity,
        min_quantity: editing.min_quantity,
        unit_price: editing.unit_price,
        supplier: editing.supplier,
        location: editing.location,
      });
    } else {
      setForm(EMPTY_ITEM_FORM);
    }
  }, [editing, open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const set = (k: string, v: string | number) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sku.trim()) return showToast('error', 'SKU is required');
    if (!form.name.trim()) return showToast('error', 'Name is required');

    if (editing) {
      service.updateInventoryItem(editing.id, {
        ...form,
        quantity: Number(form.quantity),
        min_quantity: Number(form.min_quantity),
        unit_price: Number(form.unit_price),
      });
      showToast('success', `${form.name} updated`);
    } else {
      service.addInventoryItem({
        ...form,
        quantity: Number(form.quantity),
        min_quantity: Number(form.min_quantity),
        unit_price: Number(form.unit_price),
      });
      showToast('success', `${form.name} added to inventory`);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="relative z-10 flex w-full max-w-lg flex-col bg-white dark:bg-[#131b2e] shadow-2xl animate-slide-in-right border-l border-gray-200 dark:border-slate-800">

        {/* Top accent bar */}
        <div className="h-0.5 w-full bg-gradient-to-r from-brand-500 via-brand-400 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 mb-0.5">
              {editing ? 'Edit Part' : 'New Part'}
            </p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 leading-tight">
              {editing ? editing.name : 'Add Inventory Item'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {editing ? 'Update part details and stock settings' : 'Register a new part or consumable to stock'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form id="item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Identity */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className={DK_LABEL}>SKU <span className="text-brand-600">*</span></label>
                <input
                  className={DK_INPUT}
                  value={form.sku}
                  onChange={(e) => set('sku', e.target.value)}
                  placeholder="BAT-APPLE-A2519"
                  required
                />
              </div>
              <div className="col-span-1">
                <label className={DK_LABEL}>Category <span className="text-brand-600">*</span></label>
                <select
                  className={DK_INPUT + ' appearance-none cursor-pointer'}
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                >
                  {INVENTORY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={DK_LABEL}>Name <span className="text-brand-600">*</span></label>
                <input
                  className={DK_INPUT}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder='MacBook Pro 14″ Battery (A2519)'
                  required
                />
              </div>
              <div className="col-span-2">
                <label className={DK_LABEL}>Description</label>
                <textarea
                  className={DK_INPUT + ' resize-none'}
                  rows={2}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Optional notes about this part…"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-slate-800" />

          {/* Stock */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Stock</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={DK_LABEL}>Initial Qty</label>
                <input
                  type="number"
                  min={0}
                  className={DK_INPUT}
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                />
              </div>
              <div>
                <label className={DK_LABEL}>Low-Stock Threshold</label>
                <input
                  type="number"
                  min={0}
                  className={DK_INPUT}
                  value={form.min_quantity}
                  onChange={(e) => set('min_quantity', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-slate-800" />

          {/* Sourcing */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Sourcing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={DK_LABEL}>Unit Price ($)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={DK_INPUT}
                  value={form.unit_price}
                  onChange={(e) => set('unit_price', e.target.value)}
                />
              </div>
              <div>
                <label className={DK_LABEL}>Location (shelf/bin)</label>
                <input
                  className={DK_INPUT}
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="A-01"
                />
              </div>
              <div className="col-span-2">
                <label className={DK_LABEL}>Supplier</label>
                <input
                  className={DK_INPUT}
                  value={form.supplier}
                  onChange={(e) => set('supplier', e.target.value)}
                  placeholder="iFixit Wholesale"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Sticky footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-[#131b2e]">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="item-form"
            className="btn-primary"
          >
            {editing ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ============================================================
// Adjust Stock Modal
// ============================================================

const TX_META: Record<
  InventoryTransactionType,
  { label: string; icon: React.ReactNode; color: string; direction: 'in' | 'out' | 'set' }
> = {
  receive: {
    label: 'Receive Stock',
    icon: <ArrowDownToLine className="h-4 w-4" />,
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/30',
    direction: 'in',
  },
  use: {
    label: 'Use Parts',
    icon: <ArrowUpFromLine className="h-4 w-4" />,
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/30',
    direction: 'out',
  },
  adjust: {
    label: 'Manual Adjust',
    icon: <RefreshCcw className="h-4 w-4" />,
    color: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/30',
    direction: 'set',
  },
  return: {
    label: 'Return to Stock',
    icon: <RotateCcw className="h-4 w-4" />,
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/30',
    direction: 'in',
  },
};

interface AdjustStockModalProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

function AdjustStockModal({ open, onClose, item }: AdjustStockModalProps) {
  const { service } = useStore();
  const [type, setType] = useState<InventoryTransactionType>('receive');
  const [quantity, setQuantity] = useState('1');
  const [repairId, setRepairId] = useState('');
  const [notes, setNotes] = useState('');

  const meta = TX_META[type];
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const preview = item
    ? type === 'adjust'
      ? qty
      : type === 'use'
      ? Math.max(0, item.quantity - qty)
      : item.quantity + qty
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    service.adjustStock(item.id, type, qty, notes.trim(), repairId.trim() || null);
    showToast('success', `Stock updated: ${item.name}`);
    setQuantity('1');
    setRepairId('');
    setNotes('');
    onClose();
  };

  if (!item) return null;

  return (
    <Modal open={open} onClose={onClose} title="Adjust Stock" subtitle={item.name} size="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Transaction type selector */}
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TX_META) as InventoryTransactionType[]).map((t) => {
            const m = TX_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                  type === t ? m.color + ' ring-1 ring-inset ring-current' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Current → New preview */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-[#0b0f19] px-4 py-3 text-sm border border-gray-100 dark:border-slate-800">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Current</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{item.quantity}</p>
          </div>
          <ChevronDown className="h-5 w-5 rotate-[-90deg] text-gray-400 dark:text-slate-500" />
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">After</p>
            <p className={`text-2xl font-bold ${preview < item.min_quantity ? 'text-amber-600' : 'text-emerald-600'}`}>
              {preview}
            </p>
          </div>
        </div>

        <div>
          <label className="label">
            {meta.direction === 'set' ? 'Set quantity to' : 'Quantity'}
          </label>
          <input
            type="number"
            min={1}
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        {type === 'use' && (
          <div>
            <label className="label">Linked Repair ID (optional)</label>
            <input className="input" value={repairId} onChange={(e) => setRepairId(e.target.value)}
              placeholder="e.g. REP-0005" />
          </div>
        )}

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason, PO number, batch info…" />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Apply</button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================
// Transaction History Drawer
// ============================================================

const TX_TYPE_STYLE: Record<InventoryTransactionType, string> = {
  receive: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  use: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
  adjust: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400',
  return: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
};

function TransactionHistoryDrawer({
  item,
  onClose,
}: {
  item: InventoryItem | null;
  onClose: () => void;
}) {
  const { service } = useStore();
  if (!item) return null;

  const transactions = service.getTransactionsForItem(item.id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <aside className="relative z-10 flex w-full max-w-md flex-col bg-white dark:bg-[#131b2e] shadow-2xl animate-slide-in-right border-l border-gray-200 dark:border-slate-800">
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Transaction History</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-xs">{item.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
              <History className="h-10 w-10 mb-3 text-gray-300 dark:text-slate-600" />
              <p className="text-sm">No transactions recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-lg border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#0b0f19] p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TX_TYPE_STYLE[tx.type]}`}>
                      {tx.type}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{formatDateTime(tx.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm mb-1.5">
                    <span className="font-mono text-gray-500 dark:text-slate-400">{tx.quantity_before}</span>
                    <span className="text-gray-400 dark:text-slate-500">→</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-slate-100">{tx.quantity_after}</span>
                    <span className="text-gray-400 dark:text-slate-500 text-xs">
                      ({tx.type === 'use' ? '-' : tx.type === 'adjust' ? '=' : '+'}{tx.quantity})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                    <span>by <span className="font-medium text-gray-700 dark:text-slate-300">{tx.created_by}</span></span>
                    {tx.repair_id && (
                      <span className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-gray-600 dark:text-slate-300">
                        {tx.repair_id}
                      </span>
                    )}
                  </div>
                  {tx.notes && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 italic border-t border-gray-100 dark:border-slate-800 pt-2">
                      {tx.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

type StockFilter = 'all' | 'ok' | 'low' | 'out';

export function InventoryPage() {
  const { state, service } = useStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | 'All'>('All');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  const inventory = state.inventory;

  // ---- Stats ----
  const stats = useMemo(() => {
    const total = inventory.length;
    const low = inventory.filter((i) => stockStatus(i) === 'low').length;
    const out = inventory.filter((i) => stockStatus(i) === 'out').length;
    const totalValue = inventory.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    return { total, low, out, totalValue };
  }, [inventory]);

  // ---- Filtered list ----
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return inventory.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);
      const matchCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchStock =
        stockFilter === 'all' || stockStatus(item) === stockFilter;
      return matchSearch && matchCategory && matchStock;
    });
  }, [inventory, search, categoryFilter, stockFilter]);

  const handleAddItem = () => {
    setEditingItem(null);
    setAddEditOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setAddEditOpen(true);
  };

  const handleDelete = (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}" (${item.sku})? This cannot be undone.`)) return;
    service.deleteInventoryItem(item.id);
    showToast('success', `${item.name} removed from inventory`);
  };

  return (
    <>
    <div className="p-4 sm:p-6 space-y-5">

        {/* ---- Header ---- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2.5">
              <Boxes className="h-7 w-7 text-brand-600" />
              Inventory / Stock
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Spare parts, consumables, and stock levels
            </p>
          </div>
          <button onClick={handleAddItem} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        {/* ---- Stats row ---- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Parts</p>
              <Package className="h-4 w-4 text-gray-400 dark:text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">unique SKUs</p>
          </div>
          <div
            onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
            className={`rounded-xl border bg-white dark:bg-[#131b2e] p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${
              stats.low > 0 ? 'border-amber-200 dark:border-amber-900/40' : 'border-gray-200 dark:border-slate-800'
            } ${stockFilter === 'low' ? 'ring-2 ring-amber-400' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Low Stock</p>
              <AlertTriangle className={`h-4 w-4 ${stats.low > 0 ? 'text-amber-500' : 'text-gray-300 dark:text-slate-600'}`} />
            </div>
            <p className={`text-2xl font-bold ${stats.low > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-slate-100'}`}>
              {stats.low}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">at or below threshold</p>
          </div>
          <div
            onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
            className={`rounded-xl border bg-white dark:bg-[#131b2e] p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${
              stats.out > 0 ? 'border-red-200 dark:border-red-900/40' : 'border-gray-200 dark:border-slate-800'
            } ${stockFilter === 'out' ? 'ring-2 ring-red-400' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Out of Stock</p>
              <TrendingDown className={`h-4 w-4 ${stats.out > 0 ? 'text-red-500' : 'text-gray-300 dark:text-slate-600'}`} />
            </div>
            <p className={`text-2xl font-bold ${stats.out > 0 ? 'text-red-600' : 'text-gray-900 dark:text-slate-100'}`}>
              {stats.out}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">needs reorder</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Stock Value</p>
              <DollarSign className="h-4 w-4 text-gray-400 dark:text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">at cost price</p>
          </div>
        </div>

        {/* ---- Filter bar ---- */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, SKU, supplier, location…"
                className="input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                showFilters || categoryFilter !== 'All' || stockFilter !== 'all'
                  ? 'border-brand-300 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400'
                  : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {(categoryFilter !== 'All' || stockFilter !== 'all') && (
                <span className="rounded-full bg-brand-600 text-white text-xs px-1.5 py-0.5">
                  {[categoryFilter !== 'All', stockFilter !== 'all'].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-3">
              <div className="flex-1 min-w-[160px]">
                <label className="label">Category</label>
                <select
                  className="input"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as InventoryCategory | 'All')}
                >
                  <option value="All">All Categories</option>
                  {INVENTORY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="label">Stock Status</label>
                <select
                  className="input"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                >
                  <option value="all">All</option>
                  <option value="ok">In Stock</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setCategoryFilter('All'); setStockFilter('all'); }}
                  className="btn-secondary text-xs"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---- Table ---- */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#0b0f19]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Name / Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Loc.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center text-gray-400">
                        <Boxes className="h-10 w-10 mb-3 text-gray-300" />
                        <p className="text-sm font-medium text-gray-500">No items found</p>
                        <p className="text-xs mt-1">
                          {search || categoryFilter !== 'All' || stockFilter !== 'all'
                            ? 'Try adjusting your search or filters.'
                            : 'Add your first inventory item to get started.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const status = stockStatus(item);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${
                          status === 'out' ? 'bg-red-50/40 dark:bg-red-950/10' : status === 'low' ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800/70 rounded px-1.5 py-0.5">
                            {item.sku}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="font-medium text-gray-900 dark:text-slate-100 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{item.category}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StockBadge item={item} />
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">min: {item.min_quantity}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-slate-100">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-slate-400">
                          ${(item.quantity * item.unit_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400 max-w-[140px] truncate">
                          {item.supplier || <span className="text-gray-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {item.location ? (
                            <span className="font-mono text-xs bg-gray-100 dark:bg-slate-800/70 text-gray-600 dark:text-slate-400 rounded px-1.5 py-0.5">
                              {item.location}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                          {formatDate(item.updated_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setAdjustItem(item)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                              title="Adjust Stock"
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setHistoryItem(item)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                              title="View History"
                            >
                              <History className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                              title="Edit Item"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="h-4 w-4" />
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

          {filtered.length > 0 && (
            <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between bg-gray-50/50 dark:bg-[#0b0f19]/50">
              <span>
                Showing {filtered.length} of {inventory.length} items
              </span>
              {(search || categoryFilter !== 'All' || stockFilter !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setCategoryFilter('All'); setStockFilter('all'); }}
                  className="text-brand-600 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- Drawers / Modals ---- */}
      <ItemFormDrawer
        open={addEditOpen}
        onClose={() => { setAddEditOpen(false); setEditingItem(null); }}
        editing={editingItem}
      />
      <AdjustStockModal
        open={Boolean(adjustItem)}
        onClose={() => setAdjustItem(null)}
        item={adjustItem}
      />
      <TransactionHistoryDrawer
        item={historyItem}
        onClose={() => setHistoryItem(null)}
      />
    </>
  );
}

import { useState } from 'react';
import { Plus, Bell, Trash2, ArrowRight, Power } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Modal } from '../components/Modal';
import { showToast } from '../components/Toast';
import { formatDateTime } from '../utils/helpers';
import type { RepairStatus } from '../types';

const STATUSES: (RepairStatus | '*')[] = [
  '*',
  'Pending',
  'In Progress',
  'Awaiting Parts',
  'Ready',
  'Completed',
  'Cancelled',
];

const TEMPLATES = [
  { key: 'device_ready_whatsapp', label: 'Device Ready (WhatsApp)', channel: 'whatsapp' },
  { key: 'device_ready_email', label: 'Device Ready (Email)', channel: 'email' },
  { key: 'device_ready_telegram', label: 'Device Ready (Telegram)', channel: 'telegram' },
  { key: 'status_update_whatsapp', label: 'Status Update (WhatsApp)', channel: 'whatsapp' },
  { key: 'status_update_email', label: 'Status Update (Email)', channel: 'email' },
];

export function RulesPage() {
  const { state, service } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    from_status: 'In Progress' as string,
    to_status: 'Ready' as string,
    template_key: 'device_ready_whatsapp' as string,
  });

  const handleCreate = () => {
    setForm({ from_status: 'In Progress', to_status: 'Ready', template_key: 'device_ready_whatsapp' });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    service.addRule({
      enabled: true,
      trigger_event: 'status_change',
      from_status: form.from_status,
      to_status: form.to_status,
      template_key: form.template_key,
    });
    showToast('success', 'Auto-notify rule created');
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this rule?')) {
      service.deleteRule(id);
      showToast('success', 'Rule deleted');
    }
  };

  const templateLabel = (key: string) => {
    const t = TEMPLATES.find((t) => t.key === key);
    return t ? t.label : key;
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Auto-Notify Rules</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Automatically trigger notifications when repair statuses change · {state.autoNotifyRules.length} rules
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Rule
        </button>
      </div>

      {/* Info banner */}
      <div className="card p-4 mb-4 bg-brand-50/50 dark:bg-brand-950/10 border-brand-100 dark:border-brand-900/30">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-brand-500 dark:text-brand-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">How auto-notify works</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              When a repair's status changes from the "From" status to the "To" status, the selected template
              is automatically queued in the Notification Outbox. You can then review and dispatch it.
            </p>
          </div>
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {state.autoNotifyRules.length === 0 ? (
          <div className="card p-12 text-center">
            <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
            <p className="text-sm text-gray-400 dark:text-slate-500">No rules configured</p>
          </div>
        ) : (
          state.autoNotifyRules.map((rule) => (
            <div key={rule.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Toggle */}
                  <button
                    onClick={() => service.toggleRule(rule.id)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                      rule.enabled ? 'bg-brand-600' : 'bg-gray-300 dark:bg-slate-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      rule.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>

                  {/* Rule flow */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${rule.enabled ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                      {rule.from_status === '*' ? 'Any Status' : rule.from_status}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-400 dark:text-slate-600" />
                    <span className={`badge ${rule.enabled ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                      {rule.to_status}
                    </span>
                    <span className="text-gray-300 dark:text-slate-700">|</span>
                    <span className="text-sm text-gray-600 dark:text-slate-300">{templateLabel(rule.template_key)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge text-xs ${rule.enabled ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                    <Power className="h-3 w-3" />
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Created {formatDateTime(rule.created_at)}</p>
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Auto-Notify Rule" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">From Status</label>
            <select className="input" value={form.from_status} onChange={(e) => setForm({ ...form, from_status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === '*' ? 'Any Status' : s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">To Status</label>
            <select className="input" value={form.to_status} onChange={(e) => setForm({ ...form, to_status: e.target.value })}>
              {STATUSES.filter((s) => s !== '*').map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Template</label>
            <select className="input" value={form.template_key} onChange={(e) => setForm({ ...form, template_key: e.target.value })}>
              {TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Rule</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


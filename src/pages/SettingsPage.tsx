import { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Users as UsersIcon,
  Send,
  Plug,
  Database,
  RotateCcw,
  AlertTriangle,
  Info,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  Mail,
  Eye,
  EyeOff,
  Save,
  TestTube,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { showToast } from '../components/Toast';
import { isUserActive, formatTimeAgo, getStatusColor, getStatusDotColor } from '../utils/helpers';
import type { RepairRecord } from '../types';

type TabKey = 'business' | 'users' | 'messaging' | 'integrations';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { key: 'business', label: 'Business Profile', icon: <Building2 className="h-4 w-4" /> },
  { key: 'users', label: 'Users Monitor', icon: <UsersIcon className="h-4 w-4" /> },
  { key: 'messaging', label: 'Messaging Hub', icon: <Send className="h-4 w-4" /> },
  { key: 'integrations', label: 'Integrations', icon: <Plug className="h-4 w-4" /> },
];

export function SettingsPage() {
  const { state, service } = useStore();
  const [activeTab, setActiveTab] = useState<TabKey>('business');
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    service.resetAll();
    setConfirmReset(false);
    showToast('success', 'All data has been reset to defaults');
  };

  const dataStats = [
    { label: 'Users', count: state.users.length },
    { label: 'Repair Records', count: state.repairs.length },
    { label: 'Activity Logs', count: state.activities.length },
    { label: 'Audit Trail Entries', count: state.logs.length },
    { label: 'Notifications', count: state.notifications.length },
    { label: 'Auto-Notify Rules', count: state.autoNotifyRules.length },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">System configuration, integrations, and data management</p>
      </div>

      {/* Tab bar */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-1 p-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <span className={activeTab === tab.key ? 'text-brand-600' : 'text-gray-400'}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'business' && <BusinessProfileTab />}
        {activeTab === 'users' && <UsersMonitorTab />}
        {activeTab === 'messaging' && <MessagingHubTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
      </div>

      {/* Data overview + danger zone (always visible below tabs) */}
      <div className="mt-6 space-y-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Data Overview</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dataStats.map((stat) => (
              <div key={stat.label} className="rounded-lg bg-gray-50 dark:bg-[#0b0f19] border border-gray-100 dark:border-slate-800 p-3">
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stat.count}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Storage</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            All data is stored locally in your browser's localStorage. This means your data persists across
            page reloads but is specific to this browser. No data is sent to any external server.
          </p>
          <div className="mt-3 rounded-lg bg-gray-50 dark:bg-[#0b0f19] border border-gray-100 dark:border-slate-800 p-3">
            <p className="text-xs font-mono text-gray-500 dark:text-slate-400">Storage Key: crm_pro_state_v1</p>
          </div>
        </div>

        <div className="card p-5 border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-base font-semibold text-gray-900">Danger Zone</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Reset all data to the default seed state. This will permanently delete all changes you've made
            and restore the original demo data.
          </p>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="btn-danger">
              <RotateCcw className="h-4 w-4" /> Reset All Data
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-red-600">Are you sure? This cannot be undone.</span>
              <button onClick={handleReset} className="btn-danger">Yes, Reset Everything</button>
              <button onClick={() => setConfirmReset(false)} className="btn-secondary">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Tab A: Business Profile
// ============================================================

function BusinessProfileTab() {
  const { state, service } = useStore();
  const config = state.config;
  const [form, setForm] = useState({
    company_name: config.company_name,
    address: config.address,
    phone: config.phone,
    mof: config.mof,
    logo_path: config.logo_path,
    auto_id_prefix: config.auto_id_prefix,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    service.updateConfig(form);
    setSaved(true);
    showToast('success', 'Business profile updated');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Building2 className="h-5 w-5 text-brand-500" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Business Profile</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Company Name</label>
          <input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">MOF (Ministry of Finance Number)</label>
          <input className="input" value={form.mof} onChange={(e) => setForm({ ...form, mof: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label className="label">Logo Path</label>
          <input className="input" value={form.logo_path} onChange={(e) => setForm({ ...form, logo_path: e.target.value })} />
        </div>
        <div>
          <label className="label">Auto ID Prefix</label>
          <input className="input" value={form.auto_id_prefix} onChange={(e) => setForm({ ...form, auto_id_prefix: e.target.value })} />
          <p className="mt-1 text-xs text-gray-400">Prefix used when generating repair IDs (e.g. {form.auto_id_prefix}-0001)</p>
        </div>
      </div>

      {/* Flow statuses display */}
      <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">Repair Flow Statuses</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">Finish Statuses</p>
            <div className="flex flex-wrap gap-1.5">
              {config.flow_statuses.finish_statuses.map((s) => (
                <span key={s} className="badge bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> {s}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-3">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">Cancel Statuses</p>
            <div className="flex flex-wrap gap-1.5">
              {config.flow_statuses.cancel_statuses.map((s) => (
                <span key={s} className="badge bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400">
                  <XCircle className="h-3 w-3" /> {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} className="btn-primary">
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Tab B: Users Monitor (UserRolesWindow)
// ============================================================

function UsersMonitorTab() {
  const { state, service } = useStore();
  const [refreshKey, setRefreshKey] = useState(0);

  // Force re-render on refresh
  useMemo(() => refreshKey, [refreshKey]);

  const handleRefresh = () => {
    service.heartbeat();
    setRefreshKey((k) => k + 1);
    showToast('info', 'User monitor refreshed');
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-brand-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">System Users Monitor</h2>
        </div>
        <button onClick={handleRefresh} className="btn-secondary text-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-800">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0b0f19] border-b border-gray-200 dark:border-slate-800">
            <tr>
              <th className="table-header">Username</th>
              <th className="table-header">Role</th>
              <th className="table-header">Live Status</th>
              <th className="table-header">Last Login</th>
              <th className="table-header">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {state.users.map((u) => {
              const active = isUserActive(u.last_seen);
              return (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-semibold text-xs">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-slate-100">{u.username}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${u.role === 'admin' ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${active ? 'text-emerald-600' : 'text-gray-400 dark:text-slate-500'}`}>
                      <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500 animate-pulse-soft' : 'bg-gray-300 dark:bg-slate-600'}`} />
                      {active ? 'Active' : 'Offline'}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600 dark:text-slate-400">{formatTimeAgo(u.last_login)}</td>
                  <td className="table-cell text-gray-600 dark:text-slate-400">{formatTimeAgo(u.last_seen)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <Info className="h-3.5 w-3.5" />
        Active status is determined by a 45-second heartbeat check on last_seen timestamp.
      </div>
    </div>
  );
}

// ============================================================
// Tab C: Messaging Integration Testing Hub (NotificationSettingsWindow)
// ============================================================

function MessagingHubTab() {
  const { state, service } = useStore();
  const [search, setSearch] = useState('');
  const [selectedRepairId, setSelectedRepairId] = useState<string>('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const config = state.config;

  // Get unique customers from repairs
  const customers = useMemo(() => {
    const seen = new Set<string>();
    return state.repairs
      .filter((r) => {
        if (seen.has(r.repair_id)) return false;
        seen.add(r.repair_id);
        return r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
               r.repair_id.toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => a.customer_name.localeCompare(b.customer_name));
  }, [state.repairs, search]);

  // Find the latest active repair for the selected customer
  const selectedRepair: RepairRecord | null = useMemo(() => {
    if (!selectedRepairId) return null;
    return state.repairs.find((r) => r.id === selectedRepairId) || null;
  }, [selectedRepairId, state.repairs]);

  const selectedTemplate = config.whatsapp_templates.find((t) => t.key === selectedTemplateKey) || null;

  const renderedBody = useMemo(() => {
    if (!selectedRepair || !selectedTemplate) return '';
    return selectedTemplate.body
      .replace(/\{name\}/g, selectedRepair.customer_name)
      .replace(/\{repair_id\}/g, selectedRepair.repair_id)
      .replace(/\{status\}/g, selectedRepair.status);
  }, [selectedRepair, selectedTemplate]);

  const handleSendTemplate = () => {
    if (!selectedRepair || !selectedTemplate) {
      showToast('error', 'Select a customer and template first');
      return;
    }

    // Queue the notification
    service.createNotification(
      'whatsapp',
      selectedRepair.phone,
      selectedRepair.repair_id,
      `CRM Pro — ${selectedTemplate.label}`,
      renderedBody
    );

    showToast('success', `Template "${selectedTemplate.label}" queued for ${selectedRepair.customer_name}`);

    // Simulate dispatch — find the just-created notification and send it
    setTimeout(() => {
      const notifications = service.getState().notifications;
      const justQueued = notifications.find(
        (n) => n.customer_id === selectedRepair.repair_id && n.status === 'queued' && n.title.includes(selectedTemplate.label)
      );
      if (justQueued) {
        service.sendNotification(justQueued.id);
      }
    }, 800);

    setShowPreview(true);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Send className="h-5 w-5 text-brand-500" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Messaging Integration Testing Hub</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Selection panel */}
        <div className="space-y-4">
          {/* Customer search + select */}
          <div>
            <label className="label">Search & Select Customer / Repair</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="input pl-10"
                placeholder="Search by customer name or repair ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input"
              value={selectedRepairId}
              onChange={(e) => { setSelectedRepairId(e.target.value); setShowPreview(false); }}
            >
              <option value="">— Select a repair record —</option>
              {customers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.customer_name} — {r.repair_id} ({r.brand} {r.model})
                </option>
              ))}
            </select>
          </div>

          {/* Template selection */}
          <div>
            <label className="label">WhatsApp Template</label>
            <select
              className="input"
              value={selectedTemplateKey}
              onChange={(e) => setSelectedTemplateKey(e.target.value)}
            >
              <option value="">— Select a template —</option>
              {config.whatsapp_templates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} ({t.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Send button */}
          <button
            onClick={handleSendTemplate}
            disabled={!selectedRepair || !selectedTemplateKey}
            className="btn-primary w-full"
          >
            <MessageCircle className="h-4 w-4" /> Send Template
          </button>

          {/* Template preview text */}
          {selectedTemplate && (
            <div className="rounded-lg bg-gray-50 dark:bg-[#0b0f19] border border-gray-100 dark:border-slate-800 p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Template Body</p>
              <p className="text-sm text-gray-600 dark:text-slate-400 font-mono">{selectedTemplate.body}</p>
            </div>
          )}
        </div>

        {/* Right: Preview panel */}
        <div>
          <label className="label">Selected Repair Preview</label>
          {!selectedRepair ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">Select a repair record to preview</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 dark:border-slate-800 p-4 bg-white dark:bg-[#0b0f19]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Repair ID</p>
                    <p className="text-sm font-mono font-medium text-brand-600 dark:text-brand-400">{selectedRepair.repair_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Customer Name</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{selectedRepair.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Device</p>
                    <p className="text-sm text-gray-900 dark:text-slate-100">{selectedRepair.brand} {selectedRepair.model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Current Status</p>
                    <span className={`badge ${getStatusColor(selectedRepair.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(selectedRepair.status)}`} />
                      {selectedRepair.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Phone</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{selectedRepair.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Email</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400 truncate">{selectedRepair.email || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Rendered message preview */}
              {renderedBody && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Rendered Message</p>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300">{renderedBody}</p>
                </div>
              )}

              {/* Dispatch status */}
              {showPreview && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    <p className="text-sm text-blue-700 dark:text-blue-400">Notification queued and dispatching...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Tab D: Integrations Setup
// ============================================================

function IntegrationsTab() {
  const { state, service } = useStore();
  const config = state.config;

  // WhatsApp form with Supabase persistence
  const [waForm, setWaForm] = useState({
    enabled: false,
    api_version: 'v22.0',
    phone_number_id: '',
    access_token: '',
    template_language: 'en_US',
    finish_statuses: ['Completed', 'Ready'],
    cancel_statuses: ['Cancelled'],
  });
  const [waLoading, setWaLoading] = useState(true);
  const [waSaving, setWaSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Load WhatsApp config from Supabase on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await (await import('../services/supabaseClient')).supabase
          .from('whatsapp_config')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (data) {
          setWaForm({
            enabled: data.enabled ?? false,
            api_version: data.api_version ?? 'v22.0',
            phone_number_id: data.phone_number_id ?? '',
            access_token: data.access_token ?? '',
            template_language: data.template_language ?? 'en_US',
            finish_statuses: data.finish_statuses ?? ['Completed', 'Ready'],
            cancel_statuses: data.cancel_statuses ?? ['Cancelled'],
          });
        }
      } catch (err) {
        console.warn('[Settings] Failed to load WhatsApp config:', err);
      } finally {
        setWaLoading(false);
      }
    };
    loadConfig();
  }, []);

  const [emailForm, setEmailForm] = useState({
    enabled: config.email.enabled,
    host: config.email.host,
    port: config.email.port,
    user: config.email.user,
    pass: config.email.pass,
    from_name: config.email.from_name,
  });
  const [tgForm, setTgForm] = useState({
    enabled: config.telegram.enabled,
    bot_token: config.telegram.bot_token,
    chat_id: config.telegram.chat_id,
  });
  const [showWaToken, setShowWaToken] = useState(false);
  const [showEmailPass, setShowEmailPass] = useState(false);
  const [showTgToken, setShowTgToken] = useState(false);

  // Save WhatsApp config to Supabase
  const handleSaveWhatsApp = async () => {
    setWaSaving(true);
    try {
      const { error } = await (await import('../services/supabaseClient')).supabase
        .from('whatsapp_config')
        .upsert({
          id: 1,
          enabled: waForm.enabled,
          api_version: waForm.api_version,
          phone_number_id: waForm.phone_number_id,
          access_token: waForm.access_token,
          template_language: waForm.template_language,
          finish_statuses: waForm.finish_statuses,
          cancel_statuses: waForm.cancel_statuses,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        showToast('error', `Failed to save: ${error.message}`);
      } else {
        // Also sync to local config for backward compatibility
        service.updateConfig({
          whatsapp: {
            enabled: waForm.enabled,
            api_version: waForm.api_version,
            phone_number_id: waForm.phone_number_id,
            access_token: waForm.access_token,
          },
        });
        showToast('success', 'WhatsApp gateway configuration saved');
      }
    } catch (err) {
      showToast('error', `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setWaSaving(false);
    }
  };

  // Test WhatsApp connection via local backend
  const handleTestWhatsApp = async () => {
    if (!waForm.phone_number_id || !waForm.access_token) {
      showToast('error', 'Enter Phone Number ID and Access Token first');
      return;
    }
    setTesting('WhatsApp');
    try {
      const response = await fetch('http://localhost:5001/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: waForm.phone_number_id,
          access_token: waForm.access_token,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showToast('success', 'WhatsApp connection test successful');
      } else {
        showToast('error', `Connection failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      showToast('error', `Connection failed: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setTesting(null);
    }
  };

  const handleSaveEmail = () => {
    service.updateConfig({ email: { ...config.email, ...emailForm } });
    showToast('success', 'Email settings saved');
  };

  const handleSaveTelegram = () => {
    service.updateConfig({ telegram: { ...config.telegram, ...tgForm } });
    showToast('success', 'Telegram settings saved');
  };

  const handleTest = (channel: string) => {
    if (channel === 'WhatsApp') {
      handleTestWhatsApp();
      return;
    }
    setTesting(channel);
    setTimeout(() => {
      setTesting(null);
      showToast('info', `${channel} connection test: This is a placeholder. Configure your credentials and test with a live endpoint.`);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* WhatsApp Cloud API */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">WhatsApp Cloud API</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500">Meta Cloud API integration for sending messages</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-500 dark:text-slate-400">Enabled</span>
            <button
              type="button"
              onClick={() => setWaForm({ ...waForm, enabled: !waForm.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${waForm.enabled ? 'bg-brand-600' : 'bg-gray-300 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${waForm.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>
        </div>

        {waLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">API Version</label>
                <input className="input" value={waForm.api_version} onChange={(e) => setWaForm({ ...waForm, api_version: e.target.value })} placeholder="v22.0" />
              </div>
              <div>
                <label className="label">Phone Number ID</label>
                <input className="input" value={waForm.phone_number_id} onChange={(e) => setWaForm({ ...waForm, phone_number_id: e.target.value })} placeholder="e.g. 107039372694784" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Cloud Access Token</label>
                <div className="relative">
                  <input
                    type={showWaToken ? 'text' : 'password'}
                    className="input pr-10 font-mono"
                    value={waForm.access_token}
                    onChange={(e) => setWaForm({ ...waForm, access_token: e.target.value })}
                    placeholder="EAAG..."
                  />
                  <button type="button" onClick={() => setShowWaToken(!showWaToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showWaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Your secret token - masked by default for security</p>
              </div>
              <div>
                <label className="label">Template Language</label>
                <select
                  className="input"
                  value={waForm.template_language}
                  onChange={(e) => setWaForm({ ...waForm, template_language: e.target.value })}
                >
                  <option value="en_US">English (US)</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="ar">Arabic</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
            </div>

            {/* Status Triggers */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Status Triggers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">Finish Statuses</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mb-2">Triggers &quot;order_finished&quot; template</p>
                  <div className="flex flex-wrap gap-1.5">
                    {waForm.finish_statuses.map((s) => (
                      <span key={s} className="badge bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-3">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">Cancel Statuses</p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70 mb-2">Triggers &quot;order_cancelled&quot; template</p>
                  <div className="flex flex-wrap gap-1.5">
                    {waForm.cancel_statuses.map((s) => (
                      <span key={s} className="badge bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400">
                        <XCircle className="h-3 w-3" /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => handleTest('WhatsApp')} className="btn-secondary text-sm" disabled={!!testing || !waForm.phone_number_id || !waForm.access_token}>
                {testing === 'WhatsApp' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
                Test Connection
              </button>
              <button onClick={handleSaveWhatsApp} className="btn-primary text-sm" disabled={waSaving}>
                {waSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {waSaving ? 'Saving...' : 'Save Gateway Configurations'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Email / SMTP */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Email / SMTP</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500">SMTP server configuration for email notifications</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-500 dark:text-slate-400">Enabled</span>
            <button
              type="button"
              onClick={() => setEmailForm({ ...emailForm, enabled: !emailForm.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailForm.enabled ? 'bg-brand-600' : 'bg-gray-300 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailForm.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">SMTP Host</label>
            <input className="input" value={emailForm.host} onChange={(e) => setEmailForm({ ...emailForm, host: e.target.value })} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label className="label">Port</label>
            <input type="number" className="input" value={emailForm.port} onChange={(e) => setEmailForm({ ...emailForm, port: Number(e.target.value) })} placeholder="587" />
          </div>
          <div>
            <label className="label">Username</label>
            <input className="input" value={emailForm.user} onChange={(e) => setEmailForm({ ...emailForm, user: e.target.value })} placeholder="user@example.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showEmailPass ? 'text' : 'password'}
                className="input pr-10"
                value={emailForm.pass}
                onChange={(e) => setEmailForm({ ...emailForm, pass: e.target.value })}
              />
              <button type="button" onClick={() => setShowEmailPass(!showEmailPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showEmailPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">From Name</label>
            <input className="input" value={emailForm.from_name} onChange={(e) => setEmailForm({ ...emailForm, from_name: e.target.value })} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => handleTest('Email')} className="btn-secondary text-sm" disabled={!!testing}>
            {testing === 'Email' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
            Test Connection
          </button>
          <button onClick={handleSaveEmail} className="btn-primary text-sm">
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Telegram Bot */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Telegram Bot</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500">Telegram bot integration for notifications</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-500 dark:text-slate-400">Enabled</span>
            <button
              type="button"
              onClick={() => setTgForm({ ...tgForm, enabled: !tgForm.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${tgForm.enabled ? 'bg-brand-600' : 'bg-gray-300 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tgForm.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Bot Token</label>
            <div className="relative">
              <input
                type={showTgToken ? 'text' : 'password'}
                className="input pr-10"
                value={tgForm.bot_token}
                onChange={(e) => setTgForm({ ...tgForm, bot_token: e.target.value })}
                placeholder="123456:ABC-DEF..."
              />
              <button type="button" onClick={() => setShowTgToken(!showTgToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showTgToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Chat ID</label>
            <input className="input" value={tgForm.chat_id} onChange={(e) => setTgForm({ ...tgForm, chat_id: e.target.value })} placeholder="-1001234567890" />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => handleTest('Telegram')} className="btn-secondary text-sm" disabled={!!testing}>
            {testing === 'Telegram' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
            Test Connection
          </button>
          <button onClick={handleSaveTelegram} className="btn-primary text-sm">
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}


import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageCircle,
  Search,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Inbox,
  Smartphone,
  ArrowRight,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { showToast } from '../components/Toast';
import { useFeedback } from '../components/FeedbackModal';
import { normalizePhone, formatDateTime } from '../utils/helpers';
import { supabase } from '../services/supabaseClient';
import type { RepairRecord, WhatsAppLogRecord, WhatsAppConfigRecord } from '../types';

// ============================================================
// Status pill config
// ============================================================

type WhatsAppTemplate = 'order_received' | 'order_finished' | 'order_cancelled';
type WhatsAppLogStatusUI = 'sent' | 'queued' | 'failed';

const STATUS_PILL: Record<WhatsAppLogStatusUI, { bg: string; text: string; icon: React.ReactNode }> = {
  sent: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  queued: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', icon: <Clock className="h-3 w-3" /> },
  failed: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', icon: <XCircle className="h-3 w-3" /> },
};

const TEMPLATE_LABELS: Record<WhatsAppTemplate, string> = {
  order_received: 'Order Received',
  order_finished: 'Order Finished',
  order_cancelled: 'Order Cancelled',
};

// ============================================================
// Component
// ============================================================

export function WhatsAppWorkspacePage() {
  const { state, service } = useStore();
  const { showFeedback } = useFeedback();
  const currentUser = service.getCurrentUser();
  const isAdmin = currentUser?.role.toLowerCase() === 'admin';

  const [search, setSearch] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<WhatsAppLogRecord[]>([]);
  const [waConfig, setWaConfig] = useState<WhatsAppConfigRecord | null>(null);

  // Load WhatsApp config and logs from Supabase
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [configRes, logsRes] = await Promise.all([
          supabase.from('whatsapp_config').select('*').eq('id', 1).maybeSingle(),
          supabase.from('whatsapp_logs').select('*').order('created_at', { ascending: false }).limit(500),
        ]);

        if (configRes.data) {
          setWaConfig(configRes.data as WhatsAppConfigRecord);
        }
        if (logsRes.data) {
          setLogs(logsRes.data.map((row) => ({
            ...row,
            variables: Array.isArray(row.variables) ? row.variables : JSON.parse(JSON.stringify(row.variables)),
          })) as WhatsAppLogRecord[]);
        }
      } catch (err) {
        console.warn('[WhatsAppWorkspace] Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Refresh logs
  const refreshLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.warn('[WhatsAppWorkspace] refreshLogs error:', error.message);
        return;
      }

      if (data) {
        setLogs(data.map((row) => ({
          ...row,
          variables: Array.isArray(row.variables) ? row.variables : JSON.parse(JSON.stringify(row.variables)),
        })) as WhatsAppLogRecord[]);
      }
      showToast('success', 'Message logs refreshed');
    } catch (err) {
      console.warn('[WhatsAppWorkspace] refreshLogs error:', err);
    }
  }, []);

  // ============================================================
  // Analytics
  // ============================================================

  const analytics = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((l) => l.status === 'sent').length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;
    return { total, sent, failed, successRate };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.customer_name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.repair_id.toLowerCase().includes(q)
    );
  }, [logs, search]);

  // Selected log entry
  const selectedLog = useMemo(
    () => logs.find((l) => l.id === selectedLogId) || null,
    [logs, selectedLogId]
  );

  // Config from state
  const isApiConnected = waConfig?.enabled ?? false;

  // ============================================================
  // Handlers
  // ============================================================

  const handleResend = async () => {
    if (!selectedLog) return;
    setResending(true);
    try {
      const response = await fetch('http://localhost:5001/api/whatsapp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: selectedLog.id }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update log status in local state
        setLogs((prev) =>
          prev.map((l) =>
            l.id === selectedLog.id
              ? { ...l, status: 'sent' as const, sent_at: new Date().toISOString(), error_message: null }
              : l
          )
        );
        // Update in Supabase
        await supabase
          .from('whatsapp_logs')
          .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
          .eq('id', selectedLog.id);
        showToast('success', `Message resent to ${selectedLog.customer_name} (${selectedLog.repair_id})`);
      } else {
        // Update log status to failed
        const errorMsg = data.error || 'Resend failed';
        setLogs((prev) =>
          prev.map((l) =>
            l.id === selectedLog.id
              ? { ...l, status: 'failed' as const, error_message: errorMsg }
              : l
          )
        );
        await supabase
          .from('whatsapp_logs')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('id', selectedLog.id);
        showToast('error', `Failed to resend: ${errorMsg}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      showToast('error', `Failed to resend: ${message}`);
    } finally {
      setResending(false);
    }
  };

  const handleSaveConfig = async (config: Partial<WhatsAppConfigRecord>) => {
    showFeedback({
      type: 'confirm',
      title: 'Save Gateway Configurations',
      message: 'Are you sure you want to commit these WhatsApp Cloud API configuration changes? This will update the live gateway settings.',
      confirmLabel: 'Save Changes',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('whatsapp_config')
            .upsert({
              id: 1,
              ...config,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

          if (error) {
            showToast('error', `Failed to save: ${error.message}`);
          } else {
            setWaConfig((prev) => prev ? { ...prev, ...config } : null);
            showToast('success', 'WhatsApp gateway configuration saved');
            setConfigOpen(false);
          }
        } catch (err) {
          showToast('error', `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      },
    });
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">WhatsApp Workspace</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Communications center - Message log monitoring & Meta Cloud API gateway
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshLogs} className="btn-secondary text-sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {isAdmin && (
            <button onClick={() => setConfigOpen(true)} className="btn-secondary">
              <Settings className="h-4 w-4" /> Gateway Config
            </button>
          )}
        </div>
      </div>

      {/* Cloud Sync Status Ribbon */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 animate-slide-up"
        style={{
          borderColor: isApiConnected ? '#18BC9C40' : '#F39C1240',
          backgroundColor: isApiConnected ? '#18BC9C08' : '#F39C1208',
        }}
      >
        {isApiConnected ? (
          <Wifi className="h-5 w-5 text-emerald-600" />
        ) : (
          <WifiOff className="h-5 w-5 text-amber-600" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isApiConnected ? 'bg-emerald-500 animate-pulse-soft' : 'bg-amber-500'
              }`}
            />
            <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {isApiConnected ? 'Meta Cloud API Connected' : 'Simulation / Mock Mode Active'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {isApiConnected
              ? `Phone Number ID: ${waConfig?.phone_number_id || 'Not configured'} - API v${waConfig?.api_version || '22.0'}`
              : 'Live API disabled - messages simulated locally for testing'}
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Outbound Logs</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">{analytics.total}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400">
              <Send className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="card p-5 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Delivery Success Rate</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{analytics.successRate}%</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{analytics.sent} successful dispatches</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="card p-5 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Critical Failures</p>
              <p className={`mt-2 text-3xl font-bold ${analytics.failed > 0 ? 'text-red-600' : 'text-gray-900 dark:text-slate-100'}`}>
                {analytics.failed}
              </p>
              {analytics.failed > 0 && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                  <AlertCircle className="h-3 w-3" /> Attention required
                </span>
              )}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main split layout: ledger + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Log Ledger */}
        <div className="lg:col-span-3 card overflow-hidden">
          {/* Search bar */}
          <div className="border-b border-gray-200 dark:border-slate-800 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name, phone, or repair ID..."
                className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] pl-10 pr-4 py-2 text-sm text-gray-700 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 dark:bg-[#0b0f19] border-b border-gray-200 dark:border-slate-800 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Message ID</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Repair ID</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Template</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Dispatched</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 mb-4">
                            <Inbox className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">No message logs found</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Messages will appear here when repair status changes trigger notifications</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, i) => {
                      const pill = STATUS_PILL[log.status as WhatsAppLogStatusUI];
                      const isSelected = log.id === selectedLogId;
                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLogId(log.id)}
                          className={`border-b border-gray-100 dark:border-slate-800 transition-colors cursor-pointer animate-slide-up ${
                            isSelected ? 'bg-brand-50 dark:bg-brand-950/20' : i % 2 === 0 ? 'bg-white dark:bg-[#131b2e] hover:bg-gray-50 dark:hover:bg-slate-800/50' : 'bg-gray-50/30 dark:bg-slate-800/10 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                          }`}
                          style={{ animationDelay: `${i * 20}ms` }}
                        >
                          <td className="px-3 py-3 text-xs font-mono text-gray-500 dark:text-slate-500 truncate max-w-[100px]">{log.id.substring(0, 12)}...</td>
                          <td className="px-3 py-3 text-sm font-mono text-brand-600 dark:text-brand-400 font-medium">{log.repair_id}</td>
                          <td className="px-3 py-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate max-w-[120px]">{log.customer_name}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">{normalizePhone(log.phone)}</p>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-slate-400">{TEMPLATE_LABELS[log.template_name as WhatsAppTemplate]}</td>
                          <td className="px-3 py-3 text-xs text-gray-500 dark:text-slate-400">{formatDateTime(log.created_at)}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full ${pill.bg} ${pill.text} px-2.5 py-0.5 text-xs font-medium capitalize`}>
                              {pill.icon}
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Template Preview Panel */}
        <div className="lg:col-span-2">
          {selectedLog ? (
            <TemplatePreviewPanel
              log={selectedLog}
              repair={state.repairs.find((r) => r.repair_id === selectedLog.repair_id)}
              resending={resending}
              onResend={handleResend}
            />
          ) : (
            <div className="card p-8 h-full flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-300 dark:text-emerald-700 mb-4">
                <MessageCircle className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Select a message log</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-[200px]">
                Click any row in the ledger to preview the WhatsApp template content and message bubble
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Config Drawer */}
      {configOpen && waConfig && (
        <ConfigDrawer
          config={waConfig}
          onSave={handleSaveConfig}
          onClose={() => setConfigOpen(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// Template Preview Panel - iPhone-style bubble
// ============================================================

interface TemplatePreviewPanelProps {
  log: WhatsAppLogRecord;
  repair: RepairRecord | undefined;
  resending: boolean;
  onResend: () => void;
}

function TemplatePreviewPanel({ log, repair, resending, onResend }: TemplatePreviewPanelProps) {
  const templateContent = useMemo(() => {
    if (!repair) return 'Message content unavailable - repair record not found.';
    const v = Array.isArray(log.variables) ? log.variables : JSON.parse(JSON.stringify(log.variables));
    if (log.template_name === 'order_received') {
      return `Hello ${v[0] || repair.customer_name},\n\nWe've received your device for repair:\n\nBrand: ${v[1] || repair.brand}\nModel: ${v[2] || repair.model}\nSerial: ${v[3] || repair.serial}\nRepair ID: ${v[4] || repair.repair_id}\nStatus: ${v[5] || repair.status}\n\nWe'll keep you updated on the progress. Thank you for choosing our service!`;
    }
    if (log.template_name === 'order_finished') {
      const fee = v[6] || String(repair.price);
      return `Hello ${v[0] || repair.customer_name},\n\nGreat news! Your repair is complete:\n\nBrand: ${v[1] || repair.brand}\nModel: ${v[2] || repair.model}\nSerial: ${v[3] || repair.serial}\nRepair ID: ${v[4] || repair.repair_id}\nStatus: ${v[5] || repair.status}\nFinal Fee: ${fee} USD\n\nPlease visit us to pick up your device. Thank you!`;
    }
    return `Hello ${v[0] || repair.customer_name},\n\nYour repair order ${v[4] || repair.repair_id} has been cancelled.\n\nIf you have questions, please contact us.\n\nThank you.`;
  }, [log, repair]);

  return (
    <div className="card overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Template Preview</h3>
        </div>
        <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">{TEMPLATE_LABELS[log.template_name as WhatsAppTemplate]}</span>
      </div>

      {/* Phone mockup */}
      <div className="flex-1 p-6 bg-gray-50 dark:bg-[#0b0f19] flex items-center justify-center">
        <div className="w-full max-w-[280px] rounded-[2rem] bg-gray-900 p-3 shadow-xl">
          {/* Phone header */}
          <div className="rounded-[1.5rem] bg-[#E5DDD5] overflow-hidden">
            <div className="flex items-center gap-2 bg-[#075E54] px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white text-xs font-semibold">
                {(log.customer_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{log.customer_name}</p>
                <p className="text-xs text-white/70 font-mono">{normalizePhone(log.phone)}</p>
              </div>
              <Smartphone className="h-4 w-4 text-white/70" />
            </div>

            {/* Chat area */}
            <div className="p-3 min-h-[200px]">
              <div className="relative rounded-lg bg-[#DCF8C6] px-3 py-2 shadow-sm max-w-[90%]">
                <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">{templateContent}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  {log.status === 'sent' ? (
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />
                  ) : log.status === 'failed' ? (
                    <XCircle className="h-3 w-3 text-red-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-gray-400" />
                  )}
                </div>
                {/* Bubble tail */}
                <div className="absolute -right-1 top-2 h-3 w-3 bg-[#DCF8C6] transform rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with resend */}
      <div className="border-t border-gray-200 dark:border-slate-800 p-4 space-y-3">
        {log.error_message && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-400">{log.error_message}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <span className="font-medium">Template:</span>
          <code className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-gray-600 dark:text-slate-300">{log.template_name}</code>
          <ArrowRight className="h-3 w-3" />
          <span>{Array.isArray(log.variables) ? log.variables.length : 0} variables injected</span>
        </div>
        <button
          onClick={onResend}
          disabled={resending || log.status === 'sent'}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {resending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {resending ? 'Dispatching...' : log.status === 'sent' ? 'Already Sent' : 'Resend Message Trigger'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Config Drawer
// ============================================================

interface ConfigDrawerProps {
  config: WhatsAppConfigRecord;
  onSave: (config: Partial<WhatsAppConfigRecord>) => void;
  onClose: () => void;
}

function ConfigDrawer({ config, onSave, onClose }: ConfigDrawerProps) {
  const [form, setForm] = useState({
    enabled: config.enabled,
    phone_number_id: config.phone_number_id,
    access_token: config.access_token,
    api_version: config.api_version,
    template_language: config.template_language,
    finish_statuses: config.finish_statuses,
    cancel_statuses: config.cancel_statuses,
  });
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="relative z-10 w-full max-w-md bg-white dark:bg-[#131b2e] shadow-2xl animate-slide-in-right h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30">
              <Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Meta Gateway Config</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">WhatsApp Cloud API settings</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Enabled toggle */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-slate-800 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">API Connection</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Enable live Meta Cloud API integration</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                form.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                  form.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Phone Number ID */}
          <div>
            <label className="label">Phone Number ID</label>
            <input
              className="input font-mono"
              value={form.phone_number_id}
              onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
              placeholder="e.g. 107039372694784"
            />
          </div>

          {/* Access Token */}
          <div>
            <label className="label">Cloud Access Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                className="input font-mono pr-10"
                value={form.access_token}
                onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                placeholder="EAAG..."
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Your secret token - masked by default for security</p>
          </div>

          {/* Template Language */}
          <div>
            <label className="label">Template Language</label>
            <select
              className="input"
              value={form.template_language}
              onChange={(e) => setForm({ ...form, template_language: e.target.value })}
            >
              <option value="en_US">English (US)</option>
              <option value="en_GB">English (UK)</option>
              <option value="ar">Arabic</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>

          {/* Flow Statuses */}
          <div>
            <label className="label">Finish Statuses (triggers order_finished)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {form.finish_statuses.map((s) => (
                <span key={s} className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Cancel Statuses (triggers order_cancelled)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {form.cancel_statuses.map((s) => (
                <span key={s} className="rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-2.5 py-0.5 text-xs font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-slate-800 px-5 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" onClick={handleSubmit} className="btn-primary">Save Gateway Configurations</button>
        </div>
      </aside>
    </div>
  );
}

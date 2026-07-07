import { useState, useMemo } from 'react';
import {
  Plus,
  Zap,
  ArrowRight,
  Trash2,
  X,
  Bell,
  ShieldAlert,
  DollarSign,
  MessageCircle,
  FileText,
  Power,
  Inbox,
  Activity,
  CheckCircle2,
  XCircle,
  Settings2,
} from 'lucide-react';
import { showToast } from '../components/Toast';
import type { RepairStatus } from '../types';

// ============================================================
// Strict Automation Rule Schema
// ============================================================

type TriggerEvent = 'status_change' | 'price_threshold' | 'priority_escalation';
type ActionType = 'send_whatsapp' | 'update_priority' | 'flag_invoice' | 'inject_note';
type ConditionField = 'status' | 'customer_type' | 'price' | 'priority';
type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'is_exactly';

interface RuleCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

interface RuleAction {
  id: string;
  type: ActionType;
  label: string;
  template?: string;
  note?: string;
}

interface AutomationRule {
  id: string;
  name: string;
  triggerEvent: TriggerEvent;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  totalTriggers: number;
  lastTriggeredAt: string | null;
}

interface TelemetryEntry {
  id: string;
  timestamp: string;
  ruleId: string;
  ruleName: string;
  repairId: string;
  outcome: 'success' | 'mismatch';
  message: string;
}

// ============================================================
// Constants
// ============================================================

const TICKET_STATUSES: RepairStatus[] = [
  'Pending',
  'In Progress',
  'Awaiting Parts',
  'Ready',
  'Completed',
  'Cancelled',
];

const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  status_change: 'When a repair ticket status updates',
  price_threshold: 'When a quote amount is modified',
  priority_escalation: 'When an asset profile changes',
};

const TRIGGER_ICONS: Record<TriggerEvent, React.ReactNode> = {
  status_change: <Activity className="h-4 w-4" />,
  price_threshold: <DollarSign className="h-4 w-4" />,
  priority_escalation: <ShieldAlert className="h-4 w-4" />,
};

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  send_whatsapp: <MessageCircle className="h-4 w-4" />,
  update_priority: <ShieldAlert className="h-4 w-4" />,
  flag_invoice: <FileText className="h-4 w-4" />,
  inject_note: <FileText className="h-4 w-4" />,
};

const CONDITION_FIELDS: { value: ConditionField; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'customer_type', label: 'Customer Type' },
  { value: 'price', label: 'Repair Fee' },
  { value: 'priority', label: 'Priority' },
];

const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'is_exactly', label: 'Is Exactly Equal To' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Is Not Equal To' },
  { value: 'greater_than', label: 'Is Greater Than' },
  { value: 'less_than', label: 'Is Less Than' },
];

const WHATSAPP_TEMPLATES = [
  { key: 'order_received', label: 'Order Received' },
  { key: 'crm_ready_for_pickup', label: 'CRM Ready For Pickup' },
  { key: 'order_finished', label: 'Order Finished' },
  { key: 'order_cancelled', label: 'Order Cancelled' },
];

// ============================================================
// Mock seed rules (from automation_panel.py logical paths)
// ============================================================

const SEED_RULES: AutomationRule[] = [
  {
    id: 'RULE-001',
    name: 'Auto-Notify on Pickup Ready',
    triggerEvent: 'status_change',
    conditions: [
      { id: 'c1', field: 'status', operator: 'is_exactly', value: 'Ready' },
    ],
    actions: [
      { id: 'a1', type: 'send_whatsapp', label: 'Send WhatsApp Template', template: 'crm_ready_for_pickup' },
    ],
    isActive: true,
    totalTriggers: 47,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
  },
  {
    id: 'RULE-002',
    name: 'VIP Ticket Escalation',
    triggerEvent: 'priority_escalation',
    conditions: [
      { id: 'c2', field: 'customer_type', operator: 'is_exactly', value: 'VIP' },
    ],
    actions: [
      { id: 'a2', type: 'update_priority', label: 'Force Priority to Critical' },
    ],
    isActive: true,
    totalTriggers: 12,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'RULE-003',
    name: 'High Value Security Lock',
    triggerEvent: 'price_threshold',
    conditions: [
      { id: 'c3', field: 'price', operator: 'greater_than', value: '500' },
    ],
    actions: [
      { id: 'a3', type: 'flag_invoice', label: 'Append Internal Admin Audit Log entry' },
    ],
    isActive: false,
    totalTriggers: 5,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
];

// Mock telemetry entries
const SEED_TELEMETRY: TelemetryEntry[] = [
  {
    id: 't1',
    timestamp: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
    ruleId: 'RULE-001',
    ruleName: 'Auto-Notify on Pickup Ready',
    repairId: 'REP-0047',
    outcome: 'success',
    message: 'Condition Met - Dispatched Successfully',
  },
  {
    id: 't2',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    ruleId: 'RULE-002',
    ruleName: 'VIP Ticket Escalation',
    repairId: 'REP-0032',
    outcome: 'success',
    message: 'Condition Met - Dispatched Successfully',
  },
  {
    id: 't3',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    ruleId: 'RULE-001',
    ruleName: 'Auto-Notify on Pickup Ready',
    repairId: 'REP-0029',
    outcome: 'mismatch',
    message: 'Condition Mismatch - Execution Terminated',
  },
  {
    id: 't4',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    ruleId: 'RULE-003',
    ruleName: 'High Value Security Lock',
    repairId: 'REP-0021',
    outcome: 'mismatch',
    message: 'Condition Mismatch - Execution Terminated',
  },
  {
    id: 't5',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    ruleId: 'RULE-001',
    ruleName: 'Auto-Notify on Pickup Ready',
    repairId: 'REP-0018',
    outcome: 'success',
    message: 'Condition Met - Dispatched Successfully',
  },
];

// ============================================================
// Component
// ============================================================

export function AutomationRulesPage() {
  const [rules, setRules] = useState<AutomationRule[]>(SEED_RULES);
  const [telemetry, setTelemetry] = useState<TelemetryEntry[]>(SEED_TELEMETRY);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ============================================================
  // Handlers
  // ============================================================

  const handleToggle = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newActive = !r.isActive;
          showToast(newActive ? 'success' : 'info', `Rule "${r.name}" ${newActive ? 'activated' : 'deactivated'}`);
          return { ...r, isActive: newActive };
        }
        return r;
      })
    );
  };

  const handleDelete = (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (rule && confirm(`Delete automation rule "${rule.name}"?`)) {
      setRules((prev) => prev.filter((r) => r.id !== id));
      showToast('success', `Rule "${rule.name}" deleted`);
    }
  };

  const handleCreateRule = (rule: AutomationRule) => {
    setRules((prev) => [...prev, rule]);
    showToast('success', `Automation rule "${rule.name}" created`);
    setDrawerOpen(false);
  };

  const handleSimulateTrigger = (rule: AutomationRule) => {
    const repairId = `REP-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    const entry: TelemetryEntry = {
      id: `t${Date.now()}`,
      timestamp: new Date().toISOString(),
      ruleId: rule.id,
      ruleName: rule.name,
      repairId,
      outcome: 'success',
      message: 'Condition Met - Dispatched Successfully',
    };
    setTelemetry((prev) => [entry, ...prev]);
    setRules((prev) =>
      prev.map((r) =>
        r.id === rule.id
          ? { ...r, totalTriggers: r.totalTriggers + 1, lastTriggeredAt: new Date().toISOString() }
          : r
      )
    );
    showToast('success', `Rule "${rule.name}" triggered for ${repairId}`);
  };

  // Stats
  const stats = useMemo(() => ({
    total: rules.length,
    active: rules.filter((r) => r.isActive).length,
    totalTriggers: rules.reduce((sum, r) => sum + r.totalTriggers, 0),
  }), [rules]);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Automation Rule Builder</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            IFTTT-style event-trigger engine · {stats.active} active rules · {stats.totalTriggers} total executions
          </p>
        </div>
        <button onClick={() => setDrawerOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Automation Rule
        </button>
      </div>

      {/* Stats ribbon */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Total Rules</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Active</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand-600">{stats.totalTriggers}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Total Triggers</p>
        </div>
      </div>

      {/* Split layout: Pipeline feed + Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Pipeline Feed (left, 3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Rule Pipeline Feed</h2>
          </div>
          {rules.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 mx-auto mb-4">
                <Inbox className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">No automation rules configured</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Click "Add Automation Rule" to create your first IFTTT pipeline</p>
            </div>
          ) : (
            rules.map((rule, i) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => handleToggle(rule.id)}
                onDelete={() => handleDelete(rule.id)}
                onSimulate={() => handleSimulateTrigger(rule)}
                delay={i * 50}
              />
            ))
          )}
        </div>

        {/* Telemetry Ledger (right, 2 cols) */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Execution Telemetry Ledger</h2>
          </div>
          <div className="card overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 dark:bg-[#0b0f19] border-b border-gray-200 dark:border-slate-800 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Rule</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Asset</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <p className="text-sm text-gray-400 dark:text-slate-500">No execution events recorded</p>
                      </td>
                    </tr>
                  ) : (
                    telemetry.map((entry, i) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-gray-100 dark:border-slate-800 transition-colors animate-slide-up ${
                          i % 2 === 0 ? 'bg-white dark:bg-[#131b2e]' : 'bg-gray-50/30 dark:bg-slate-800/10'
                        }`}
                        style={{ animationDelay: `${i * 20}ms` }}
                      >
                        <td className="px-3 py-2.5 text-xs font-mono text-gray-500 dark:text-slate-400">
                          {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-950/20 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-400">
                            {entry.ruleId}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-brand-600 dark:text-brand-400 font-medium">{entry.repairId}</td>
                        <td className="px-3 py-2.5">
                          {entry.outcome === 'success' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Dispatched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-slate-400">
                              <XCircle className="h-3 w-3" />
                              Terminated
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Rule Builder Drawer */}
      {drawerOpen && (
        <RuleBuilderDrawer
          onClose={() => setDrawerOpen(false)}
          onCreate={handleCreateRule}
          nextRuleId={`RULE-${String(rules.length + 1).padStart(3, '0')}`}
        />
      )}
    </div>
  );
}

// ============================================================
// Rule Card — Pipeline visualization
// ============================================================

interface RuleCardProps {
  rule: AutomationRule;
  onToggle: () => void;
  onDelete: () => void;
  onSimulate: () => void;
  delay: number;
}

function RuleCard({ rule, onToggle, onDelete, onSimulate, delay }: RuleCardProps) {
  return (
    <div
      className={`card p-5 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg animate-slide-up ${
        rule.isActive ? 'border-l-4 border-l-brand-500' : 'opacity-75'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            rule.isActive ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500'
          }`}>
            {TRIGGER_ICONS[rule.triggerEvent]}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{rule.name}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{TRIGGER_LABELS[rule.triggerEvent]}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle switch */}
          <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
              rule.isActive ? 'bg-brand-600' : 'bg-gray-300 dark:bg-slate-700'
            }`}
            title={rule.isActive ? 'Click to deactivate' : 'Click to activate'}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              rule.isActive ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Flow visualization: TRIGGER -> CONDITIONS -> ACTIONS */}
      <div className="flex items-stretch gap-2">
        {/* Trigger */}
        <div className="flex-1 rounded-lg border border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10 px-3 py-2">
          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Trigger</p>
          <p className="text-xs text-gray-700 dark:text-slate-300 font-medium leading-tight">{TRIGGER_LABELS[rule.triggerEvent]}</p>
        </div>

        {/* Arrow */}
        <div className="flex items-center">
          <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600" />
        </div>

        {/* Conditions */}
        <div className="flex-1 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10 px-3 py-2">
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Conditions</p>
          <div className="space-y-0.5">
            {rule.conditions.map((c) => (
              <p key={c.id} className="text-xs text-gray-700 dark:text-slate-300 leading-tight">
                {c.field} {c.operator.replace(/_/g, ' ')} <span className="font-medium">{c.value}</span>
              </p>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center">
          <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600" />
        </div>

        {/* Actions */}
        <div className="flex-1 rounded-lg border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 px-3 py-2">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Actions</p>
          <div className="space-y-0.5">
            {rule.actions.map((a) => (
              <p key={a.id} className="text-xs text-gray-700 dark:text-slate-300 leading-tight flex items-center gap-1">
                {ACTION_ICONS[a.type]}
                <span className="font-medium">{a.label}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: telemetry + simulate */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-3">
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <Power className="h-3 w-3" />
            {rule.isActive ? 'Active' : 'Disabled'}
          </span>
          <span>·</span>
          <span>{rule.totalTriggers} triggers</span>
          {rule.lastTriggeredAt && (
            <>
              <span>·</span>
              <span>Last: {new Date(rule.lastTriggeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </>
          )}
        </div>
        <button
          onClick={onSimulate}
          className="flex items-center gap-1 rounded-lg bg-gray-50 dark:bg-slate-800/50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-slate-400 transition-colors hover:bg-brand-50 dark:hover:bg-brand-950/20 hover:text-brand-700 dark:hover:text-brand-400"
        >
          <Zap className="h-3 w-3" />
          Simulate Trigger
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Rule Builder Drawer
// ============================================================

interface RuleBuilderDrawerProps {
  onClose: () => void;
  onCreate: (rule: AutomationRule) => void;
  nextRuleId: string;
}

function RuleBuilderDrawer({ onClose, onCreate, nextRuleId }: RuleBuilderDrawerProps) {
  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState<TriggerEvent>('status_change');
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { id: `c${Date.now()}`, field: 'status', operator: 'is_exactly', value: 'Ready' },
  ]);
  const [actions, setActions] = useState<RuleAction[]>([]);
  const [actionType, setActionType] = useState<ActionType>('send_whatsapp');
  const [whatsappTemplate, setWhatsappTemplate] = useState('crm_ready_for_pickup');
  const [customNote, setCustomNote] = useState('');

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { id: `c${Date.now()}`, field: 'status', operator: 'is_exactly', value: 'Pending' },
    ]);
  };

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, field: keyof RuleCondition, value: string) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const addAction = () => {
    if (actionType === 'send_whatsapp') {
      const tmpl = WHATSAPP_TEMPLATES.find((t) => t.key === whatsappTemplate);
      setActions((prev) => [
        ...prev,
        {
          id: `a${Date.now()}`,
          type: 'send_whatsapp',
          label: `Send WhatsApp: ${tmpl?.label || whatsappTemplate}`,
          template: whatsappTemplate,
        },
      ]);
    } else if (actionType === 'inject_note') {
      setActions((prev) => [
        ...prev,
        {
          id: `a${Date.now()}`,
          type: 'inject_note',
          label: customNote || 'Inject Custom System Note',
          note: customNote,
        },
      ]);
      setCustomNote('');
    } else if (actionType === 'update_priority') {
      setActions((prev) => [
        ...prev,
        { id: `a${Date.now()}`, type: 'update_priority', label: 'Force Priority to Critical' },
      ]);
    } else if (actionType === 'flag_invoice') {
      setActions((prev) => [
        ...prev,
        { id: `a${Date.now()}`, type: 'flag_invoice', label: 'Flag Invoice for Admin Audit' },
      ]);
    }
  };

  const removeAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Rule name is required');
      return;
    }
    if (conditions.length === 0) {
      showToast('error', 'At least one condition is required');
      return;
    }
    if (actions.length === 0) {
      showToast('error', 'At least one action is required');
      return;
    }
    onCreate({
      id: nextRuleId,
      name: name.trim(),
      triggerEvent,
      conditions,
      actions,
      isActive: true,
      totalTriggers: 0,
      lastTriggeredAt: null,
    });
  };

  // Value options based on condition field
  const getValueOptions = (field: ConditionField): string[] => {
    if (field === 'status') return TICKET_STATUSES;
    if (field === 'customer_type') return ['Walk-in', 'Corporate', 'VIP'];
    if (field === 'priority') return ['Low', 'Medium', 'High', 'Critical'];
    return [];
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#131b2e] shadow-2xl animate-slide-in-right h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/30">
              <Settings2 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Compose Automation Rule</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">IFTTT pipeline builder · {nextRuleId}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-5">
            {/* Rule name */}
            <div>
              <label className="label">Rule Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Auto-Notify on Status Change"
                autoFocus
              />
            </div>

            {/* TRIGGER DEFINITION */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                  <Zap className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Trigger Definition</h3>
              </div>
              <label className="label">When should this rule fire?</label>
              <select
                className="input"
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value as TriggerEvent)}
              >
                {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* CONDITION FILTER MATRICES */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                    <Activity className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Condition Filter Matrices</h3>
                </div>
                <button
                  type="button"
                  onClick={addCondition}
                  className="flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/40"
                >
                  <Plus className="h-3 w-3" /> Add Condition
                </button>
              </div>
              <div className="space-y-2">
                {conditions.map((cond, idx) => (
                  <div key={cond.id} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-800 p-2">
                    <span className="text-xs font-mono text-gray-400 dark:text-slate-500 flex-shrink-0">#{idx + 1}</span>
                    <select
                      className="input flex-1 py-1.5 text-sm"
                      value={cond.field}
                      onChange={(e) => updateCondition(cond.id, 'field', e.target.value)}
                    >
                      {CONDITION_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <select
                      className="input flex-1 py-1.5 text-sm"
                      value={cond.operator}
                      onChange={(e) => updateCondition(cond.id, 'operator', e.target.value)}
                    >
                      {CONDITION_OPERATORS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {getValueOptions(cond.field).length > 0 ? (
                      <select
                        className="input flex-1 py-1.5 text-sm"
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}
                      >
                        {getValueOptions(cond.field).map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input flex-1 py-1.5 text-sm"
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}
                        placeholder="Enter value..."
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeCondition(cond.id)}
                      className="rounded-lg p-1 text-gray-400 dark:text-slate-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CONTEXTUAL ACTIONS ALLOCATION */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                    <Bell className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Contextual Actions Allocation</h3>
                </div>
              </div>

              {/* Action picker */}
              <div className="rounded-lg border border-gray-200 dark:border-slate-800 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    className="input py-1.5 text-sm"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as ActionType)}
                  >
                    <option value="send_whatsapp">Trigger Meta Cloud API Dispatched Template</option>
                    <option value="inject_note">Inject Custom System Note</option>
                    <option value="update_priority">Force Priority Escalation</option>
                    <option value="flag_invoice">Flag Invoice for Audit</option>
                  </select>

                  {actionType === 'send_whatsapp' && (
                    <select
                      className="input py-1.5 text-sm"
                      value={whatsappTemplate}
                      onChange={(e) => setWhatsappTemplate(e.target.value)}
                    >
                      {WHATSAPP_TEMPLATES.map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                  )}

                  {actionType === 'inject_note' && (
                    <input
                      className="input py-1.5 text-sm"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="Enter note text..."
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={addAction}
                  className="w-full flex items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700 py-2 text-sm font-medium text-gray-500 dark:text-slate-400 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/10 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  <Plus className="h-4 w-4" /> Add Action
                </button>
              </div>

              {/* Action list */}
              {actions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {actions.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 px-3 py-2">
                      <span className="text-emerald-600 dark:text-emerald-400">{ACTION_ICONS[a.type]}</span>
                      <span className="flex-1 text-sm text-gray-700 dark:text-slate-300">{a.label}</span>
                      <button
                        type="button"
                        onClick={() => removeAction(a.id)}
                        className="rounded-lg p-1 text-gray-400 dark:text-slate-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] px-6 py-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Rule</button>
          </div>
        </form>
      </aside>
    </div>
  );
}


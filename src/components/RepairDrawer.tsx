import { useState, useEffect, useMemo, useRef } from 'react';
import { X, AlertCircle, User, Smartphone, Settings, DollarSign, Bot, BellOff, History, Building2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { showToast } from './Toast';
import { automationEngine, type AutomationTelemetryEntry, type TelemetryOutcome } from '../services/automationEngine';
import { formatDateTime } from '../utils/helpers';
import type { RepairRecord, RepairStatus } from '../types';

// ============================================================
// Constants
// ============================================================

const STATUSES: RepairStatus[] = [
  'Pending',
  'In Progress',
  'Awaiting Parts',
  'Ready',
  'Completed',
  'Cancelled',
];

const CUSTOMER_TYPES = ['Walk-in', 'Corporate', 'VIP'] as const;
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
const CONDITION_CHECKS = [
  'Scratches present',
  'Screen cracked',
  'Dents on housing',
  'Liquid damage suspected',
  'Powers on',
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/50',
  Medium: 'border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
  High: 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
  Critical: 'border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
};

// ============================================================
// Form type
// ============================================================

interface RepairForm {
  customer_name: string;
  phone: string;
  email: string;
  customer_type: string;
  brand: string;
  model: string;
  serial: string;
  condition: string[];
  problem: string;
  technician: string;
  priority: string;
  status: RepairStatus;
  estimated_delivery: string;
  estimated_quote: number;
  parts_cost: number;
  final_fee: number;
  technician_notes: string;
  // Extra fields kept for schema compatibility
  mof: string;
  address: string;
  website: string;
  date_in: string;
  date_out: string;
  device_notes: string;
  warranty: number;
  notes: string;
  // Corporate / B2B fields
  is_corporate: boolean;
  corporate_mof: string;
  corporate_address: string;
  corporate_email: string;
  corporate_website: string;
}

const EMPTY_FORM: RepairForm = {
  customer_name: '',
  phone: '',
  email: '',
  customer_type: 'Walk-in',
  brand: '',
  model: '',
  serial: '',
  condition: [],
  problem: '',
  technician: '',
  priority: 'Medium',
  status: 'Pending',
  estimated_delivery: '',
  estimated_quote: 0,
  parts_cost: 0,
  final_fee: 0,
  technician_notes: '',
  mof: '',
  address: '',
  website: '',
  date_in: new Date().toISOString().split('T')[0],
  date_out: '',
  device_notes: '',
  warranty: 0,
  notes: '',
  is_corporate: false,
  corporate_mof: '',
  corporate_address: '',
  corporate_email: '',
  corporate_website: '',
};

// ============================================================
// Props
// ============================================================

interface RepairDrawerProps {
  open: boolean;
  onClose: () => void;
  editingRepair: RepairRecord | null;
}

// ============================================================
// Component
// ============================================================

export function RepairDrawer({ open, onClose, editingRepair }: RepairDrawerProps) {
  const { state, service } = useStore();
  const [form, setForm] = useState<RepairForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'automation'>('form');
  const [telemetry, setTelemetry] = useState<AutomationTelemetryEntry[]>([]);
  const [muted, setMuted] = useState(false);
  const initializedRef = useRef(false);

  // Subscribe to automation telemetry
  useEffect(() => {
    const unsub = automationEngine.subscribe((entries) => {
      setTelemetry(entries);
    });
    return unsub;
  }, []);

  // Update mute state when editing target changes
  useEffect(() => {
    if (editingRepair) {
      setMuted(automationEngine.isMuted(editingRepair.repair_id));
    }
  }, [editingRepair, open]);

  const handleToggleMute = () => {
    if (!editingRepair) return;
    const newMuted = !muted;
    setMuted(newMuted);
    automationEngine.setMuted(editingRepair.repair_id, newMuted);
    showToast(newMuted ? 'warning' : 'success', `Automation notifications ${newMuted ? 'muted' : 'enabled'} for ${editingRepair.repair_id}`);
  };

  // Load data when drawer opens or editing target changes
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (editingRepair) {
      setForm({
        customer_name: editingRepair.customer_name,
        phone: editingRepair.phone,
        email: editingRepair.email,
        customer_type: 'Walk-in',
        brand: editingRepair.brand,
        model: editingRepair.model,
        serial: editingRepair.serial,
        condition: editingRepair.condition ? editingRepair.condition.split(', ').filter(Boolean) : [],
        problem: editingRepair.problem,
        technician: editingRepair.technician,
        priority: 'Medium',
        status: editingRepair.status,
        estimated_delivery: editingRepair.date_out || '',
        estimated_quote: editingRepair.price,
        parts_cost: 0,
        final_fee: editingRepair.price,
        technician_notes: editingRepair.technician_notes,
        mof: editingRepair.mof,
        address: editingRepair.address,
        website: editingRepair.website,
        date_in: editingRepair.date_in,
        date_out: editingRepair.date_out || '',
        device_notes: editingRepair.device_notes,
        warranty: editingRepair.warranty,
        notes: editingRepair.notes,
        is_corporate: editingRepair.is_corporate ?? false,
        corporate_mof: editingRepair.corporate_mof ?? '',
        corporate_address: editingRepair.corporate_address ?? '',
        corporate_email: editingRepair.corporate_email ?? '',
        corporate_website: editingRepair.corporate_website ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    initializedRef.current = true;
  }, [open, editingRepair]);

  // Dirty state check
  const isDirty = useMemo(() => {
    if (!initializedRef.current) return false;
    const baseline = editingRepair ? {
      customer_name: editingRepair.customer_name,
      phone: editingRepair.phone,
      email: editingRepair.email,
      brand: editingRepair.brand,
      model: editingRepair.model,
      serial: editingRepair.serial,
      problem: editingRepair.problem,
      technician: editingRepair.technician,
      status: editingRepair.status,
      final_fee: editingRepair.price,
      technician_notes: editingRepair.technician_notes,
    } : null;

    if (!baseline) {
      return !!form.customer_name || !!form.phone || !!form.model || !!form.problem || !!form.brand;
    }
    return (
      form.customer_name !== baseline.customer_name ||
      form.phone !== baseline.phone ||
      form.email !== baseline.email ||
      form.brand !== baseline.brand ||
      form.model !== baseline.model ||
      form.serial !== baseline.serial ||
      form.problem !== baseline.problem ||
      form.technician !== baseline.technician ||
      form.status !== baseline.status ||
      form.final_fee !== baseline.final_fee ||
      form.technician_notes !== baseline.technician_notes
    );
  }, [form, editingRepair]);

  // Active staff for technician dropdown
  const technicians = useMemo(
    () => state.users.filter((u) => u.role === 'technician' || u.role === 'admin'),
    [state.users]
  );

  // ============================================================
  // Handlers
  // ============================================================

  const handleChange = (field: keyof RepairForm, value: string | number | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleCondition = (check: string) => {
    setForm((prev) => ({
      ...prev,
      condition: prev.condition.includes(check)
        ? prev.condition.filter((c) => c !== check)
        : [...prev.condition, check],
    }));
  };

  const handleClose = () => {
    if (isDirty) {
      setShowDirtyConfirm(true);
    } else {
      onClose();
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.customer_name.trim()) errs.customer_name = 'Customer name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    if (!form.model.trim()) errs.model = 'Device model is required';
    if (!form.problem.trim()) errs.problem = 'Fault description is required';
    if (form.estimated_quote < 0) errs.estimated_quote = 'Cannot be negative';
    if (form.parts_cost < 0) errs.parts_cost = 'Cannot be negative';
    if (form.final_fee < 0) errs.final_fee = 'Cannot be negative';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('error', 'Please fix the highlighted fields');
      return;
    }

    const finalFee = form.final_fee || form.estimated_quote;
    const conditionStr = form.condition.join(', ');

    if (editingRepair) {
      service.updateRepair(editingRepair.id, {
        customer_name: form.customer_name,
        phone: form.phone,
        email: form.email,
        brand: form.brand,
        model: form.model,
        serial: form.serial,
        condition: conditionStr,
        problem: form.problem,
        technician: form.technician,
        status: form.status,
        date_out: form.estimated_delivery || null,
        price: Number(finalFee) || 0,
        technician_notes: form.technician_notes,
        mof: form.mof,
        address: form.address,
        website: form.website,
        date_in: form.date_in,
        device_notes: form.device_notes,
        warranty: Number(form.warranty) || 0,
        notes: form.notes,
        is_corporate: form.is_corporate,
        corporate_mof: form.corporate_mof,
        corporate_address: form.corporate_address,
        corporate_email: form.corporate_email,
        corporate_website: form.corporate_website,
      });
      showToast('success', `Repair ${editingRepair.repair_id} updated`);
    } else {
      const repairId = service.nextRepairId();
      service.addRepair({
        repair_id: repairId,
        customer_name: form.customer_name,
        mof: form.mof,
        phone: form.phone,
        address: form.address,
        email: form.email,
        website: form.website,
        date_in: form.date_in,
        date_out: form.estimated_delivery || null,
        brand: form.brand,
        model: form.model,
        serial: form.serial,
        condition: conditionStr,
        problem: form.problem,
        device_notes: form.device_notes,
        status: form.status,
        technician: form.technician,
        technician_notes: form.technician_notes,
        warranty: Number(form.warranty) || 0,
        price: Number(finalFee) || 0,
        notes: form.notes,
        is_corporate: form.is_corporate,
        corporate_mof: form.corporate_mof,
        corporate_address: form.corporate_address,
        corporate_email: form.corporate_email,
        corporate_website: form.corporate_website,
      });
      showToast('success', `Repair ${repairId} created`);
    }
    onClose();
  };

  if (!open) return null;

  // ============================================================
  // Render
  // ============================================================

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-[#131b2e] shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {editingRepair ? `Edit Repair ${editingRepair.repair_id}` : 'New Repair Ticket'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
              {editingRepair ? 'Update repair details — changes logged to audit trail' : 'Register a new device for repair'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab bar */}
        {editingRepair && (
          <div className="flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] px-6">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'form' ? 'text-brand-700 dark:text-brand-400 border-b-2 border-brand-500' : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              <Settings className="h-4 w-4" /> Form
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('automation')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'automation' ? 'text-brand-700 dark:text-brand-400 border-b-2 border-brand-500' : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              <Bot className="h-4 w-4" /> Automation Audit Hub
            </button>
          </div>
        )}

        {/* Form body */}
        {activeTab === 'form' && (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-5">
            {/* SECTION A: Customer Intake Metadata */}
            <Section icon={<User className="h-4 w-4" />} title="Section A — Customer Intake Metadata">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Customer Full Name" required error={errors.customer_name}>
                  <input
                    className={`input ${errors.customer_name ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                    value={form.customer_name}
                    onChange={(e) => handleChange('customer_name', e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label="Customer Phone Number" required error={errors.phone}>
                  <input
                    className={`input ${errors.phone ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+961 71 123 456"
                  />
                </Field>
                <Field label="Customer Email Address">
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </Field>
                <Field label="Referral / Customer Type">
                  <select
                    className="input"
                    value={form.customer_type}
                    onChange={(e) => handleChange('customer_type', e.target.value)}
                  >
                    {CUSTOMER_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Corporate / B2B Toggle */}
              <div className="mt-4">
                <div
                  className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all cursor-pointer ${
                    form.is_corporate
                      ? 'border-brand-400 dark:border-brand-600 bg-brand-50 dark:bg-brand-950/20'
                      : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                  onClick={() => handleChange('is_corporate', !form.is_corporate)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      form.is_corporate
                        ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                    }`}>
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        form.is_corporate ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-slate-300'
                      }`}>Corporate / B2B Client</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        {form.is_corporate ? 'Business fields enabled — MOF & company details required' : 'Enable for business invoicing with VAT & MOF registration'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleChange('is_corporate', !form.is_corporate); }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                      form.is_corporate ? 'bg-brand-600' : 'bg-gray-300 dark:bg-slate-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.is_corporate ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Corporate fields — revealed when toggle is on */}
                {form.is_corporate && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-brand-200 dark:border-brand-800/40 bg-brand-50/30 dark:bg-brand-950/10 p-4 animate-fade-in">
                    <Field label="MOF# (Ministry of Finance)">
                      <input
                        className="input"
                        value={form.corporate_mof}
                        onChange={(e) => handleChange('corporate_mof', e.target.value)}
                        placeholder="e.g. 123456-789"
                      />
                    </Field>
                    <Field label="Business Email">
                      <input
                        type="email"
                        className="input"
                        value={form.corporate_email}
                        onChange={(e) => handleChange('corporate_email', e.target.value)}
                        placeholder="billing@company.com"
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Business Address">
                        <input
                          className="input"
                          value={form.corporate_address}
                          onChange={(e) => handleChange('corporate_address', e.target.value)}
                          placeholder="Company street address, city, country"
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Business Website">
                        <input
                          className="input"
                          value={form.corporate_website}
                          onChange={(e) => handleChange('corporate_website', e.target.value)}
                          placeholder="https://company.com"
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* SECTION B: Device Identity & Physical Audit */}
            <Section icon={<Smartphone className="h-4 w-4" />} title="Section B — Device Identity & Physical Audit">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Device Brand / Manufacturer">
                  <input
                    className="input"
                    value={form.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    placeholder="e.g. Apple, Samsung, HP"
                  />
                </Field>
                <Field label="Device Model" required error={errors.model}>
                  <input
                    className={`input ${errors.model ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                    value={form.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    placeholder="e.g. iPhone 14 Pro"
                  />
                </Field>
                <Field label="Serial Number / IMEI">
                  <input
                    className="input font-mono"
                    value={form.serial}
                    onChange={(e) => handleChange('serial', e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <label className="label">Pre-Repair Physical Condition Checklist</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                    {CONDITION_CHECKS.map((check) => {
                      const checked = form.condition.includes(check);
                      return (
                        <label
                          key={check}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all ${
                            checked
                              ? 'border-brand-400 dark:border-brand-700 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
                              : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCondition(check)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
                          />
                          {check}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Main Diagnostic Fault Description" required error={errors.problem}>
                    <textarea
                      className={`input ${errors.problem ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                      rows={3}
                      value={form.problem}
                      onChange={(e) => handleChange('problem', e.target.value)}
                      placeholder="Describe the reported issue and diagnostic findings..."
                    />
                  </Field>
                </div>
              </div>
            </Section>

            {/* SECTION C: Operational Assignments & Priorities */}
            <Section icon={<Settings className="h-4 w-4" />} title="Section C — Operational Assignments & Priorities">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Assigned Technician">
                  <select
                    className="input"
                    value={form.technician}
                    onChange={(e) => handleChange('technician', e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.username}>
                        {t.username} ({t.role})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Repair Status Matrix">
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) => handleChange('status', e.target.value as RepairStatus)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <label className="label">Priority Tier Indicator</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleChange('priority', p)}
                        className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                          form.priority === p
                            ? PRIORITY_COLORS[p]
                            : 'border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 hover:border-gray-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* SECTION D: Financial Quotes & Timeline Logistics */}
            <Section icon={<DollarSign className="h-4 w-4" />} title="Section D — Financial Quotes & Timeline Logistics">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Estimated Delivery Date & Time">
                  <input
                    type="date"
                    className="input"
                    value={form.estimated_delivery}
                    onChange={(e) => handleChange('estimated_delivery', e.target.value)}
                  />
                </Field>
                <Field label="Estimated Quote / Cost" error={errors.estimated_quote}>
                  <input
                    type="number"
                    min={0}
                    className={`input ${errors.estimated_quote ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                    value={form.estimated_quote}
                    onChange={(e) => handleChange('estimated_quote', Number(e.target.value))}
                  />
                </Field>
                <Field label="Internal Parts Cost" error={errors.parts_cost}>
                  <input
                    type="number"
                    min={0}
                    className={`input ${errors.parts_cost ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                    value={form.parts_cost}
                    onChange={(e) => handleChange('parts_cost', Number(e.target.value))}
                  />
                </Field>
                <Field label="Final Repair Fee Charged" error={errors.final_fee}>
                  <input
                    type="number"
                    min={0}
                    className={`input ${errors.final_fee ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                    value={form.final_fee}
                    onChange={(e) => handleChange('final_fee', Number(e.target.value))}
                    placeholder={form.estimated_quote ? `Defaults to ${form.estimated_quote}` : 'Copies from quote if blank'}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Internal Technician Notes">
                    <textarea
                      className="input"
                      rows={3}
                      value={form.technician_notes}
                      onChange={(e) => handleChange('technician_notes', e.target.value)}
                      placeholder="Private workshop log entry — not visible to customer..."
                    />
                  </Field>
                </div>
              </div>
            </Section>
          </div>

          {/* Footer actions */}
          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] px-6 py-4">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingRepair ? 'Save Changes' : 'Create Repair Ticket'}
            </button>
          </div>
        </form>
        )}

        {/* Automation Audit Hub tab */}
        {activeTab === 'automation' && editingRepair && (
          <AutomationAuditHub
            repairId={editingRepair.repair_id}
            telemetry={telemetry.filter((t) => t.repair_id === editingRepair.repair_id)}
            muted={muted}
            onToggleMute={handleToggleMute}
          />
        )}
      </aside>

      {/* Dirty state confirmation */}
      {showDirtyConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowDirtyConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl animate-slide-up p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Unsaved Changes</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              You have unsaved changes in this repair form. Closing now will discard all entered data. Are you sure?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDirtyConfirm(false)} className="btn-secondary">
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowDirtyConfirm(false);
                  onClose();
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// Automation Audit Hub — per-repair notification control
// ============================================================

const OUTCOME_PILL: Record<TelemetryOutcome, { bg: string; text: string; label: string }> = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Dispatched' },
  mismatch: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Terminated' },
  muted: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Muted' },
  queued: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Queued' },
  processing: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Processing' },
  error: { bg: 'bg-red-50', text: 'text-red-700', label: 'Error' },
};

function AutomationAuditHub({
  repairId,
  telemetry,
  muted,
  onToggleMute,
}: {
  repairId: string;
  telemetry: AutomationTelemetryEntry[];
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
      {/* Mute toggle */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${muted ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {muted ? <BellOff className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Mute Automation Notifications</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {muted
                ? 'Background engine will skip all automated dispatches for this asset'
                : 'Background engine will process all matching rules for this asset'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleMute}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
            muted ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            muted ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* History log */}
      <div>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
          <History className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Notification Dispatch History — {repairId}</h3>
        </div>

        {telemetry.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 mb-3">
              <History className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-gray-600">No automation events recorded</p>
            <p className="text-xs text-gray-400 mt-1">Background engine dispatches will appear here when rules fire</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trigger</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Target</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Template</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody>
                {telemetry.map((entry, i) => {
                  const pill = OUTCOME_PILL[entry.outcome];
                  return (
                    <tr key={entry.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{formatDateTime(entry.timestamp)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 capitalize">{entry.trigger_event.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-700">{entry.phone}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 font-mono">{entry.template_signature}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center rounded-full ${pill.bg} ${pill.text} px-2 py-0.5 text-xs font-medium`}>
                          {pill.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">{entry.message}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Section wrapper
// ============================================================

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ============================================================
// Field wrapper
// ============================================================

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

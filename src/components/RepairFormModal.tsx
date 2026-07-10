import { useState, useEffect } from 'react';
import { User, Smartphone, Wrench, Building2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Modal } from './Modal';
import { showToast } from './Toast';
import type { RepairRecord, RepairStatus } from '../types';

const STATUSES: RepairStatus[] = [
  'Pending',
  'In Progress',
  'Awaiting Parts',
  'Ready',
  'Ready For Pickup',
  'Completed',
  'Cancelled',
  'Canceled',
];

type FormTab = 'customer' | 'device' | 'repair' | 'corporate';

interface RepairFormModalProps {
  open: boolean;
  onClose: () => void;
  editingRepair: RepairRecord | null;
}

interface RepairForm {
  customer_name: string;
  mof: string;
  phone: string;
  address: string;
  email: string;
  website: string;
  date_in: string;
  date_out: string;
  brand: string;
  model: string;
  serial: string;
  condition: string;
  problem: string;
  device_notes: string;
  status: RepairStatus;
  technician: string;
  technician_notes: string;
  warranty: number;
  price: number;
  notes: string;
  // Corporate fields
  is_corporate: boolean;
  corporate_mof: string;
  corporate_address: string;
  corporate_email: string;
  corporate_website: string;
}

const EMPTY_FORM: RepairForm = {
  customer_name: '',
  mof: '',
  phone: '',
  address: '',
  email: '',
  website: '',
  date_in: new Date().toISOString().split('T')[0],
  date_out: '',
  brand: '',
  model: '',
  serial: '',
  condition: '',
  problem: '',
  device_notes: '',
  status: 'Pending',
  technician: '',
  technician_notes: '',
  warranty: 0,
  price: 0,
  notes: '',
  // Corporate defaults
  is_corporate: false,
  corporate_mof: '',
  corporate_address: '',
  corporate_email: '',
  corporate_website: '',
};

export function RepairFormModal({ open, onClose, editingRepair }: RepairFormModalProps) {
  const { state, service } = useStore();
  const [form, setForm] = useState<RepairForm>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<FormTab>('customer');

  useEffect(() => {
    if (editingRepair) {
      setForm({
        customer_name: editingRepair.customer_name,
        mof: editingRepair.mof,
        phone: editingRepair.phone,
        address: editingRepair.address,
        email: editingRepair.email,
        website: editingRepair.website,
        date_in: editingRepair.date_in,
        date_out: editingRepair.date_out || '',
        brand: editingRepair.brand,
        model: editingRepair.model,
        serial: editingRepair.serial,
        condition: editingRepair.condition,
        problem: editingRepair.problem,
        device_notes: editingRepair.device_notes,
        status: editingRepair.status,
        technician: editingRepair.technician,
        technician_notes: editingRepair.technician_notes,
        warranty: editingRepair.warranty,
        price: editingRepair.price,
        notes: editingRepair.notes,
        // Corporate fields
        is_corporate: editingRepair.is_corporate ?? false,
        corporate_mof: editingRepair.corporate_mof ?? '',
        corporate_address: editingRepair.corporate_address ?? '',
        corporate_email: editingRepair.corporate_email ?? '',
        corporate_website: editingRepair.corporate_website ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
      setActiveTab('customer');
    }
  }, [editingRepair, open]);

  const technicians = state.users.filter((u) => u.role === 'technician' || u.role === 'admin');

  const handleChange = (field: keyof RepairForm, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Upsert: when phone changes, auto-link to existing customer profile
  const handlePhoneBlur = () => {
    if (editingRepair || !form.phone.trim()) return;
    const normInput = form.phone.replace(/\D/g, '');
    if (!normInput) return;
    const match = state.repairs.find((r) => {
      const normExisting = (r.phone_norm || r.phone || '').replace(/\D/g, '');
      return normExisting === normInput || normExisting.endsWith(normInput) || normInput.endsWith(normExisting);
    });
    if (match && !form.customer_name.trim()) {
      setForm((prev) => ({
        ...prev,
        customer_name: match.customer_name,
        email: match.email || prev.email,
        address: match.address || prev.address,
        is_corporate: match.is_corporate ?? prev.is_corporate,
        corporate_mof: match.corporate_mof || prev.corporate_mof,
        corporate_address: match.corporate_address || prev.corporate_address,
        corporate_email: match.corporate_email || prev.corporate_email,
        corporate_website: match.corporate_website || prev.corporate_website,
      }));
      showToast('success', `Linked to existing customer: ${match.customer_name}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.customer_name.trim()) {
      showToast('error', 'Customer name is required');
      return;
    }

    // Upsert: normalize customer data to match existing profile by phone
    const normPhone = form.phone.replace(/\D/g, '');
    let finalForm = { ...form };
    if (!editingRepair && normPhone) {
      const existingRepair = state.repairs.find((r) => {
        const normExisting = (r.phone_norm || r.phone || '').replace(/\D/g, '');
        return normExisting === normPhone || normExisting.endsWith(normPhone) || normPhone.endsWith(normExisting);
      });
      if (existingRepair) {
        finalForm = {
          ...finalForm,
          customer_name: finalForm.customer_name || existingRepair.customer_name,
          email: finalForm.email || existingRepair.email,
          address: finalForm.address || existingRepair.address,
        };
      }
    }

    const formData = {
      ...finalForm,
      date_out: finalForm.date_out || null,
      warranty: Number(finalForm.warranty) || 0,
      price: Number(finalForm.price) || 0,
      is_corporate: Boolean(finalForm.is_corporate),
    };

    if (editingRepair) {
      service.updateRepair(editingRepair.id, formData);
      showToast('success', `Repair ${editingRepair.repair_id} updated`);
    } else {
      const repairId = service.nextRepairId();
      service.addRepair({
        repair_id: repairId,
        ...formData,
      });
      showToast('success', `Repair ${repairId} created`);
    }
    onClose();
  };

  const inputCls = "input";
  const labelCls = "label";

  const tabs: { key: FormTab; label: string; icon: React.ReactNode }[] = [
    { key: 'customer', label: 'Customer', icon: <User className="h-4 w-4" /> },
    { key: 'device', label: 'Device', icon: <Smartphone className="h-4 w-4" /> },
    { key: 'repair', label: 'Repair', icon: <Wrench className="h-4 w-4" /> },
    { key: 'corporate', label: 'Corporate', icon: <Building2 className="h-4 w-4" /> },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRepair ? `Edit Repair ${editingRepair.repair_id}` : 'New Repair Record'}
      subtitle={editingRepair ? 'Update repair details — changes will be logged to the audit trail' : 'Create a new repair record'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'corporate' && form.is_corporate && (
                <span className="ml-1 h-2 w-2 rounded-full bg-brand-500" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* Customer Tab */}
          {activeTab === 'customer' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Customer Name *</label>
                  <input className={inputCls} value={form.customer_name} onChange={(e) => handleChange('customer_name', e.target.value)} required />
                </div>
                <div>
                  <label className={labelCls}>Mode of Failure</label>
                  <input className={inputCls} value={form.mof} onChange={(e) => handleChange('mof', e.target.value)} placeholder="e.g. No Power, Screen Damage" />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} onBlur={handlePhoneBlur} placeholder="+1 (555) 123-4567" />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input className={inputCls} type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Address</label>
                  <input className={inputCls} value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Website</label>
                  <input className={inputCls} value={form.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>
          )}

          {/* Device Tab */}
          {activeTab === 'device' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Brand</label>
                  <input className={inputCls} value={form.brand} onChange={(e) => handleChange('brand', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Model</label>
                  <input className={inputCls} value={form.model} onChange={(e) => handleChange('model', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Serial Number</label>
                  <input className={inputCls} value={form.serial} onChange={(e) => handleChange('serial', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Condition</label>
                  <input className={inputCls} value={form.condition} onChange={(e) => handleChange('condition', e.target.value)} placeholder="e.g. Good, Fair, Poor" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Problem Description</label>
                  <textarea className={inputCls} rows={2} value={form.problem} onChange={(e) => handleChange('problem', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Device Notes</label>
                  <textarea className={inputCls} rows={2} value={form.device_notes} onChange={(e) => handleChange('device_notes', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Repair Tab */}
          {activeTab === 'repair' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Status</label>
                  <select className={inputCls} value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Technician</label>
                  <select className={inputCls} value={form.technician} onChange={(e) => handleChange('technician', e.target.value)}>
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.username}>{t.username} ({t.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Date In</label>
                  <input type="date" className={inputCls} value={form.date_in} onChange={(e) => handleChange('date_in', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Date Out</label>
                  <input type="date" className={inputCls} value={form.date_out} onChange={(e) => handleChange('date_out', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Warranty (months)</label>
                  <input type="number" min={0} className={inputCls} value={form.warranty} onChange={(e) => handleChange('warranty', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Price ($)</label>
                  <input type="number" min={0} step="0.01" className={inputCls} value={form.price} onChange={(e) => handleChange('price', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Technician Notes</label>
                  <textarea className={inputCls} rows={2} value={form.technician_notes} onChange={(e) => handleChange('technician_notes', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Internal Notes</label>
                  <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Corporate Tab */}
          {activeTab === 'corporate' && (
            <div className="space-y-4 animate-fade-in">
              {/* Corporate Toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_corporate}
                    onChange={(e) => handleChange('is_corporate', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-brand-600"></div>
                </label>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Corporate / B2B Client</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enable for business customers requiring MOF and corporate details</p>
                </div>
              </div>

              {/* Corporate Fields */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!form.is_corporate ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label className={labelCls}>MOF# (Ministry of Finance)</label>
                  <input
                    className={inputCls}
                    value={form.corporate_mof}
                    onChange={(e) => handleChange('corporate_mof', e.target.value)}
                    placeholder="e.g. 123456"
                    disabled={!form.is_corporate}
                  />
                </div>
                <div>
                  <label className={labelCls}>Business Email</label>
                  <input
                    className={inputCls}
                    type="email"
                    value={form.corporate_email}
                    onChange={(e) => handleChange('corporate_email', e.target.value)}
                    placeholder="billing@company.com"
                    disabled={!form.is_corporate}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Business Address</label>
                  <input
                    className={inputCls}
                    value={form.corporate_address}
                    onChange={(e) => handleChange('corporate_address', e.target.value)}
                    placeholder="Company street address, city, country"
                    disabled={!form.is_corporate}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Business Website</label>
                  <input
                    className={inputCls}
                    value={form.corporate_website}
                    onChange={(e) => handleChange('corporate_website', e.target.value)}
                    placeholder="https://company.com"
                    disabled={!form.is_corporate}
                  />
                </div>
              </div>

              {!form.is_corporate && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Enable "Corporate / B2B Client" toggle to capture business details for invoicing.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">
            {editingRepair ? 'Save Changes' : 'Create Repair'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

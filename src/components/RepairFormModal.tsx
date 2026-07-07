import { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Modal } from './Modal';
import { showToast } from './Toast';
import type { RepairRecord, RepairStatus } from '../types';

const STATUSES: RepairStatus[] = [
  'Pending',
  'In Progress',
  'Awaiting Parts',
  'Ready',
  'Completed',
  'Cancelled',
];

interface RepairFormModalProps {
  open: boolean;
  onClose: () => void;
  editingRepair: RepairRecord | null;
}

const EMPTY_FORM = {
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
  status: 'Pending' as RepairStatus,
  technician: '',
  technician_notes: '',
  warranty: 0,
  price: 0,
  notes: '',
};

export function RepairFormModal({ open, onClose, editingRepair }: RepairFormModalProps) {
  const { state, service } = useStore();
  const [form, setForm] = useState(EMPTY_FORM);

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
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingRepair, open]);

  const technicians = state.users.filter((u) => u.role === 'technician' || u.role === 'admin');

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.customer_name.trim()) {
      showToast('error', 'Customer name is required');
      return;
    }

    if (editingRepair) {
      service.updateRepair(editingRepair.id, {
        ...form,
        date_out: form.date_out || null,
        warranty: Number(form.warranty) || 0,
        price: Number(form.price) || 0,
      });
      showToast('success', `Repair ${editingRepair.repair_id} updated`);
    } else {
      const repairId = service.nextRepairId();
      service.addRepair({
        repair_id: repairId,
        ...form,
        date_out: form.date_out || null,
        warranty: Number(form.warranty) || 0,
        price: Number(form.price) || 0,
      });
      showToast('success', `Repair ${repairId} created`);
    }
    onClose();
  };

  const inputCls = "input";
  const labelCls = "label";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRepair ? `Edit Repair ${editingRepair.repair_id}` : 'New Repair Record'}
      subtitle={editingRepair ? 'Update repair details — changes will be logged to the audit trail' : 'Create a new repair record'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Customer Information</h3>
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
              <input className={inputCls} value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+1 (555) 123-4567" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input className={inputCls} value={form.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Device Information</h3>
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

        {/* Repair Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Repair Details</h3>
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">
            {editingRepair ? 'Save Changes' : 'Create Repair'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useState, useEffect } from 'react';
import { createRepair } from '../services/repairService';

const STATUSES = [
  'Received',
  'Diagnosing',
  'Waiting for Parts',
  'In Repair',
  'Testing',
  'Ready For Pickup',
  'Delivered',
  'Canceled',
];

const defaultForm = {
  customerName: '',
  mof: '',
  phone: '',
  address: '',
  email: '',
  website: '',
  brand: '',
  model: '',
  serial: '',
  condition: '',
  problem: '',
  deviceNotes: '',
  status: 'Received',
  technician: '',
  technicianNotes: '',
  warranty: '',
  price: '',
  notes: '',
  dateIn: new Date().toISOString().split('T')[0],
  dateOut: '',
  isCorporate: false,
  corporateMof: '',
  corporateAddress: '',
  corporateEmail: '',
  corporateWebsite: '',
};

export default function NewRepairDrawer({ show, onClose, onCreated, technicians }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setForm({ ...defaultForm, dateIn: new Date().toISOString().split('T')[0] });
      setError('');
    }
  }, [show]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await createRepair(form);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create repair ticket.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`offcanvas-backdrop fade${show ? ' show' : ''}`}
        style={{ display: show ? 'block' : 'none' }}
        onClick={onClose}
      />

      {/* Offcanvas drawer */}
      <div
        className={`offcanvas offcanvas-end${show ? ' show' : ''}`}
        style={{ width: '520px', visibility: show ? 'visible' : 'hidden' }}
        tabIndex="-1"
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-semibold">
            <i className="bi bi-plus-circle me-2 text-primary" />
            New Repair Ticket
          </h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>

        <div className="offcanvas-body p-0">
          <form onSubmit={handleSubmit} noValidate>
            <div className="p-3 pb-0">
              {error && (
                <div className="alert alert-danger py-2 px-3 small mb-3">
                  <i className="bi bi-exclamation-triangle-fill me-2" />
                  {error}
                </div>
              )}

              {/* ── Client Type Toggle ── */}
              <div className="mb-3">
                <div
                  className="d-flex align-items-center rounded-3 p-1 gap-1"
                  style={{ background: '#f1f3f5', width: 'fit-content' }}
                >
                  <button
                    type="button"
                    className={`btn btn-sm px-3 py-1 rounded-2 border-0 fw-medium transition-all${
                      !form.isCorporate
                        ? ' btn-primary shadow-sm'
                        : ' text-muted bg-transparent'
                    }`}
                    style={{ fontSize: '0.8125rem' }}
                    onClick={() => set('isCorporate', false)}
                  >
                    <i className="bi bi-person me-1" />
                    Individual
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm px-3 py-1 rounded-2 border-0 fw-medium transition-all${
                      form.isCorporate
                        ? ' btn-primary shadow-sm'
                        : ' text-muted bg-transparent'
                    }`}
                    style={{ fontSize: '0.8125rem' }}
                    onClick={() => set('isCorporate', true)}
                  >
                    <i className="bi bi-building me-1" />
                    Corporate / B2B
                  </button>
                </div>
              </div>
            </div>

            <div
              className="px-3 overflow-auto"
              style={{ maxHeight: 'calc(100vh - 200px)', paddingBottom: '1rem' }}
            >
              {/* ── Customer Info ── */}
              <SectionTitle icon="bi-person-lines-fill" label="Customer Information" />

              <div className="row g-2 mb-2">
                <div className="col-8">
                  <FormLabel required>Customer Name</FormLabel>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Full name"
                    value={form.customerName}
                    onChange={e => set('customerName', e.target.value)}
                    required
                  />
                </div>
                <div className="col-4">
                  <FormLabel>MOF #</FormLabel>
                  <input
                    className="form-control form-control-sm"
                    placeholder="e.g. 12345"
                    value={form.mof}
                    onChange={e => set('mof', e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <FormLabel>Phone</FormLabel>
                  <input
                    className="form-control form-control-sm"
                    type="tel"
                    placeholder="+961..."
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <FormLabel>Email</FormLabel>
                  <input
                    className="form-control form-control-sm"
                    type="email"
                    placeholder="client@email.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-2">
                <FormLabel>Address</FormLabel>
                <input
                  className="form-control form-control-sm"
                  placeholder="Street address"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                />
              </div>

              <div className="mb-3">
                <FormLabel>Website</FormLabel>
                <input
                  className="form-control form-control-sm"
                  type="url"
                  placeholder="https://"
                  value={form.website}
                  onChange={e => set('website', e.target.value)}
                />
              </div>

              {/* ── Corporate / B2B Fields ── */}
              {form.isCorporate && (
                <div
                  className="rounded-3 p-3 mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #e8f4fd 0%, #f0f8ff 100%)',
                    border: '1.5px solid #18bc9c33',
                  }}
                >
                  <div className="d-flex align-items-center mb-3">
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-2 me-2"
                      style={{
                        width: 28,
                        height: 28,
                        background: '#18bc9c',
                        color: '#fff',
                        fontSize: '0.75rem',
                      }}
                    >
                      <i className="bi bi-building-fill" />
                    </span>
                    <span className="fw-semibold text-dark" style={{ fontSize: '0.875rem' }}>
                      Corporate / B2B Details
                    </span>
                  </div>

                  <div className="row g-2 mb-2">
                    <div className="col-12">
                      <FormLabel>MOF # (Business)</FormLabel>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-white border-end-0">
                          <i className="bi bi-hash text-muted" style={{ fontSize: '0.75rem' }} />
                        </span>
                        <input
                          className="form-control border-start-0"
                          placeholder="Ministry of Finance number"
                          value={form.corporateMof}
                          onChange={e => set('corporateMof', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <FormLabel>Business Address</FormLabel>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-geo-alt text-muted" style={{ fontSize: '0.75rem' }} />
                      </span>
                      <input
                        className="form-control border-start-0"
                        placeholder="Company headquarters / billing address"
                        value={form.corporateAddress}
                        onChange={e => set('corporateAddress', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-0">
                    <div className="col-6">
                      <FormLabel>Business Email</FormLabel>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-white border-end-0">
                          <i className="bi bi-envelope text-muted" style={{ fontSize: '0.75rem' }} />
                        </span>
                        <input
                          className="form-control border-start-0"
                          type="email"
                          placeholder="accounts@company.com"
                          value={form.corporateEmail}
                          onChange={e => set('corporateEmail', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <FormLabel>Business Website</FormLabel>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-white border-end-0">
                          <i className="bi bi-globe text-muted" style={{ fontSize: '0.75rem' }} />
                        </span>
                        <input
                          className="form-control border-start-0"
                          type="url"
                          placeholder="https://company.com"
                          value={form.corporateWebsite}
                          onChange={e => set('corporateWebsite', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Device Info ── */}
              <SectionTitle icon="bi-phone" label="Device Information" />

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <FormLabel>Brand</FormLabel>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Apple, Samsung..."
                    value={form.brand}
                    onChange={e => set('brand', e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <FormLabel>Model</FormLabel>
                  <input
                    className="form-control form-control-sm"
                    placeholder="iPhone 15, Galaxy S24..."
                    value={form.model}
                    onChange={e => set('model', e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <FormLabel>Serial / IMEI</FormLabel>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Serial number"
                    value={form.serial}
                    onChange={e => set('serial', e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <FormLabel>Condition</FormLabel>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Good, cracked screen..."
                    value={form.condition}
                    onChange={e => set('condition', e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-2">
                <FormLabel>Problem Description</FormLabel>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Describe the issue..."
                  value={form.problem}
                  onChange={e => set('problem', e.target.value)}
                />
              </div>

              <div className="mb-3">
                <FormLabel>Device Notes</FormLabel>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Accessories included, cosmetic notes..."
                  value={form.deviceNotes}
                  onChange={e => set('deviceNotes', e.target.value)}
                />
              </div>

              {/* ── Repair Info ── */}
              <SectionTitle icon="bi-wrench-adjustable" label="Repair Details" />

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <FormLabel required>Status</FormLabel>
                  <select
                    className="form-select form-select-sm"
                    value={form.status}
                    onChange={e => set('status', e.target.value)}
                    required
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <FormLabel>Technician</FormLabel>
                  <select
                    className="form-select form-select-sm"
                    value={form.technician}
                    onChange={e => set('technician', e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.username}>{t.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row g-2 mb-2">
                <div className="col-4">
                  <FormLabel required>Date In</FormLabel>
                  <input
                    className="form-control form-control-sm"
                    type="date"
                    value={form.dateIn}
                    onChange={e => set('dateIn', e.target.value)}
                    required
                  />
                </div>
                <div className="col-4">
                  <FormLabel>Warranty (days)</FormLabel>
                  <input
                    className="form-control form-control-sm"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.warranty}
                    onChange={e => set('warranty', e.target.value)}
                  />
                </div>
                <div className="col-4">
                  <FormLabel>Price</FormLabel>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">$</span>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.price}
                      onChange={e => set('price', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <FormLabel>Technician Notes</FormLabel>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Internal notes for the technician..."
                  value={form.technicianNotes}
                  onChange={e => set('technicianNotes', e.target.value)}
                />
              </div>

              <div className="mb-3">
                <FormLabel>General Notes</FormLabel>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Any additional notes..."
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="border-top p-3 d-flex justify-content-end gap-2 bg-white">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-4"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-primary px-4"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving…
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2 me-1" />
                    Create Ticket
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function SectionTitle({ icon, label }) {
  return (
    <div className="d-flex align-items-center mb-2" style={{ marginTop: '0.25rem' }}>
      <i className={`bi ${icon} me-2 text-primary`} style={{ fontSize: '0.875rem' }} />
      <span className="text-uppercase fw-semibold text-muted" style={{ fontSize: '0.6875rem', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <hr className="flex-grow-1 ms-2 my-0" />
    </div>
  );
}

function FormLabel({ children, required }) {
  return (
    <label className="form-label mb-1 text-dark" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
      {children}
      {required && <span className="text-danger ms-1">*</span>}
    </label>
  );
}

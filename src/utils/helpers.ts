import type { RepairRecord, RecordLog, LogAction } from '../types';

// ============================================================
// Phone normalization — strips all non-digit characters
// ============================================================

export function normalizePhone(phone: string | null | undefined): string {
  return (phone || '').replace(/\D/g, '');
}

// ============================================================
// ID generators
// ============================================================

export function generateId(prefix = ''): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`;
}

export function generateRepairId(existing: string[] = []): string {
  const year = new Date().getFullYear();
  let max = 0;
  for (const rid of existing) {
    // New format: REP-2026-184
    const matchNew = rid.match(/^REP-\d{4}-(\d+)$/);
    if (matchNew) {
      const n = parseInt(matchNew[1], 10);
      if (n > max) max = n;
      continue;
    }
    // Legacy format: REP-0001
    const matchOld = rid.match(/^REP-(\d+)$/);
    if (matchOld) {
      const n = parseInt(matchOld[1], 10);
      if (n > max) max = n;
    }
  }
  return `REP-${year}-${max + 1}`;
}

// ============================================================
// Date helpers
// ============================================================

export function nowISO(): string {
  return new Date().toISOString();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatTimeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const parsedDate = new Date(iso);
  if (isNaN(parsedDate.getTime())) return 'never';

  const diff = Date.now() - parsedDate.getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================================
// User activity check — active if last_seen within 45 seconds
// ============================================================

export function isUserActive(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  const parsedDate = new Date(lastSeen);
  if (isNaN(parsedDate.getTime())) return false;
  
  const diff = Date.now() - parsedDate.getTime();
  return diff <= 45_000;
}

// ============================================================
// Audit logging — diff old vs new RepairRecord values
// and produce a structured change string for RecordLog
// ============================================================

const TRACKED_FIELDS: (keyof RepairRecord)[] = [
  'customer_name',
  'mof',
  'phone',
  'address',
  'email',
  'website',
  'date_in',
  'date_out',
  'brand',
  'model',
  'serial',
  'condition',
  'problem',
  'device_notes',
  'status',
  'technician',
  'technician_notes',
  'warranty',
  'price',
  'notes',
];

const FIELD_LABELS: Record<string, string> = {
  customer_name: 'Customer Name',
  mof: 'MOF',
  phone: 'Phone',
  address: 'Address',
  email: 'Email',
  website: 'Website',
  date_in: 'Date In',
  date_out: 'Date Out',
  brand: 'Brand',
  model: 'Model',
  serial: 'Serial',
  condition: 'Condition',
  problem: 'Problem',
  device_notes: 'Device Notes',
  status: 'Status',
  technician: 'Technician',
  technician_notes: 'Technician Notes',
  warranty: 'Warranty',
  price: 'Price',
  notes: 'Notes',
};

export interface FieldChange {
  field: keyof RepairRecord;
  label: string;
  oldValue: string;
  newValue: string;
}

export function diffRepairRecords(
  oldRec: RepairRecord,
  newRec: RepairRecord
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const field of TRACKED_FIELDS) {
    const oldVal = String(oldRec[field] ?? '');
    const newVal = String(newRec[field] ?? '');
    if (oldVal !== newVal) {
      changes.push({
        field,
        label: FIELD_LABELS[field] || field,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return changes;
}

export function formatChangeSummary(changes: FieldChange[]): string {
  if (!changes || changes.length === 0) return 'No field changes detected';
  return changes
    .map((c) => {
      const oldDisp = c.oldValue === '' ? '(empty)' : `'${c.oldValue}'`;
      const newDisp = c.newValue === '' ? '(empty)' : `'${c.newValue}'`;
      return `${c.label}: ${oldDisp} → ${newDisp}`;
    })
    .join('; ');
}

export function createRecordLog(
  repairId: string,
  username: string,
  action: LogAction,
  details: string
): RecordLog {
  return {
    id: generateId('log'),
    repair_id: repairId,
    username,
    timestamp: nowISO(),
    action,
    details,
  };
}

// ============================================================
// Notification template rendering
// ============================================================

export function renderTemplate(
  templateKey: string,
  repair: RepairRecord
): { title: string; body: string } {
  const templates: Record<string, { title: string; body: string }> = {
    device_ready_whatsapp: {
      title: 'Device Ready for Pickup',
      body: `Hi ${repair.customer_name}, your ${repair.brand} ${repair.model} (Repair: ${repair.repair_id}) is ready for pickup. Total: ${repair.price}. Thank you!`,
    },
    device_ready_email: {
      title: `Your ${repair.brand} ${repair.model} is ready for pickup`,
      body: `Dear ${repair.customer_name},\n\nYour device (${repair.brand} ${repair.model}, Serial: ${repair.serial}) with repair ID ${repair.repair_id} is now ready for pickup.\n\nRepair details: ${repair.problem}\nTotal cost: ${repair.price}\nWarranty: ${repair.warranty} months\n\nPlease visit us at your earliest convenience.\n\nThank you,\nCRM Pro Repair Team`,
    },
    device_ready_telegram: {
      title: 'Repair Complete',
      body: `🔔 ${repair.customer_name}, your ${repair.brand} ${repair.model} is ready! Repair ID: ${repair.repair_id}. Total: ${repair.price}. Come pick it up!`,
    },
    status_update_whatsapp: {
      title: 'Repair Status Update',
      body: `Hi ${repair.customer_name}, your repair ${repair.repair_id} status is now: ${repair.status}. We'll keep you updated.`,
    },
    status_update_email: {
      title: `Repair status update — ${repair.repair_id}`,
      body: `Dear ${repair.customer_name},\n\nThe status of your repair (${repair.repair_id}) has been updated to: ${repair.status}.\n\nWe will notify you when your device is ready for pickup.\n\nThank you,\nCRM Pro Repair Team`,
    },
  };

  return templates[templateKey] || { title: 'Notification', body: `Repair ${repair.repair_id} update.` };
}

// ============================================================
// Config-based template rendering (from settings.json templates)
// ============================================================

export function renderConfigTemplate(
  templateBody: string,
  repair: RepairRecord
): string {
  return (templateBody || '')
    .replace(/\{name\}/g, repair.customer_name || '')
    .replace(/\{repair_id\}/g, repair.repair_id || '')
    .replace(/\{status\}/g, repair.status || '');
}

// ============================================================
// Status color mapping (Case-Insensitive) — with dark mode variants
// ============================================================

export function getStatusColor(status: string): string {
  const normalizedStatus = (status || '').toLowerCase().trim();

  const map: Record<string, string> = {
    'pending': 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400',
    'in progress': 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400',
    'awaiting parts': 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-400',
    'ready': 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400',
    'completed': 'bg-gray-100 dark:bg-slate-800/60 text-gray-700 dark:text-slate-400',
    'cancelled': 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400',
  };

  return map[normalizedStatus] || 'bg-gray-100 dark:bg-slate-800/60 text-gray-700 dark:text-slate-400';
}

export function getStatusDotColor(status: string): string {
  const normalizedStatus = (status || '').toLowerCase().trim();

  const map: Record<string, string> = {
    'pending': 'bg-amber-500',
    'in progress': 'bg-blue-500',
    'awaiting parts': 'bg-purple-500',
    'ready': 'bg-emerald-500',
    'completed': 'bg-gray-400',
    'cancelled': 'bg-red-500',
  };

  return map[normalizedStatus] || 'bg-gray-400';
}
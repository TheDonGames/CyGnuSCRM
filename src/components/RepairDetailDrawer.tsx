import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Globe,
  Calendar,
  Wrench,
  Shield,
  FileText,
  ScrollText,
  Pencil,
  Printer,
  ScanLine,
  ClipboardCheck,
  Receipt,
  Building2,
} from 'lucide-react';
import type { RepairRecord } from '../types';
import { getStatusColor, getStatusDotColor, formatDate, formatDateTime } from '../utils/helpers';
import type { PreviewType } from './DocumentPreviewModal';

interface RepairDetailDrawerProps {
  repair: RepairRecord | null;
  open: boolean;
  onClose: () => void;
  onEdit: (repair: RepairRecord) => void;
  onPrint: (type: PreviewType, repair: RepairRecord) => void;
}

export function RepairDetailDrawer({ repair, open, onClose, onEdit, onPrint }: RepairDetailDrawerProps) {
  const { state } = useStore();
  const [printMenuOpen, setPrintMenuOpen] = useState(false);

  const logs = repair
    ? state.logs
        .filter((l) => l.repair_id === repair.repair_id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  if (!repair) return null;

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) => (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="text-gray-400 dark:text-gray-500 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 dark:text-gray-100 break-words">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-xl bg-white dark:bg-[#131b2e] shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#131b2e] border-b border-gray-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{repair.repair_id}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{repair.brand} {repair.model}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Print Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setPrintMenuOpen(!printMenuOpen)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print Document
                </button>
                {printMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-lg z-50 overflow-hidden py-1">
                    {[
                      { key: 'barcode' as PreviewType, icon: ScanLine, label: 'Print Label' },
                      { key: 'deposit' as PreviewType, icon: ClipboardCheck, label: 'Deposit Receipt' },
                      { key: 'standard' as PreviewType, icon: Receipt, label: 'Standard Receipt' },
                      { key: 'corporate' as PreviewType, icon: Building2, label: 'Corporate Receipt' },
                      { key: 'invoice' as PreviewType, icon: FileText, label: 'Final Invoice' },
                    ].map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => {
                          onPrint(key, repair);
                          setPrintMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-brand-700 dark:hover:text-brand-400 transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="h-[calc(100vh-72px)] overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {/* Status banner */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#0b0f19] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`badge ${getStatusColor(repair.status)} text-sm px-3 py-1`}>
                  <span className={`h-2 w-2 rounded-full ${getStatusDotColor(repair.status)}`} />
                  {repair.status}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {repair.technician ? `Assigned to ${repair.technician}` : 'Unassigned'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 dark:text-gray-500">Total Price</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">${repair.price.toFixed(2)}</p>
              </div>
            </div>

            {/* Client Info Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Client Information
              </h3>
              <div className="rounded-lg border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#0b0f19] px-3 py-1">
                <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Name" value={repair.customer_name} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={repair.phone} />
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={repair.email} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={repair.address} />
                <InfoRow icon={<Globe className="h-4 w-4" />} label="Website" value={repair.website} />
                <InfoRow icon={<FileText className="h-4 w-4" />} label="Mode of Failure" value={repair.mof} />
              </div>
            </div>

            {/* Device Details Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Device Details
              </h3>
              <div className="rounded-lg border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#0b0f19] px-3 py-1">
                <InfoRow icon={<Wrench className="h-4 w-4" />} label="Brand / Model" value={`${repair.brand} ${repair.model}`} />
                <InfoRow icon={<Shield className="h-4 w-4" />} label="Serial / IMEI" value={repair.serial} />
                <InfoRow icon={<FileText className="h-4 w-4" />} label="Condition" value={repair.condition} />
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date In" value={formatDate(repair.date_in)} />
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date Out" value={formatDate(repair.date_out)} />
                <InfoRow icon={<Shield className="h-4 w-4" />} label="Warranty" value={`${repair.warranty} months`} />
              </div>
            </div>

            {/* Problem Logs Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Problem Description</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 rounded-lg bg-gray-50 dark:bg-[#0b0f19] border border-gray-100 dark:border-slate-800 p-3">{repair.problem || '—'}</p>
            </div>

            {/* Device Notes */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Device Notes</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 rounded-lg bg-gray-50 dark:bg-[#0b0f19] border border-gray-100 dark:border-slate-800 p-3">{repair.device_notes || '—'}</p>
            </div>

            {/* Technician Notes */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Technician Notes</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 rounded-lg bg-gray-50 dark:bg-[#0b0f19] border border-gray-100 dark:border-slate-800 p-3">{repair.technician_notes || '—'}</p>
            </div>

            {/* Internal Notes */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Internal Notes</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 rounded-lg bg-gray-50 dark:bg-[#0b0f19] border border-gray-100 dark:border-slate-800 p-3">{repair.notes || '—'}</p>
            </div>

            {/* Audit Trail Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Audit Trail
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">({logs.length} entries)</span>
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic px-3 py-2">No audit entries</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#0b0f19] px-3 py-2">
                      <span className={`badge text-xs ${
                        log.action === 'INSERT' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                        log.action === 'UPDATE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        log.action === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {log.action}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{log.details}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {log.username} · {formatDateTime(log.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={onClose}
                className="btn-secondary dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onEdit(repair);
                  onClose();
                }}
                className="btn-primary"
              >
                <Pencil className="h-4 w-4" /> Edit Repair
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

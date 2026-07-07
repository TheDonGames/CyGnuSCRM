import { useStore } from '../context/StoreContext';
import { Modal } from './Modal';
import {
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
} from 'lucide-react';
import type { RepairRecord } from '../types';
import { getStatusColor, getStatusDotColor, formatDate, formatDateTime } from '../utils/helpers';

interface RepairDetailModalProps {
  repair: RepairRecord;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function RepairDetailModal({ repair, open, onClose, onEdit }: RepairDetailModalProps) {
  const { state } = useStore();
  const logs = state.logs
    .filter((l) => l.repair_id === repair.repair_id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) => (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={repair.repair_id}
      subtitle={`${repair.customer_name} · ${repair.brand} ${repair.model}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Status banner */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`badge ${getStatusColor(repair.status)} text-sm px-3 py-1`}>
              <span className={`h-2 w-2 rounded-full ${getStatusDotColor(repair.status)}`} />
              {repair.status}
            </span>
            <span className="text-sm text-gray-500">
              {repair.technician ? `Assigned to ${repair.technician}` : 'Unassigned'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total Price</p>
            <p className="text-lg font-bold text-gray-900">${repair.price.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-gray-400" /> Customer
            </h3>
            <div className="rounded-lg border border-gray-100 px-3 py-1">
              <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Name" value={repair.customer_name} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={repair.phone} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={repair.email} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={repair.address} />
              <InfoRow icon={<Globe className="h-4 w-4" />} label="Website" value={repair.website} />
              <InfoRow icon={<FileText className="h-4 w-4" />} label="Mode of Failure" value={repair.mof} />
            </div>
          </div>

          {/* Device info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-gray-400" /> Device
            </h3>
            <div className="rounded-lg border border-gray-100 px-3 py-1">
              <InfoRow icon={<Wrench className="h-4 w-4" />} label="Brand / Model" value={`${repair.brand} ${repair.model}`} />
              <InfoRow icon={<Shield className="h-4 w-4" />} label="Serial" value={repair.serial} />
              <InfoRow icon={<FileText className="h-4 w-4" />} label="Condition" value={repair.condition} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date In" value={formatDate(repair.date_in)} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date Out" value={formatDate(repair.date_out)} />
              <InfoRow icon={<Shield className="h-4 w-4" />} label="Warranty" value={`${repair.warranty} months`} />
            </div>
          </div>
        </div>

        {/* Problem & notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Problem</h3>
            <p className="text-sm text-gray-600 rounded-lg bg-gray-50 border border-gray-100 p-3">{repair.problem || '—'}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Device Notes</h3>
            <p className="text-sm text-gray-600 rounded-lg bg-gray-50 border border-gray-100 p-3">{repair.device_notes || '—'}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Technician Notes</h3>
            <p className="text-sm text-gray-600 rounded-lg bg-gray-50 border border-gray-100 p-3">{repair.technician_notes || '—'}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Internal Notes</h3>
            <p className="text-sm text-gray-600 rounded-lg bg-gray-50 border border-gray-100 p-3">{repair.notes || '—'}</p>
          </div>
        </div>

        {/* Audit trail */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-gray-400" /> Audit Trail
            <span className="text-xs text-gray-400 font-normal">({logs.length} entries)</span>
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400 italic px-3 py-2">No audit entries</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2">
                  <span className={`badge text-xs ${
                    log.action === 'INSERT' ? 'bg-emerald-100 text-emerald-700' :
                    log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                    log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 break-words">{log.details}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.username} · {formatDateTime(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={onEdit} className="btn-primary">
            <Pencil className="h-4 w-4" /> Edit Repair
          </button>
        </div>
      </div>
    </Modal>
  );
}

import { useState, useMemo } from 'react';
import {
  Send,
  Mail,
  MessageCircle,
  Send as Telegram,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { showToast } from '../components/Toast';
import { formatTimeAgo } from '../utils/helpers';
import type { NotificationChannel, NotificationStatus } from '../types';

const channelIcons: Record<NotificationChannel, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  telegram: <Telegram className="h-4 w-4" />,
};

const channelColors: Record<NotificationChannel, string> = {
  whatsapp: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  email: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
  telegram: 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
};

const statusConfig: Record<NotificationStatus, { icon: React.ReactNode; color: string; label: string }> = {
  queued: { icon: <Clock className="h-3.5 w-3.5" />, color: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400', label: 'Queued' },
  sent: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400', label: 'Sent' },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400', label: 'Failed' },
};

export function NotificationsPage() {
  const { state, service } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  const filtered = useMemo(() => {
    return state.notifications.filter((n) => {
      const matchesSearch = !search ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.recipient.toLowerCase().includes(search.toLowerCase()) ||
        n.customer_id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
      const matchesChannel = channelFilter === 'all' || n.channel === channelFilter;
      return matchesSearch && matchesStatus && matchesChannel;
    });
  }, [state.notifications, search, statusFilter, channelFilter]);

  const stats = {
    total: state.notifications.length,
    queued: state.notifications.filter((n) => n.status === 'queued').length,
    sent: state.notifications.filter((n) => n.status === 'sent').length,
    failed: state.notifications.filter((n) => n.status === 'failed').length,
  };

  const handleSend = (id: string) => {
    service.sendNotification(id);
    showToast('info', 'Sending notification...');
  };

  const handleRetry = (id: string) => {
    service.retryNotification(id);
    showToast('info', 'Retrying notification...');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this notification?')) {
      service.deleteNotification(id);
      showToast('success', 'Notification deleted');
    }
  };

  const handleSendAllQueued = () => {
    const queued = state.notifications.filter((n) => n.status === 'queued');
    if (queued.length === 0) {
      showToast('info', 'No queued notifications to send');
      return;
    }
    queued.forEach((n, i) => {
      setTimeout(() => service.sendNotification(n.id), i * 500);
    });
    showToast('info', `Sending ${queued.length} queued notifications...`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Notification Outbox</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Manage and dispatch customer notifications</p>
        </div>
        {stats.queued > 0 && (
          <button onClick={handleSendAllQueued} className="btn-primary">
            <Send className="h-4 w-4" /> Send All Queued ({stats.queued})
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Total</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.queued}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Queued</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.sent}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Sent</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Failed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input className="input pl-10" placeholder="Search notifications..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input sm:w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <select className="input sm:w-36" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
            <option value="all">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="telegram">Telegram</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Send className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
            <p className="text-sm text-gray-400 dark:text-slate-500">No notifications found</p>
          </div>
        ) : (
          filtered.map((n) => {
            const sCfg = statusConfig[n.status];
            return (
              <div key={n.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${channelColors[n.channel].replace(/dark:[^\s]+ /g, '                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${channelColors[n.channel]}`}>')}`}>
                    {channelIcons[n.channel]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="badge text-xs capitalize ${channelColors[n.channel]}">{n.channel}</span>
                      <span className={`badge text-xs ${sCfg.color}`}>
                        {sCfg.icon} {sCfg.label}
                      </span>
                      <span className="font-mono text-xs text-brand-600 dark:text-brand-400">{n.customer_id}</span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">· by {n.created_by}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{n.title}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-slate-500">
                      <span>To: {n.recipient}</span>
                      <span>·</span>
                      <span>{formatTimeAgo(n.created_at)}</span>
                      {n.attempts > 0 && (
                        <>
                          <span>·</span>
                          <span>Attempts: {n.attempts}</span>
                        </>
                      )}
                      {n.last_error && (
                        <>
                          <span>·</span>
                          <span className="text-red-500">Error: {n.last_error}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {n.status === 'queued' && (
                      <button onClick={() => handleSend(n.id)} className="rounded-lg p-2 text-gray-400 dark:text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Send now">
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    {n.status === 'failed' && (
                      <button onClick={() => handleRetry(n.id)} className="rounded-lg p-2 text-gray-400 dark:text-slate-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400 transition-colors" title="Retry">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(n.id)} className="rounded-lg p-2 text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


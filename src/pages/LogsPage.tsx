import { useState, useMemo } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatDateTime } from '../utils/helpers';

export function LogsPage() {
  const { state } = useStore();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [repairFilter, setRepairFilter] = useState('all');

  const repairIds = useMemo(() => {
    const set = new Set(state.logs.map((l) => l.repair_id));
    return Array.from(set).sort();
  }, [state.logs]);

  const filtered = useMemo(() => {
    return state.logs
      .filter((l) => {
        const matchesSearch = !search || l.details.toLowerCase().includes(search.toLowerCase()) || l.username.toLowerCase().includes(search.toLowerCase());
        const matchesAction = actionFilter === 'all' || l.action === actionFilter;
        const matchesRepair = repairFilter === 'all' || l.repair_id === repairFilter;
        return matchesSearch && matchesAction && matchesRepair;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [state.logs, search, actionFilter, repairFilter]);

  const actionColors: Record<string, string> = {
    INSERT: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
    UPDATE: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
    DELETE: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400',
    STATUS_CHANGE: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Audit Trail</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Complete record of all changes to repair records · {filtered.length} entries</p>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input className="input pl-10" placeholder="Search by details or username..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input sm:w-40" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="all">All Actions</option>
            <option value="INSERT">Insert</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
          <select className="input sm:w-40" value={repairFilter} onChange={(e) => setRepairFilter(e.target.value)}>
            <option value="all">All Repairs</option>
            {repairIds.map((rid) => (
              <option key={rid} value={rid}>{rid}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <ScrollText className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
            <p className="text-sm text-gray-400 dark:text-slate-500">No audit entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {filtered.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <span className={`badge text-xs flex-shrink-0 ${actionColors[log.action] || 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'}`}>
                  {log.action}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-medium text-brand-600 dark:text-brand-400">{log.repair_id}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-600">·</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">{log.username}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 break-words">{log.details}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap">{formatDateTime(log.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

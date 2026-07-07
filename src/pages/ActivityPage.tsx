import { useState, useMemo } from 'react';
import { Activity, Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatDateTime, formatTimeAgo } from '../utils/helpers';

export function ActivityPage() {
  const { state } = useStore();
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  const users = useMemo(() => {
    const set = new Set(state.activities.map((a) => a.username));
    return Array.from(set);
  }, [state.activities]);

  const filtered = useMemo(() => {
    return state.activities.filter((a) => {
      const matchesSearch = !search || a.activity.toLowerCase().includes(search.toLowerCase());
      const matchesUser = userFilter === 'all' || a.username === userFilter;
      return matchesSearch && matchesUser;
    });
  }, [state.activities, search, userFilter]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Activity Log</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Real-time user activity feed · {filtered.length} entries</p>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input className="input pl-10" placeholder="Search activities..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input sm:w-48" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
            <option value="all">All Users</option>
            {users.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-5">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
            <p className="text-sm text-gray-400 dark:text-slate-500">No activities found</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-700" />

            <div className="space-y-4">
              {filtered.map((a) => (
                <div key={a.id} className="relative flex items-start gap-4 pl-0">
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#131b2e] border-2 border-brand-200 dark:border-brand-700 text-brand-600 dark:text-brand-400 font-semibold text-xs flex-shrink-0">
                    {a.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{a.username}</span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">{formatTimeAgo(a.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">{a.activity}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{formatDateTime(a.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, Wrench, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Modal } from '../components/Modal';
import { showToast } from '../components/Toast';
import { isUserActive, formatTimeAgo, formatDateTime } from '../utils/helpers';
import type { User, UserRole } from '../types';

export function UsersPage() {
  const { state, service } = useStore();
  const currentUser = service.getCurrentUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'technician' as UserRole });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const handleCreate = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', role: 'technician' });
    setModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setForm({ username: user.username, password: user.password, role: user.role });
    setModalOpen(true);
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('error', 'You cannot delete your own account');
      return;
    }
    if (confirm(`Delete user "${user.username}"?`)) {
      service.deleteUser(user.id);
      showToast('success', `User ${user.username} deleted`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      showToast('error', 'Username and password are required');
      return;
    }

    const existing = state.users.find((u) => u.username === form.username && u.id !== editingUser?.id);
    if (existing) {
      showToast('error', 'Username already exists');
      return;
    }

    if (editingUser) {
      service.updateUser(editingUser.id, form);
      showToast('success', `User ${form.username} updated`);
    } else {
      service.addUser(form.username, form.password, form.role);
      showToast('success', `User ${form.username} created`);
    }
    setModalOpen(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Users</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{state.users.length} users · {state.users.filter((u) => isUserActive(u.last_seen)).length} active now</p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.users.map((user) => {
          const active = isUserActive(user.last_seen);
          return (
            <div key={user.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full font-semibold text-sm ${
                      user.role === 'admin' ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                    }`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#131b2e] ${
                      active ? 'bg-emerald-500' : 'bg-gray-300'
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{user.username}</p>
                    <span className={`badge mt-0.5 ${
                      user.role === 'admin' ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                    }`}>
                      {user.role === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(user)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(user)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 dark:text-slate-500">Status</span>
                  <span className={`flex items-center gap-1.5 font-medium ${active ? 'text-emerald-600' : 'text-gray-400 dark:text-slate-500'}`}>
                    <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500 animate-pulse-soft' : 'bg-gray-300 dark:bg-slate-600'}`} />
                    {active ? 'Active' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 dark:text-slate-500">Last Login</span>
                  <span className="text-gray-600 dark:text-slate-400">{formatTimeAgo(user.last_login)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 dark:text-slate-500">Last Seen</span>
                  <span className="text-gray-600 dark:text-slate-400">{formatTimeAgo(user.last_seen)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 dark:text-slate-500">Password</span>
                  <button
                    onClick={() => setShowPasswords((p) => ({ ...p, [user.id]: !p[user.id] }))}
                    className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 flex items-center gap-1 font-mono text-xs"
                  >
                    {showPasswords[user.id] ? (
                      <><EyeOff className="h-3 w-3" /> {user.password}</>
                    ) : (
                      <><Eye className="h-3 w-3" /> ••••••</>
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 dark:text-slate-500">Created</span>
                  <span className="text-gray-600 dark:text-slate-400">{formatDateTime(user.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User form modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.username}` : 'Add New User'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoFocus required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              <option value="technician">Technician</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingUser ? 'Save Changes' : 'Create User'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


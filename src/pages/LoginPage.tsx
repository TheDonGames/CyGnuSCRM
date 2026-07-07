import { useState } from 'react';
import { ShieldCheck, Lock, User as UserIcon, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { showToast } from '../components/Toast';

export function LoginPage() {
  const { service } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      showToast('warning', 'Please enter both username and password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        const result = service.login(trimmedUsername, trimmedPassword);
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
        if (!result.user) {
          setError('Invalid username or password.');
          setLoading(false);
          return;
        }
        showToast('success', `Welcome, ${result.user.username} (${result.user.role})!`);
      } catch (e) {
        setError(`Database Error: ${e instanceof Error ? e.message : String(e)}`);
        setLoading(false);
      }
    }, 300);
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-brand-50/30 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">CRM Pro</h1>
          <p className="mt-1 text-sm text-gray-500">Repair Management System</p>
        </div>

        {/* Login card */}
        <div className="card p-8 animate-slide-up">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your credentials to access the dashboard</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 animate-fade-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-10"
                  placeholder="Enter username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Demo Accounts
            </p>
            <div className="space-y-1.5">
              <button
                onClick={() => fillDemo('admin', 'admin123')}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-white transition-colors"
              >
                <span className="font-medium">Admin</span>
                <span className="text-gray-400 font-mono text-xs">admin / admin123</span>
              </button>
              <button
                onClick={() => fillDemo('jsmith', 'tech123')}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-white transition-colors"
              >
                <span className="font-medium">Technician</span>
                <span className="text-gray-400 font-mono text-xs">jsmith / tech123</span>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          CRM Pro v1.0 — Data persists locally in your browser
        </p>
      </div>
    </div>
  );
}


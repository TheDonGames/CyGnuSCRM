import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

let toastIdCounter = 0;
const listeners = new Set<(toast: ToastData) => void>();

export function showToast(type: ToastType, message: string) {
  const toast: ToastData = {
    id: `toast_${++toastIdCounter}`,
    type,
    message,
  };
  listeners.forEach((l) => l(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const listener = (toast: ToastData) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-brand-500" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
  };

  const borders = {
    success: 'border-l-emerald-500',
    error: 'border-l-red-500',
    info: 'border-l-brand-500',
    warning: 'border-l-amber-500',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-lg border border-gray-200 border-l-4 ${borders[toast.type]} bg-white px-4 py-3 shadow-lg animate-slide-in-right min-w-[300px] max-w-[420px]`}
        >
          {icons[toast.type]}
          <p className="flex-1 text-sm text-gray-700">{toast.message}</p>
          <button
            onClick={() => remove(toast.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

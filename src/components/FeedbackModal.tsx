import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  Info,
  AlertTriangle,
  XCircle,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { showToast } from './Toast';

// ============================================================
// Types
// ============================================================

export type FeedbackType = 'info' | 'warning' | 'confirm' | 'error';

export interface FeedbackOptions {
  type: FeedbackType;
  title: string;
  message: string;
  details?: string; // multi-line traceback / advanced diagnostics
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface FeedbackContextValue {
  showFeedback: (options: FeedbackOptions) => void;
}

// ============================================================
// Context
// ============================================================

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}

// ============================================================
// Provider + Modal
// ============================================================

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<FeedbackOptions | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const showFeedback = useCallback((opts: FeedbackOptions) => {
    setOptions(opts);
    setShowDetails(false);
    setCopied(false);
  }, []);

  const close = useCallback(() => {
    if (options?.onCancel) options.onCancel();
    setOptions(null);
  }, [options]);

  const handleConfirm = useCallback(() => {
    if (options?.onConfirm) options.onConfirm();
    setOptions(null);
  }, [options]);

  const handleCopy = useCallback(async () => {
    if (!options) return;
    const fullText = options.details
      ? `${options.title}\n\n${options.message}\n\n--- Advanced Diagnostics / Traceback ---\n${options.details}`
      : `${options.title}\n\n${options.message}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      showToast('success', 'Error details copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Failed to copy to clipboard');
    }
  }, [options]);

  if (!options) return <FeedbackContext.Provider value={{ showFeedback }}>{children}</FeedbackContext.Provider>;

  // Icon + color config per type
  const config = {
    info: {
      icon: <Info className="h-6 w-6 text-brand-500" />,
      bg: 'bg-brand-50',
      border: 'border-brand-200',
      primaryBtn: 'bg-brand-600 hover:bg-brand-700',
    },
    warning: {
      icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      primaryBtn: 'bg-amber-600 hover:bg-amber-700',
    },
    confirm: {
      icon: <HelpCircle className="h-6 w-6 text-brand-500" />,
      bg: 'bg-brand-50',
      border: 'border-brand-200',
      primaryBtn: 'bg-brand-600 hover:bg-brand-700',
    },
    error: {
      icon: <XCircle className="h-6 w-6 text-red-500" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
      primaryBtn: 'bg-red-600 hover:bg-red-700',
    },
  }[options.type];

  const isConfirm = options.type === 'confirm';
  const isError = options.type === 'error';

  return (
    <FeedbackContext.Provider value={{ showFeedback }}>
      {children}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm animate-fade-in" onClick={close} />
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl animate-slide-up">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg} ${config.border} border`}>
                {config.icon}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{options.title}</h2>
            </div>
            <button
              onClick={close}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{options.message}</p>

            {/* Error diagnostics expandable panel */}
            {isError && options.details && (
              <div className="mt-4">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Show Advanced Diagnostics / Traceback
                </button>
                {showDetails && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-gray-900 p-3">
                    <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
                      {options.details}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Copy to clipboard (error only) */}
            {isError && (
              <button
                onClick={handleCopy}
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Error to Clipboard'}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
            {(isConfirm || options.type === 'warning') && (
              <button
                onClick={close}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                {options.cancelLabel || 'Cancel'}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${config.primaryBtn}`}
            >
              {options.confirmLabel || (isConfirm ? 'Yes' : 'OK')}
            </button>
          </div>
        </div>
      </div>
    </FeedbackContext.Provider>
  );
}

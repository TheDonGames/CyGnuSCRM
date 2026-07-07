import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import type { AppState } from '../types';
import { StateService, loadState } from '../services/stateService';
import { automationEngine } from '../services/automationEngine';
import { loadFromSupabase, syncStateToSupabase } from '../services/supabaseSync';

export type DbStatus = 'connecting' | 'connected' | 'offline';

interface StoreContextValue {
  state: AppState;
  service: StateService;
  dbStatus: DbStatus;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [service] = useState(() => new StateService(loadState()));
  const [state, setState] = useState<AppState>(service.getState());
  const [dbStatus, setDbStatus] = useState<DbStatus>('connecting');
  // Use a ref so sync callbacks always see the current status without stale closure
  const dbStatusRef = useRef<DbStatus>('connecting');
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  const updateDbStatus = useCallback((s: DbStatus) => {
    dbStatusRef.current = s;
    setDbStatus(s);
  }, []);

  // Load from Supabase on mount — replace local state if Supabase has data
  useEffect(() => {
    loadFromSupabase()
      .then((supabaseState) => {
        if (supabaseState) {
          service.mergeExternalState(supabaseState);
          updateDbStatus('connected');
        } else {
          // No Supabase data yet — try to push seed state up; mark connected on success
          syncStateToSupabase(service.getState())
            .then((ok) => updateDbStatus(ok ? 'connected' : 'offline'))
            .catch(() => updateDbStatus('offline'));
        }
      })
      .catch(() => {
        updateDbStatus('offline');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to state changes — re-render + debounced Supabase sync
  useEffect(() => {
    automationEngine.initialize(service.getState());
    const unsub = service.subscribe(() => {
      const newState = service.getState();
      setState(newState);
      automationEngine.onStateChange(newState);

      // Skip the very first subscriber call (initial load hydration)
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      // Debounce: wait 1.5 s of quiet before syncing to Supabase
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        // Read from ref — never stale
        if (dbStatusRef.current !== 'offline') {
          syncStateToSupabase(newState)
            .then((ok) => updateDbStatus(ok ? 'connected' : 'offline'))
            .catch(() => updateDbStatus('offline'));
        }
      }, 1500);
    });
    return () => {
      unsub();
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [service, updateDbStatus]);

  // Heartbeat — update last_seen every 30 seconds while logged in
  useEffect(() => {
    if (service.getCurrentUser()) {
      heartbeatRef.current = setInterval(() => {
        service.heartbeat();
      }, 30_000);
      return () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      };
    }
  }, [service, state.currentUserId]);

  return (
    <StoreContext.Provider value={{ state, service, dbStatus }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

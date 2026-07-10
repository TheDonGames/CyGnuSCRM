/**
 * supabaseSync.ts
 * Bidirectional sync between in-memory AppState and Supabase.
 *
 * Strategy:
 *  • On app startup: load all tables from Supabase and hydrate state.
 *  • On each state mutation: debounced upsert of affected slices.
 *  • Graceful fallback: if Supabase is unavailable the app continues
 *    with localStorage only.
 */
import { supabase } from './supabaseClient';
import type {
  AppState,
  User,
  RepairRecord,
  UserActivity,
  RecordLog,
  NotificationOutbox,
  AutoNotifyRule,
  InventoryItem,
  InventoryTransaction,
  Supplier,
} from '../types';

// ============================================================
// Helpers
// ============================================================

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && url !== '' && key !== '');
}

async function safeUpsert<T extends object>(
  table: string,
  rows: T[],
  onConflict = 'id'
): Promise<boolean> {
  if (!rows.length) return true;
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) {
    console.warn(`[supabaseSync] upsert ${table} failed:`, error.message);
    return false;
  }
  return true;
}

// ============================================================
// Load from Supabase
// ============================================================

export async function loadFromSupabase(): Promise<Partial<AppState> | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const [
      usersRes,
      repairsRes,
      activitiesRes,
      logsRes,
      notificationsRes,
      rulesRes,
      configRes,
      inventoryRes,
      txRes,
      suppliersRes,
    ] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('repairs').select('*').order('created_at', { ascending: false }),
      supabase.from('activities').select('*').order('timestamp', { ascending: false }).limit(500),
      supabase.from('repair_logs').select('*').order('timestamp', { ascending: false }).limit(1000),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('auto_notify_rules').select('*'),
      supabase.from('system_config').select('config_json').eq('id', 1).maybeSingle(),
      supabase.from('inventory_items').select('*').order('name'),
      supabase.from('inventory_transactions').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('suppliers').select('*').order('name'),
    ]);

    // If the tables don't exist yet, all queries will error — treat as unconfigured
    if (
      usersRes.error?.message?.includes('does not exist') ||
      repairsRes.error?.message?.includes('does not exist')
    ) {
      console.info('[supabaseSync] Tables not yet created. Run supabase/schema.sql first.');
      return null;
    }

    // No data at all — first run, let seed state populate then sync up
    const hasData =
      (usersRes.data?.length ?? 0) > 0 ||
      (repairsRes.data?.length ?? 0) > 0 ||
      (inventoryRes.data?.length ?? 0) > 0;

    if (!hasData) return null;

    const partial: Partial<AppState> = {};

    if (usersRes.data?.length) {
      partial.users = usersRes.data.map((u) => ({
        ...u,
        is_active: false, // recomputed in stateService.loadState
      })) as User[];
    }

    if (repairsRes.data?.length) {
      partial.repairs = repairsRes.data as RepairRecord[];
    }

    if (activitiesRes.data?.length) {
      partial.activities = activitiesRes.data as UserActivity[];
    }

    if (logsRes.data?.length) {
      partial.logs = logsRes.data.map((r) => ({
        id: r.id,
        repair_id: r.repair_id,
        username: r.username,
        timestamp: r.timestamp,
        action: r.action,
        details: r.details,
      })) as RecordLog[];
    }

    if (notificationsRes.data?.length) {
      partial.notifications = notificationsRes.data as NotificationOutbox[];
    }

    if (rulesRes.data?.length) {
      partial.autoNotifyRules = rulesRes.data as AutoNotifyRule[];
    }

    if (configRes.data?.config_json) {
      partial.config = configRes.data.config_json as AppState['config'];
    }

    if (inventoryRes.data?.length) {
      partial.inventory = inventoryRes.data as InventoryItem[];
    }

    if (txRes.data?.length) {
      partial.inventoryTransactions = txRes.data as InventoryTransaction[];
    }

    if (suppliersRes.data?.length) {
      partial.suppliers = suppliersRes.data as Supplier[];
    }

    return partial;
  } catch (err) {
    console.warn('[supabaseSync] loadFromSupabase error:', err);
    return null;
  }
}

// ============================================================
// Sync slices to Supabase
// ============================================================

export async function syncUsersToSupabase(users: User[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const rows = users.map(({ is_active: _ia, ...rest }) => rest); // is_active is derived
  await safeUpsert('users', rows);
}

export async function syncRepairsToSupabase(repairs: RepairRecord[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await safeUpsert('repairs', repairs);
}

export async function syncActivitiesToSupabase(activities: UserActivity[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  // Only sync the newest 200 to avoid hammering the DB on every state change
  await safeUpsert('activities', activities.slice(0, 200));
}

export async function syncLogsToSupabase(logs: RecordLog[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await safeUpsert('repair_logs', logs.slice(0, 500));
}

export async function syncNotificationsToSupabase(
  notifications: NotificationOutbox[]
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await safeUpsert('notifications', notifications.slice(0, 300));
}

export async function syncRulesToSupabase(rules: AutoNotifyRule[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await safeUpsert('auto_notify_rules', rules);
}

export async function syncConfigToSupabase(config: AppState['config']): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const { error } = await supabase
    .from('system_config')
    .upsert({ id: 1, config_json: config }, { onConflict: 'id' });
  if (error) {
    console.warn('[supabaseSync] upsert system_config failed:', error.message);
    return false;
  }
  return true;
}

export async function syncInventoryItemsToSupabase(items: InventoryItem[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await safeUpsert('inventory_items', items);
}

export async function syncInventoryTransactionsToSupabase(
  txs: InventoryTransaction[]
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await safeUpsert('inventory_transactions', txs.slice(0, 500));
}

export async function syncSuppliersToSupabase(
  suppliers: Supplier[]
): Promise<void> {
  if (!isSupabaseConfigured() || suppliers.length === 0) return;
  await safeUpsert('suppliers', suppliers);
}

// ============================================================
// Full-state sync (debounced by caller)
// Returns true when all writes succeed, false if any fail.
// ============================================================

export async function syncStateToSupabase(state: AppState): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const results = await Promise.all([
      syncUsersToSupabase(state.users),
      syncRepairsToSupabase(state.repairs),
      syncActivitiesToSupabase(state.activities),
      syncLogsToSupabase(state.logs),
      syncNotificationsToSupabase(state.notifications),
      syncRulesToSupabase(state.autoNotifyRules),
      syncConfigToSupabase(state.config),
      syncInventoryItemsToSupabase(state.inventory),
      syncInventoryTransactionsToSupabase(state.inventoryTransactions),
      syncSuppliersToSupabase(state.suppliers),
    ]);
    return results.every(Boolean);
  } catch (err) {
    console.warn('[supabaseSync] syncStateToSupabase error:', err);
    return false;
  }
}

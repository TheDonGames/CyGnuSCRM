/**
 * supabaseSync.ts
 * Bidirectional sync between in-memory AppState and Supabase.
 *
 * Strategy:
 *  - On app startup: load all tables from Supabase and hydrate state.
 *  - On each state mutation: immediate upsert of affected slice(s).
 *  - Graceful fallback: if Supabase is unavailable the app continues
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

async function safeDelete(table: string, ids: string[]): Promise<boolean> {
  if (!ids.length) return true;
  const { error } = await supabase.from(table).delete().in('id', ids);
  if (error) {
    console.warn(`[supabaseSync] delete ${table} failed:`, error.message);
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
      console.info('[supabaseSync] Tables not yet created.');
      return null;
    }

    // Build partial state from whatever Supabase has.
    // Even if empty, we return an object so the caller knows Supabase is reachable.
    const partial: Partial<AppState> = {};

    if (usersRes.data?.length) {
      partial.users = usersRes.data.map((u) => ({
        ...u,
        is_active: false,
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
// Immediate single-record sync (no debounce)
// These fire right after a mutation so the DB has the data
// before the user could refresh.
// ============================================================

export async function syncRepairImmediately(repair: RepairRecord): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  return safeUpsert('repairs', [repair]);
}

export async function deleteRepairFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  return safeDelete('repairs', [id]);
}

export async function syncUserImmediately(user: Omit<User, 'is_active'>): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  return safeUpsert('users', [user]);
}

export async function deleteUserFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  return safeDelete('users', [id]);
}

export async function syncInventoryItemImmediately(item: InventoryItem): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  return safeUpsert('inventory_items', [item]);
}

export async function deleteInventoryItemFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  return safeDelete('inventory_items', [id]);
}

export async function syncInventoryTransactionImmediately(tx: InventoryTransaction): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  return safeUpsert('inventory_transactions', [tx]);
}

export async function syncSupplierImmediately(supplier: Supplier): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  return safeUpsert('suppliers', [supplier]);
}

export async function deleteSupplierFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  return safeDelete('suppliers', [id]);
}

// ============================================================
// Batch sync slices to Supabase
// ============================================================

export async function syncUsersToSupabase(users: User[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const rows = users.map(({ is_active: _ia, ...rest }) => rest);
  return safeUpsert('users', rows);
}

export async function syncRepairsToSupabase(repairs: RepairRecord[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  return safeUpsert('repairs', repairs);
}

export async function syncActivitiesToSupabase(activities: UserActivity[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  return safeUpsert('activities', activities.slice(0, 200));
}

export async function syncLogsToSupabase(logs: RecordLog[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  return safeUpsert('repair_logs', logs.slice(0, 500));
}

export async function syncNotificationsToSupabase(
  notifications: NotificationOutbox[]
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  return safeUpsert('notifications', notifications.slice(0, 300));
}

export async function syncRulesToSupabase(rules: AutoNotifyRule[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  return safeUpsert('auto_notify_rules', rules);
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

export async function syncInventoryItemsToSupabase(items: InventoryItem[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  return safeUpsert('inventory_items', items);
}

export async function syncInventoryTransactionsToSupabase(
  txs: InventoryTransaction[]
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  return safeUpsert('inventory_transactions', txs.slice(0, 500));
}

export async function syncSuppliersToSupabase(suppliers: Supplier[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  if (suppliers.length === 0) return true;
  return safeUpsert('suppliers', suppliers);
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

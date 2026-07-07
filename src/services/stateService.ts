import type {
  AppState,
  User,
  RepairRecord,
  RecordLog,
  NotificationOutbox,
  AutoNotifyRule,
  SystemConfig,
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionType,
} from '../types';
import { createSeedState } from '../data/seed';
import {
  normalizePhone,
  generateId,
  generateRepairId,
  nowISO,
  isUserActive,
  diffRepairRecords,
  formatChangeSummary,
  createRecordLog,
} from '../utils/helpers';
import { getApiEndpoint } from '../utils/api';

const STORAGE_KEY = 'crm_pro_state_v2';

// ============================================================
// Persistence
// ============================================================

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // Recompute is_active on load (timestamps may be stale)
      parsed.users = parsed.users.map((u) => ({
        ...u,
        is_active: isUserActive(u.last_seen),
      }));
      // Back-compat: ensure inventory fields exist
      if (!parsed.inventory) parsed.inventory = [];
      if (!parsed.inventoryTransactions) parsed.inventoryTransactions = [];
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
  }
  return createSeedState();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

export function resetState(): AppState {
  localStorage.removeItem(STORAGE_KEY);
  return createSeedState();
}

// ============================================================
// State mutation operations
// ============================================================

export class StateService {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor(initial: AppState) {
    this.state = initial;
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(updater: (prev: AppState) => AppState) {
    this.state = updater(this.state);
    saveState(this.state);
    this.listeners.forEach((l) => l());
  }

  /**
   * Merge state loaded from Supabase without triggering a Supabase write-back.
   * Called once on app startup after async Supabase load.
   */
  mergeExternalState(partial: Partial<AppState>): void {
    this.state = {
      ...this.state,
      ...partial,
      // Always keep the client-side session
      currentUserId: this.state.currentUserId,
      // Recompute is_active after merge
      users: (partial.users ?? this.state.users).map((u) => ({
        ...u,
        is_active: isUserActive(u.last_seen),
      })),
    };
    saveState(this.state);
    this.listeners.forEach((l) => l());
  }

  // ---- Auth ----

  login(username: string, password: string): { user: User | null; error: string | null } {
    try {
      const user = this.state.users.find(
        (u) => u.username === username && u.password === password
      );
      if (!user) return { user: null, error: 'Invalid username or password.' };

      this.setState((prev) => ({
        ...prev,
        currentUserId: user.id,
        users: prev.users.map((u) =>
          u.id === user.id
            ? { ...u, last_login: nowISO(), last_seen: nowISO(), is_active: true }
            : u
        ),
        activities: [
          {
            id: generateId('act'),
            username: user.username,
            timestamp: nowISO(),
            activity: 'Sign In',
          },
          ...prev.activities,
        ],
      }));

      return { user: this.state.users.find((u) => u.id === user.id) || null, error: null };
    } catch (e) {
      return { user: null, error: `Database Error: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  logout(): void {
    const user = this.getCurrentUser();
    if (user) {
      this.setState((prev) => ({
        ...prev,
        currentUserId: null,
        users: prev.users.map((u) =>
          u.id === user.id ? { ...u, last_seen: nowISO(), is_active: false } : u
        ),
        activities: [
          {
            id: generateId('act'),
            username: user.username,
            timestamp: nowISO(),
            activity: 'Sign Out',
          },
          ...prev.activities,
        ],
      }));
    } else {
      this.setState((prev) => ({ ...prev, currentUserId: null }));
    }
  }

  getCurrentUser(): User | null {
    if (!this.state.currentUserId) return null;
    return this.state.users.find((u) => u.id === this.state.currentUserId) || null;
  }

  heartbeat(): void {
    const user = this.getCurrentUser();
    if (!user) return;
    this.setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === user.id ? { ...u, last_seen: nowISO(), is_active: true } : u
      ),
    }));
  }

  // ---- System Configuration ----

  updateConfig(updates: Partial<SystemConfig>): void {
    const actor = this.getCurrentUser();
    this.setState((prev) => ({
      ...prev,
      config: { ...prev.config, ...updates },
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: nowISO(),
              activity: 'Updated system configuration',
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
  }

  getConfig(): SystemConfig {
    return this.state.config;
  }

  renderTemplateByKey(templateKey: string, repair: RepairRecord): { title: string; body: string } {
    const tmpl = this.state.config.whatsapp_templates.find((t) => t.key === templateKey);
    if (!tmpl) return { title: 'Notification', body: '' };

    const body = tmpl.body
      .replace(/\{name\}/g, repair.customer_name)
      .replace(/\{repair_id\}/g, repair.repair_id)
      .replace(/\{status\}/g, repair.status);

    const label = tmpl.label;
    return { title: `CRM Pro — ${label}`, body };
  }

  // ---- Users ----

  addUser(username: string, password: string, role: 'admin' | 'technician'): User {
    const user: User = {
      id: generateId('usr'),
      username,
      password,
      role,
      last_login: null,
      last_seen: null,
      is_active: false,
      created_at: nowISO(),
    };
    const actor = this.getCurrentUser();
    this.setState((prev) => ({
      ...prev,
      users: [...prev.users, user],
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: nowISO(),
              activity: `Created new user: ${username} (${role})`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
    return user;
  }

  updateUser(id: string, updates: Partial<Pick<User, 'username' | 'password' | 'role'>>): void {
    const actor = this.getCurrentUser();
    this.setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: nowISO(),
              activity: `Updated user: ${updates.username || ''}`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
  }

  deleteUser(id: string): void {
    const actor = this.getCurrentUser();
    const target = this.state.users.find((u) => u.id === id);
    this.setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
      activities: actor && target
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: nowISO(),
              activity: `Deleted user: ${target.username}`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
  }

  // ---- Repairs ----

  addRepair(data: Omit<RepairRecord, 'id' | 'phone_norm' | 'created_at' | 'updated_at'>): RepairRecord {
    const actor = this.getCurrentUser();
    const now = nowISO();
    const repair: RepairRecord = {
      ...data,
      id: generateId('rep'),
      phone_norm: normalizePhone(data.phone),
      created_at: now,
      updated_at: now,
    };

    const log = createRecordLog(repair.repair_id, actor?.username || 'system', 'INSERT', 'Repair record created');

    this.setState((prev) => ({
      ...prev,
      repairs: [repair, ...prev.repairs],
      logs: [log, ...prev.logs],
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: now,
              activity: `Created repair ${repair.repair_id} for ${repair.customer_name}`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));

    return repair;
  }

  updateRepair(id: string, updates: Partial<RepairRecord>): void {
    const actor = this.getCurrentUser();
    const oldRec = this.state.repairs.find((r) => r.id === id);
    if (!oldRec) return;

    const now = nowISO();
    const newRec: RepairRecord = {
      ...oldRec,
      ...updates,
      phone_norm: updates.phone ? normalizePhone(updates.phone) : oldRec.phone_norm,
      updated_at: now,
    };

    const changes = diffRepairRecords(oldRec, newRec);
    const logs: RecordLog[] = [];

    if (changes.length > 0) {
      const details = formatChangeSummary(changes);
      logs.push(createRecordLog(newRec.repair_id, actor?.username || 'system', 'UPDATE', details));
    }

    // Check for status change -> trigger auto-notify rules
    const statusChange = changes.find((c) => c.field === 'status');
    const newNotifications: NotificationOutbox[] = [];

    if (statusChange) {
      const matchingRules = this.state.autoNotifyRules.filter(
        (rule) =>
          rule.enabled &&
          rule.trigger_event === 'status_change' &&
          rule.from_status === statusChange.oldValue &&
          rule.to_status === statusChange.newValue
      );

      for (const rule of matchingRules) {
        const template = this.renderTemplateByKey(rule.template_key, newRec);
        const channel: NotificationOutbox['channel'] = rule.template_key.includes('telegram')
          ? 'telegram'
          : rule.template_key.includes('email')
          ? 'email'
          : 'whatsapp';
        const recipient = channel === 'email' ? newRec.email : newRec.phone;

        newNotifications.push({
          id: generateId('ntf'),
          channel,
          recipient,
          customer_id: newRec.repair_id,
          title: template.title,
          body: template.body,
          created_by: actor?.username || 'system',
          created_at: now,
          status: 'queued',
          attempts: 0,
          last_error: null,
          sent_at: null,
        });
      }

      // Trigger WhatsApp message dispatch based on WhatsApp config status triggers
      this.dispatchWhatsAppOnStatusChange(newRec, statusChange.newValue);
    }

    this.setState((prev) => ({
      ...prev,
      repairs: prev.repairs.map((r) => (r.id === id ? newRec : r)),
      logs: [...logs, ...prev.logs],
      notifications: [...newNotifications, ...prev.notifications],
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: now,
              activity:
                statusChange
                  ? `Updated repair ${newRec.repair_id} — Status changed to ${statusChange.newValue}`
                  : `Updated repair ${newRec.repair_id}`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
  }

  /**
   * Dispatch WhatsApp message when repair status matches configured triggers.
   * Loads config from Supabase and creates log entry.
   */
  private async dispatchWhatsAppOnStatusChange(repair: RepairRecord, newStatus: string): Promise<void> {
    try {
      const { supabase } = await import('./supabaseClient');

      // Load WhatsApp config
      const { data: config, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error || !config || !config.enabled) {
        return; // WhatsApp not enabled or error loading config
      }

      // Determine template based on status
      let templateName: 'order_finished' | 'order_cancelled' | null = null;
      if (config.finish_statuses?.includes(newStatus)) {
        templateName = 'order_finished';
      } else if (config.cancel_statuses?.includes(newStatus)) {
        templateName = 'order_cancelled';
      }

      if (!templateName || !repair.phone) {
        return; // No matching template or no phone number
      }

      // Generate log ID and variables
      const logId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const variables = [
        repair.customer_name,
        repair.brand,
        repair.model,
        repair.serial || '',
        repair.repair_id,
        repair.status,
        String(repair.price),
      ];

      // Create log entry with 'queued' status
      await supabase.from('whatsapp_logs').insert({
        id: logId,
        repair_id: repair.repair_id,
        customer_name: repair.customer_name,
        phone: repair.phone,
        template_name: templateName,
        variables,
        status: 'queued',
        created_at: nowISO(),
      });

      // If live API is configured, attempt to send
      if (config.phone_number_id && config.access_token) {
        try {
          const response = await fetch(getApiEndpoint('/api/whatsapp/send'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              logId,
              phone: repair.phone,
              template: templateName,
              language: config.template_language || 'en_US',
              variables,
              config: {
                phone_number_id: config.phone_number_id,
                access_token: config.access_token,
                api_version: config.api_version || 'v22.0',
              },
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            await supabase
              .from('whatsapp_logs')
              .update({ status: 'sent', sent_at: nowISO() })
              .eq('id', logId);
          } else {
            await supabase
              .from('whatsapp_logs')
              .update({ status: 'failed', error_message: data.error || 'API error' })
              .eq('id', logId);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Network error';
          await supabase
            .from('whatsapp_logs')
            .update({ status: 'failed', error_message: message })
            .eq('id', logId);
        }
      }
    } catch (err) {
      console.warn('[stateService] dispatchWhatsAppOnStatusChange error:', err);
    }
  }

  deleteRepair(id: string): void {
    const actor = this.getCurrentUser();
    const repair = this.state.repairs.find((r) => r.id === id);
    if (!repair) return;

    const log = createRecordLog(repair.repair_id, actor?.username || 'system', 'DELETE', 'Repair record deleted');

    this.setState((prev) => ({
      ...prev,
      repairs: prev.repairs.filter((r) => r.id !== id),
      logs: [log, ...prev.logs],
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: nowISO(),
              activity: `Deleted repair ${repair.repair_id}`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
  }

  getRepairById(id: string): RepairRecord | undefined {
    return this.state.repairs.find((r) => r.id === id);
  }

  getRepairByRepairId(repairId: string): RepairRecord | undefined {
    return this.state.repairs.find((r) => r.repair_id === repairId);
  }

  nextRepairId(): string {
    return generateRepairId(this.state.repairs.map((r) => r.repair_id));
  }

  // ---- Logs ----

  getLogsForRepair(repairId: string): RecordLog[] {
    return this.state.logs
      .filter((l) => l.repair_id === repairId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ---- Notifications ----

  sendNotification(id: string): void {
    const actor = this.getCurrentUser();
    const ntf = this.state.notifications.find((n) => n.id === id);
    if (!ntf) return;

    // Simulate sending — 90% success rate
    const success = Math.random() > 0.1;
    const now = nowISO();

    this.setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id
          ? {
              ...n,
              status: success ? 'sent' : 'failed',
              attempts: n.attempts + 1,
              last_error: success ? null : 'Simulated delivery failure',
              sent_at: success ? now : null,
            }
          : n
      ),
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: now,
              activity: `${success ? 'Sent' : 'Failed to send'} ${ntf.channel} notification for ${ntf.customer_id}`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
  }

  retryNotification(id: string): void {
    this.sendNotification(id);
  }

  deleteNotification(id: string): void {
    this.setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  }

  createNotification(
    channel: NotificationOutbox['channel'],
    recipient: string,
    repairId: string,
    title: string,
    body: string
  ): void {
    const actor = this.getCurrentUser();
    const ntf: NotificationOutbox = {
      id: generateId('ntf'),
      channel,
      recipient,
      customer_id: repairId,
      title,
      body,
      created_by: actor?.username || 'system',
      created_at: nowISO(),
      status: 'queued',
      attempts: 0,
      last_error: null,
      sent_at: null,
    };
    this.setState((prev) => ({
      ...prev,
      notifications: [ntf, ...prev.notifications],
    }));
  }

  // ---- Auto-notify rules ----

  addRule(rule: Omit<AutoNotifyRule, 'id' | 'created_at'>): void {
    const newRule: AutoNotifyRule = {
      ...rule,
      id: generateId('rule'),
      created_at: nowISO(),
    };
    this.setState((prev) => ({
      ...prev,
      autoNotifyRules: [...prev.autoNotifyRules, newRule],
    }));
  }

  updateRule(id: string, updates: Partial<AutoNotifyRule>): void {
    this.setState((prev) => ({
      ...prev,
      autoNotifyRules: prev.autoNotifyRules.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  }

  toggleRule(id: string): void {
    this.setState((prev) => ({
      ...prev,
      autoNotifyRules: prev.autoNotifyRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    }));
  }

  deleteRule(id: string): void {
    this.setState((prev) => ({
      ...prev,
      autoNotifyRules: prev.autoNotifyRules.filter((r) => r.id !== id),
    }));
  }

  // ---- Inventory ----

  addInventoryItem(
    data: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
  ): InventoryItem {
    const actor = this.getCurrentUser();
    const now = nowISO();
    const item: InventoryItem = {
      ...data,
      id: generateId('inv'),
      created_at: now,
      updated_at: now,
    };
    this.setState((prev) => ({
      ...prev,
      inventory: [...prev.inventory, item].sort((a, b) => a.name.localeCompare(b.name)),
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: now,
              activity: `Added inventory item: ${item.name} (${item.sku})`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
    return item;
  }

  updateInventoryItem(id: string, updates: Partial<InventoryItem>): void {
    const actor = this.getCurrentUser();
    const now = nowISO();
    this.setState((prev) => ({
      ...prev,
      inventory: prev.inventory
        .map((item) => (item.id === id ? { ...item, ...updates, updated_at: now } : item))
        .sort((a, b) => a.name.localeCompare(b.name)),
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: now,
              activity: `Updated inventory item: ${updates.name || id}`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
  }

  deleteInventoryItem(id: string): void {
    const actor = this.getCurrentUser();
    const item = this.state.inventory.find((i) => i.id === id);
    if (!item) return;
    this.setState((prev) => ({
      ...prev,
      inventory: prev.inventory.filter((i) => i.id !== id),
      inventoryTransactions: prev.inventoryTransactions.filter((t) => t.item_id !== id),
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: nowISO(),
              activity: `Deleted inventory item: ${item.name} (${item.sku})`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
  }

  adjustStock(
    itemId: string,
    type: InventoryTransactionType,
    quantity: number,
    notes = '',
    repairId: string | null = null
  ): void {
    const actor = this.getCurrentUser();
    const item = this.state.inventory.find((i) => i.id === itemId);
    // For 'adjust' allow 0 (explicit zero-out); all other types require > 0
    if (!item) return;
    if (type !== 'adjust' && quantity <= 0) return;
    if (quantity < 0) return;

    const quantityBefore = item.quantity;
    let quantityAfter: number;
    // effectiveDelta is the quantity stored in the transaction — always the actual change
    let effectiveQty: number;

    switch (type) {
      case 'receive':
      case 'return':
        quantityAfter = quantityBefore + quantity;
        effectiveQty = quantity;
        break;
      case 'use':
        // Clamp: can't remove more than what's available
        effectiveQty = Math.min(quantity, quantityBefore);
        quantityAfter = quantityBefore - effectiveQty;
        break;
      case 'adjust':
        quantityAfter = quantity; // direct set
        effectiveQty = Math.abs(quantity - quantityBefore);
        break;
    }

    const tx: InventoryTransaction = {
      id: generateId('itx'),
      item_id: itemId,
      item_sku: item.sku,
      item_name: item.name,
      type,
      quantity: effectiveQty,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      repair_id: repairId,
      notes,
      created_by: actor?.username || 'system',
      created_at: nowISO(),
    };

    const now = nowISO();
    this.setState((prev) => ({
      ...prev,
      inventory: prev.inventory.map((i) =>
        i.id === itemId ? { ...i, quantity: quantityAfter, updated_at: now } : i
      ),
      inventoryTransactions: [tx, ...prev.inventoryTransactions],
      activities: actor
        ? [
            {
              id: generateId('act'),
              username: actor.username,
              timestamp: now,
              activity: `Stock ${type}: ${item.name} (${item.sku}) ${quantityBefore} → ${quantityAfter}`,
            },
            ...prev.activities,
          ]
        : prev.activities,
    }));
  }

  getTransactionsForItem(itemId: string): InventoryTransaction[] {
    return this.state.inventoryTransactions
      .filter((t) => t.item_id === itemId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ---- Reset ----

  resetAll(): void {
    this.state = resetState();
    saveState(this.state);
    this.listeners.forEach((l) => l());
  }
}

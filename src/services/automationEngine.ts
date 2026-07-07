import { showToast } from '../components/Toast';
import { normalizePhone } from '../utils/helpers';
import type { AppState, RepairRecord, AutoNotifyRule } from '../types';

// ============================================================
// Telemetry types
// ============================================================

export type TelemetryOutcome = 'success' | 'mismatch' | 'muted' | 'queued' | 'processing' | 'error';

export interface AutomationTelemetryEntry {
  id: string;
  timestamp: string;
  repair_id: string;
  rule_id: string;
  rule_name: string;
  trigger_event: string;
  phone: string;
  template_signature: string;
  outcome: TelemetryOutcome;
  message: string;
}

// ============================================================
// Engine — singleton background processor simulation
// ============================================================

type Listener = (entries: AutomationTelemetryEntry[]) => void;

class AutomationEngine {
  private telemetry: AutomationTelemetryEntry[] = [];
  private listeners = new Set<Listener>();
  private mutedRepairs = new Set<string>(); // repair_id strings
  private prevRepairs: RepairRecord[] = [];
  private processing = false;

  /** Subscribe to telemetry updates */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.telemetry);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = [...this.telemetry];
    this.listeners.forEach((l) => l(snapshot));
  }

  getTelemetry(): AutomationTelemetryEntry[] {
    return [...this.telemetry];
  }

  getTelemetryForRepair(repairId: string): AutomationTelemetryEntry[] {
    return this.telemetry.filter((t) => t.repair_id === repairId);
  }

  isMuted(repairId: string): boolean {
    return this.mutedRepairs.has(repairId);
  }

  setMuted(repairId: string, muted: boolean) {
    if (muted) this.mutedRepairs.add(repairId);
    else this.mutedRepairs.delete(repairId);
  }

  /**
   * Called on every state change. Detects status transitions and
   * runs the simulated multi-step background queue.
   */
  onStateChange(state: AppState) {
    if (this.processing) return;

    const statusChanges: { repair: RepairRecord; oldStatus: string; newStatus: string }[] = [];

    for (const newRec of state.repairs) {
      const oldRec = this.prevRepairs.find((r) => r.id === newRec.id);
      if (oldRec && oldRec.status !== newRec.status) {
        statusChanges.push({ repair: newRec, oldStatus: oldRec.status, newStatus: newRec.status });
      }
    }

    this.prevRepairs = state.repairs.map((r) => ({ ...r }));

    if (statusChanges.length === 0) return;

    this.processing = true;
    this.processQueue(statusChanges, state.autoNotifyRules).finally(() => {
      this.processing = false;
    });
  }

  private async processQueue(
    changes: { repair: RepairRecord; oldStatus: string; newStatus: string }[],
    rules: AutoNotifyRule[]
  ) {
    for (const change of changes) {
      const matchingRules = rules.filter(
        (rule) =>
          rule.enabled &&
          rule.trigger_event === 'status_change' &&
          (rule.from_status === '*' || rule.from_status === change.oldStatus) &&
          rule.to_status === change.newStatus
      );

      if (matchingRules.length === 0) continue;

      for (const rule of matchingRules) {
        // Step 1: Queued
        await this.delay(200);
        this.addTelemetry(change.repair, rule, 'queued', 'Queued — awaiting rule engine evaluation');

        // Step 2: Processing via Rule Engine
        await this.delay(200);
        this.addTelemetry(change.repair, rule, 'processing', 'Processing via Rule Engine');

        // Step 3: Evaluate mute flag
        await this.delay(200);
        if (this.isMuted(change.repair.repair_id)) {
          this.addTelemetry(
            change.repair,
            rule,
            'muted',
            'Condition Mismatch - Repair Automation Muted'
          );
          continue;
        }

        // Step 4: Dispatched via Meta Cloud API
        await this.delay(200);
        const phone = normalizePhone(change.repair.phone);
        this.addTelemetry(
          change.repair,
          rule,
          'success',
          `Condition Met - Dispatched Successfully to ${phone}`
        );

        // Step 5: Push to live notification toast stream
        showToast(
          'success',
          `System Engine: Executed rule "${rule.template_key}" for ${change.repair.repair_id} -> Dispatched to ${phone} via Meta Cloud API`
        );
      }
    }
  }

  private addTelemetry(
    repair: RepairRecord,
    rule: AutoNotifyRule,
    outcome: TelemetryOutcome,
    message: string
  ) {
    const entry: AutomationTelemetryEntry = {
      id: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      repair_id: repair.repair_id,
      rule_id: rule.id,
      rule_name: rule.template_key,
      trigger_event: 'status_change',
      phone: normalizePhone(repair.phone),
      template_signature: rule.template_key,
      outcome,
      message,
    };
    this.telemetry = [entry, ...this.telemetry].slice(0, 200);
    this.emit();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Seed initial repair snapshot (call on first state) */
  initialize(state: AppState) {
    if (this.prevRepairs.length === 0) {
      this.prevRepairs = state.repairs.map((r) => ({ ...r }));
    }
  }
}

// Singleton instance
export const automationEngine = new AutomationEngine();


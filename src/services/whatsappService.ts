/**
 * whatsappService.ts
 * WhatsApp Cloud API integration service.
 *
 * Handles:
 * - Configuration persistence (whatsapp_config table)
 * - Message logging (whatsapp_logs table)
 * - API calls to local Express backend (POST /api/whatsapp/test, /api/whatsapp/resend)
 */

import { supabase } from './supabaseClient';
import { getApiEndpoint } from '../utils/api';
import type { RepairRecord } from '../types';

// ============================================================
// Types
// ============================================================

export interface WhatsAppConfig {
  id: number;
  phone_number_id: string;
  access_token: string;
  api_version: string;
  template_language: string;
  enabled: boolean;
  finish_statuses: string[];
  cancel_statuses: string[];
  created_at: string;
  updated_at: string;
}

export type WhatsAppTemplateName = 'order_received' | 'order_finished' | 'order_cancelled';
export type WhatsAppLogStatus = 'queued' | 'sent' | 'failed';

export interface WhatsAppLog {
  id: string;
  repair_id: string;
  customer_name: string;
  phone: string;
  template_name: WhatsAppTemplateName;
  variables: string[];
  status: WhatsAppLogStatus;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface WhatsAppLogInsert {
  id: string;
  repair_id: string;
  customer_name: string;
  phone: string;
  template_name: WhatsAppTemplateName;
  variables: string[];
  status?: WhatsAppLogStatus;
  error_message?: string | null;
}

// ============================================================
// Configuration API
// ============================================================

/**
 * Load WhatsApp configuration from Supabase.
 * Returns default config if not found.
 */
export async function loadWhatsAppConfig(): Promise<WhatsAppConfig> {
  const { data, error } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.warn('[whatsappService] loadWhatsAppConfig error:', error.message);
    return getDefaultConfig();
  }

  if (!data) {
    return getDefaultConfig();
  }

  return data as WhatsAppConfig;
}

/**
 * Save WhatsApp configuration to Supabase.
 * Uses upsert to handle both insert and update.
 */
export async function saveWhatsAppConfig(config: Partial<WhatsAppConfig>): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('whatsapp_config')
    .upsert(
      {
        id: 1,
        ...config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.warn('[whatsappService] saveWhatsAppConfig error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Test WhatsApp API connection by calling local backend.
 */
export async function testWhatsAppConnection(config: {
  phone_number_id: string;
  access_token: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(getApiEndpoint('/api/whatsapp/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: data.success ?? true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { success: false, error: message };
  }
}

// ============================================================
// Message Log API
// ============================================================

/**
 * Load WhatsApp message logs from Supabase.
 */
export async function loadWhatsAppLogs(): Promise<WhatsAppLog[]> {
  const { data, error } = await supabase
    .from('whatsapp_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.warn('[whatsappService] loadWhatsAppLogs error:', error.message);
    return [];
  }

  return (data as WhatsAppLog[]).map((row) => ({
    ...row,
    variables: Array.isArray(row.variables) ? row.variables : JSON.parse(JSON.stringify(row.variables)),
  }));
}

/**
 * Create a new WhatsApp log entry.
 */
export async function createWhatsAppLog(entry: WhatsAppLogInsert): Promise<{ success: boolean; log?: WhatsAppLog; error?: string }> {
  const { data, error } = await supabase
    .from('whatsapp_logs')
    .insert({
      ...entry,
      status: entry.status || 'queued',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.warn('[whatsappService] createWhatsAppLog error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, log: data as WhatsAppLog };
}

/**
 * Update WhatsApp log status.
 */
export async function updateWhatsAppLogStatus(
  id: string,
  status: WhatsAppLogStatus,
  errorMessage?: string | null
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {
    status,
    error_message: errorMessage ?? null,
  };

  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('whatsapp_logs')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.warn('[whatsappService] updateWhatsAppLogStatus error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Resend a failed WhatsApp message via local backend.
 */
export async function resendWhatsAppMessage(logId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(getApiEndpoint('/api/whatsapp/resend'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const data = await response.json();

    // Update log status based on API response
    if (data.success) {
      await updateWhatsAppLogStatus(logId, 'sent');
    } else {
      await updateWhatsAppLogStatus(logId, 'failed', data.error || 'Resend failed');
    }

    return { success: data.success ?? true, error: data.error };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    // Update log status to failed
    await updateWhatsAppLogStatus(logId, 'failed', message);
    return { success: false, error: message };
  }
}

// ============================================================
// Message Dispatch
// ============================================================

/**
 * Determine which template to use based on status change.
 */
export function getTemplateForStatus(
  newStatus: string,
  config: WhatsAppConfig
): WhatsAppTemplateName | null {
  if (config.finish_statuses.includes(newStatus)) {
    return 'order_finished';
  }
  if (config.cancel_statuses.includes(newStatus)) {
    return 'order_cancelled';
  }
  return null;
}

/**
 * Generate template variables from repair record.
 * Meta-approved parameter counts:
 *  - crm_received: 3 [customer_name, repair_id, status]
 *  - crm_ready_for_pickup: 3 [customer_name, repair_id, status]
 *  - crm_cancelled: 2 [customer_name, repair_id]
 */
export function getTemplateVariables(repair: RepairRecord, templateName?: string): string[] {
  if (templateName === 'order_cancelled' || templateName === 'crm_cancelled') {
    return [repair.customer_name, repair.repair_id];
  }
  return [repair.customer_name, repair.repair_id, repair.status];
}

/**
 * Dispatch WhatsApp message when repair status changes.
 * Creates log entry and triggers API call.
 */
export async function dispatchWhatsAppMessage(
  repair: RepairRecord,
  templateName: WhatsAppTemplateName,
  config: WhatsAppConfig
): Promise<{ success: boolean; log?: WhatsAppLog; error?: string }> {
  const logId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const variables = getTemplateVariables(repair, templateName);

  // Create log entry with 'queued' status
  const createResult = await createWhatsAppLog({
    id: logId,
    repair_id: repair.repair_id,
    customer_name: repair.customer_name,
    phone: repair.phone,
    template_name: templateName,
    variables,
    status: 'queued',
  });

  if (!createResult.success) {
    return { success: false, error: createResult.error };
  }

  // If API is enabled, attempt to send
  if (config.enabled && config.phone_number_id && config.access_token) {
    try {
      const response = await fetch(getApiEndpoint('/api/whatsapp/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId,
          phone: repair.phone,
          template: templateName,
          language: config.template_language,
          variables,
          config: {
            phone_number_id: config.phone_number_id,
            access_token: config.access_token,
            api_version: config.api_version,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await updateWhatsAppLogStatus(logId, 'sent');
        return { success: true, log: { ...createResult.log!, status: 'sent' } };
      } else {
        await updateWhatsAppLogStatus(logId, 'failed', data.error || 'API error');
        return { success: false, error: data.error };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      await updateWhatsAppLogStatus(logId, 'failed', message);
      return { success: false, error: message };
    }
  }

  // API not enabled — just leave as queued (simulation mode)
  return { success: true, log: createResult.log };
}

// ============================================================
// Helpers
// ============================================================

function getDefaultConfig(): WhatsAppConfig {
  return {
    id: 1,
    phone_number_id: '',
    access_token: '',
    api_version: 'v22.0',
    template_language: 'en_US',
    enabled: false,
    finish_statuses: ['Ready For Pickup'],
    cancel_statuses: ['Canceled'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function generateWhatsAppLogId(): string {
  return `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/*
# WhatsApp Integration Tables

Creates tables for WhatsApp Cloud API integration with message tracking.

1. New Tables
- `whatsapp_config` — WhatsApp gateway configuration (single row, id=1)
  - phone_number_id: Meta Phone Number ID
  - access_token: Cloud API access token
  - api_version: Meta API version
  - template_language: Template language code (e.g., en_US)
  - enabled: Whether live API is enabled
  - finish_statuses: Statuses that trigger 'order_finished' template
  - cancel_statuses: Statuses that trigger 'order_cancelled' template
- `whatsapp_logs` — Outbound message log with delivery tracking
  - repair_id: Reference to repair ticket
  - customer_name, phone: Recipient details
  - template_name: Template used (order_received, order_finished, order_cancelled)
  - variables: JSON array of template variables
  - status: 'queued' | 'sent' | 'failed'
  - error_message: Error details on failure
  - sent_at: Timestamp when successfully sent

2. Security
- Enable RLS on all tables
- Policies scoped TO anon, authenticated (single-tenant app, no Supabase Auth)
- All tables allow full CRUD as data is intentionally shared within the app

3. Notes
- whatsapp_config is single-row (id=1) for app settings
- whatsapp_logs tracks every outbound message with status updates
- Uses text IDs for compatibility with existing app code
*/

-- WhatsApp configuration (single row, id always 1)
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  phone_number_id TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL DEFAULT '',
  api_version TEXT NOT NULL DEFAULT 'v22.0',
  template_language TEXT NOT NULL DEFAULT 'en_US',
  enabled BOOLEAN NOT NULL DEFAULT false,
  finish_statuses TEXT[] NOT NULL DEFAULT ARRAY['Completed', 'Ready']::TEXT[],
  cancel_statuses TEXT[] NOT NULL DEFAULT ARRAY['Cancelled']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_whatsapp_config" ON whatsapp_config;
CREATE POLICY "anon_select_whatsapp_config" ON whatsapp_config FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_whatsapp_config" ON whatsapp_config;
CREATE POLICY "anon_insert_whatsapp_config" ON whatsapp_config FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_whatsapp_config" ON whatsapp_config;
CREATE POLICY "anon_update_whatsapp_config" ON whatsapp_config FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- WhatsApp outbound message log
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id TEXT PRIMARY KEY,
  repair_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  template_name TEXT NOT NULL CHECK (template_name IN ('order_received', 'order_finished', 'order_cancelled')),
  variables JSONB NOT NULL DEFAULT '[]'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_whatsapp_logs" ON whatsapp_logs;
CREATE POLICY "anon_select_whatsapp_logs" ON whatsapp_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_whatsapp_logs" ON whatsapp_logs;
CREATE POLICY "anon_insert_whatsapp_logs" ON whatsapp_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_whatsapp_logs" ON whatsapp_logs;
CREATE POLICY "anon_update_whatsapp_logs" ON whatsapp_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_whatsapp_logs" ON whatsapp_logs;
CREATE POLICY "anon_delete_whatsapp_logs" ON whatsapp_logs FOR DELETE
  TO anon, authenticated USING (true);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_repair_id ON whatsapp_logs(repair_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at DESC);

-- Insert default config row
INSERT INTO whatsapp_config (id, phone_number_id, access_token, enabled)
VALUES (1, '', '', false)
ON CONFLICT (id) DO NOTHING;
/*
# WhatsApp Logs Foreign Key Constraint

Fixes orphaned log records when repairs are deleted.

1. Add Foreign Key Constraint
- whatsapp_logs.repair_id → repairs.repair_id (using repair_id, not id)
- ON DELETE CASCADE: when a repair is deleted, all related WhatsApp logs are automatically deleted

2. Template Name Update
- Add new template names to the check constraint: crm_received, crm_ready_for_pickup, crm_cancelled

Note: We use repair_id (human-readable like 'REP-0001') as the reference because
that's what whatsapp_logs stores, not the internal UUID id.
*/

-- First, drop the existing check constraint on template_name
ALTER TABLE whatsapp_logs DROP CONSTRAINT IF EXISTS whatsapp_logs_template_name_check;

-- Add new check constraint with updated template names
ALTER TABLE whatsapp_logs ADD CONSTRAINT whatsapp_logs_template_name_check
  CHECK (template_name IN ('order_received', 'order_finished', 'order_cancelled', 'crm_received', 'crm_ready_for_pickup', 'crm_cancelled'));

-- Clean up any existing orphaned logs (logs whose repair_id doesn't exist in repairs)
DELETE FROM whatsapp_logs wl
WHERE NOT EXISTS (
  SELECT 1 FROM repairs r WHERE r.repair_id = wl.repair_id
);

-- Drop any existing foreign key constraint if it exists
ALTER TABLE whatsapp_logs DROP CONSTRAINT IF EXISTS whatsapp_logs_repair_id_fkey;

-- Add foreign key constraint with CASCADE delete
-- This ensures when a repair is deleted, all related WhatsApp logs are also deleted
ALTER TABLE whatsapp_logs
  ADD CONSTRAINT whatsapp_logs_repair_id_fkey
  FOREIGN KEY (repair_id)
  REFERENCES repairs(repair_id)
  ON DELETE CASCADE;

-- Create index for the foreign key lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_repair_id_fkey ON whatsapp_logs(repair_id);
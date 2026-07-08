/* 
 # WhatsApp Config Status Alignment & Template Update

 1. Update whatsapp_config default statuses to match official templates:
   - finish_statuses: 'Ready For Pickup' (triggers crm_ready_for_pickup)
   - cancel_statuses: 'Canceled' (triggers crm_cancelled)

 2. Update existing config rows to have correct status values

 3. Ensure crm_received is in the template_name check constraint (already done in migration 003)
*/

-- Update default values for whatsapp_config
ALTER TABLE whatsapp_config 
  ALTER COLUMN finish_statuses SET DEFAULT ARRAY['Ready For Pickup']::TEXT[],
  ALTER COLUMN cancel_statuses SET DEFAULT ARRAY['Canceled']::TEXT[];

-- Update existing config rows to use correct status values
UPDATE whatsapp_config 
SET 
  finish_statuses = ARRAY['Ready For Pickup']::TEXT[],
  cancel_statuses = ARRAY['Canceled']::TEXT[],
  updated_at = NOW()
WHERE id = 1;
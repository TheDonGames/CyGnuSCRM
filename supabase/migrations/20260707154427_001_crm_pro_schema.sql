/*
# CRM Pro Database Schema

Creates all 9 tables required for the CRM Pro Repair Management System.

1. New Tables
- `users` — Application users (admin/technician roles)
- `repairs` — Repair tickets with customer and device info
- `activities` — User activity log
- `repair_logs` — Repair audit trail
- `notifications` — Notification outbox queue
- `auto_notify_rules` — Auto-notification triggers
- `system_config` — Single-row app configuration
- `inventory_items` — Spare parts stock
- `inventory_transactions` — Stock movement history

2. Security
- Enable RLS on all tables (mandatory)
- Policies scoped TO anon, authenticated (single-tenant app, no Supabase Auth)
- All tables allow full CRUD as data is intentionally shared within the app

3. Notes
- Uses text IDs for compatibility with existing app code
- Foreign key from inventory_transactions to inventory_items with CASCADE delete
- System config is single-row (id=1) for app settings
*/

-- Users table (application-level auth, not Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician')),
  last_login TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);

-- Repairs table
CREATE TABLE IF NOT EXISTS repairs (
  id TEXT PRIMARY KEY,
  repair_id TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL DEFAULT '',
  mof TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  phone_norm TEXT DEFAULT '',
  address TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  date_in TEXT NOT NULL DEFAULT '',
  date_out TEXT,
  brand TEXT DEFAULT '',
  model TEXT DEFAULT '',
  serial TEXT DEFAULT '',
  condition TEXT DEFAULT '',
  problem TEXT DEFAULT '',
  device_notes TEXT DEFAULT '',
  status TEXT NOT NULL,
  technician TEXT DEFAULT '',
  technician_notes TEXT DEFAULT '',
  warranty INTEGER DEFAULT 0,
  price NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_repairs" ON repairs;
CREATE POLICY "anon_select_repairs" ON repairs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_repairs" ON repairs;
CREATE POLICY "anon_insert_repairs" ON repairs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_repairs" ON repairs;
CREATE POLICY "anon_update_repairs" ON repairs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_repairs" ON repairs;
CREATE POLICY "anon_delete_repairs" ON repairs FOR DELETE
  TO anon, authenticated USING (true);

-- Activities table (user activity log)
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  activity TEXT NOT NULL
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activities" ON activities;
CREATE POLICY "anon_select_activities" ON activities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activities" ON activities;
CREATE POLICY "anon_insert_activities" ON activities FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activities" ON activities;
CREATE POLICY "anon_update_activities" ON activities FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activities" ON activities;
CREATE POLICY "anon_delete_activities" ON activities FOR DELETE
  TO anon, authenticated USING (true);

-- Repair logs table (audit trail)
CREATE TABLE IF NOT EXISTS repair_logs (
  id TEXT PRIMARY KEY,
  repair_id TEXT NOT NULL,
  username TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  action TEXT NOT NULL,
  details TEXT DEFAULT ''
);

ALTER TABLE repair_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_repair_logs" ON repair_logs;
CREATE POLICY "anon_select_repair_logs" ON repair_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_repair_logs" ON repair_logs;
CREATE POLICY "anon_insert_repair_logs" ON repair_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_repair_logs" ON repair_logs;
CREATE POLICY "anon_update_repair_logs" ON repair_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_repair_logs" ON repair_logs;
CREATE POLICY "anon_delete_repair_logs" ON repair_logs FOR DELETE
  TO anon, authenticated USING (true);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE
  TO anon, authenticated USING (true);

-- Auto-notify rules table
CREATE TABLE IF NOT EXISTS auto_notify_rules (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_event TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  template_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE auto_notify_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_auto_notify_rules" ON auto_notify_rules;
CREATE POLICY "anon_select_auto_notify_rules" ON auto_notify_rules FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_auto_notify_rules" ON auto_notify_rules;
CREATE POLICY "anon_insert_auto_notify_rules" ON auto_notify_rules FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_auto_notify_rules" ON auto_notify_rules;
CREATE POLICY "anon_update_auto_notify_rules" ON auto_notify_rules FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_auto_notify_rules" ON auto_notify_rules;
CREATE POLICY "anon_delete_auto_notify_rules" ON auto_notify_rules FOR DELETE
  TO anon, authenticated USING (true);

-- System config table (single row, id=1)
CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  config_json JSONB NOT NULL
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_system_config" ON system_config;
CREATE POLICY "anon_select_system_config" ON system_config FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_system_config" ON system_config;
CREATE POLICY "anon_insert_system_config" ON system_config FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_system_config" ON system_config;
CREATE POLICY "anon_update_system_config" ON system_config FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inventory_items" ON inventory_items;
CREATE POLICY "anon_select_inventory_items" ON inventory_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inventory_items" ON inventory_items;
CREATE POLICY "anon_insert_inventory_items" ON inventory_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inventory_items" ON inventory_items;
CREATE POLICY "anon_update_inventory_items" ON inventory_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inventory_items" ON inventory_items;
CREATE POLICY "anon_delete_inventory_items" ON inventory_items FOR DELETE
  TO anon, authenticated USING (true);

-- Inventory transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receive', 'use', 'adjust', 'return')),
  quantity INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  repair_id TEXT,
  notes TEXT DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inventory_transactions" ON inventory_transactions;
CREATE POLICY "anon_select_inventory_transactions" ON inventory_transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inventory_transactions" ON inventory_transactions;
CREATE POLICY "anon_insert_inventory_transactions" ON inventory_transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inventory_transactions" ON inventory_transactions;
CREATE POLICY "anon_update_inventory_transactions" ON inventory_transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inventory_transactions" ON inventory_transactions;
CREATE POLICY "anon_delete_inventory_transactions" ON inventory_transactions FOR DELETE
  TO anon, authenticated USING (true);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_repairs_repair_id ON repairs(repair_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
CREATE INDEX IF NOT EXISTS idx_repairs_customer ON repairs(customer_name);
CREATE INDEX IF NOT EXISTS idx_repair_logs_repair_id ON repair_logs(repair_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id);
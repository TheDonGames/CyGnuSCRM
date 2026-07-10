/*
# Supplier Management Module

## Summary
Creates a suppliers table for managing vendor/supplier information.

## New Tables
- `suppliers`
  - `id` (uuid, primary key) - Unique supplier identifier
  - `name` (text, not null) - Supplier business name
  - `phone` (text) - Supplier phone number
  - `email` (text) - Supplier email address
  - `website` (text) - Supplier website URL
  - `address` (text) - Supplier business address
  - `created_at` (timestamptz) - Record creation timestamp

## Security
- RLS enabled on `suppliers` table
- Anon + authenticated CRUD policies (single-tenant app, no user-scoped auth)

## Notes
1. This table is used by the frontend Supplier Management module.
2. Inventory items reference suppliers via supplier_id stored in local state.
3. The WhatsApp restock automation uses supplier phone from this table.
*/

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_suppliers" ON suppliers;
CREATE POLICY "anon_select_suppliers" ON suppliers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_suppliers" ON suppliers;
CREATE POLICY "anon_insert_suppliers" ON suppliers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_suppliers" ON suppliers;
CREATE POLICY "anon_update_suppliers" ON suppliers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_suppliers" ON suppliers;
CREATE POLICY "anon_delete_suppliers" ON suppliers FOR DELETE
  TO anon, authenticated USING (true);

-- Index for faster supplier lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

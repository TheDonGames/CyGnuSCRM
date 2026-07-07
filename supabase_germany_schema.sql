-- ============================================================
-- CRM Pro — Supabase Schema (Germany/Frankfurt Region)
-- Auto-incrementing sequence for custom Repair IDs: REP-YYYY-<id>
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- Users Table
-- ============================================================
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  username text not null unique,
  password text not null,
  role text not null check (role in ('admin', 'technician')),
  last_login timestamptz,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

alter table users enable row level security;

create policy "users_select_own" on users for select
  to authenticated using (true);

create policy "users_update_own" on users for update
  to authenticated using (auth.uid()::text = id) with check (auth.uid()::text = id);

-- ============================================================
-- Repairs Table — Auto-incrementing sequence for custom ID
-- ============================================================

-- Sequence for auto-incrementing repair counter (per-year sequential)
create sequence if not exists repair_seq_seq start 1 increment 1;

create table if not exists repairs (
  id uuid primary key default uuid_generate_v4(),
  seq_id bigint not null default nextval('repair_seq_seq'),
  repair_id text not null unique,
  customer_name text not null default '',
  company_name text default '',
  is_corporate boolean default false,
  corporate_mof text default '',
  mof text default '',
  phone text default '',
  phone_norm text default '',
  address text default '',
  email text default '',
  website text default '',
  date_in text not null default '',
  date_out text,
  brand text default '',
  model text default '',
  serial text default '',
  condition text default '',
  problem text default '',
  device_notes text default '',
  status text not null default 'Pending',
  technician text default '',
  technician_notes text default '',
  warranty integer default 0,
  price numeric default 0,
  parts_cost numeric default 0,
  labor_cost numeric default 0,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table repairs enable row level security;

create policy "repairs_select_all" on repairs for select
  to authenticated using (true);

create policy "repairs_insert_own" on repairs for insert
  to authenticated with check (true);

create policy "repairs_update_own" on repairs for update
  to authenticated using (true) with check (true);

create policy "repairs_delete_own" on repairs for delete
  to authenticated using (true);

-- Trigger to auto-generate repair_id in format REP-YYYY-<seq>
create or replace function generate_repair_id()
returns trigger as $$
begin
  if new.repair_id is null or new.repair_id = '' then
    new.repair_id := 'REP-' || extract(year from now())::text || '-' || new.seq_id::text;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_generate_repair_id
  before insert on repairs
  for each row
  execute function generate_repair_id();

-- ============================================================
-- User Activity Log
-- ============================================================
create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  username text not null,
  timestamp timestamptz not null default now(),
  activity text not null
);

alter table activities enable row level security;

create policy "activities_select_all" on activities for select
  to authenticated using (true);

create policy "activities_insert_own" on activities for insert
  to authenticated with check (true);

-- ============================================================
-- Repair Audit Logs
-- ============================================================
create table if not exists repair_logs (
  id uuid primary key default uuid_generate_v4(),
  repair_id text not null,
  username text not null,
  timestamp timestamptz not null default now(),
  action text not null,
  details text default ''
);

alter table repair_logs enable row level security;

create policy "repair_logs_select_all" on repair_logs for select
  to authenticated using (true);

create policy "repair_logs_insert_own" on repair_logs for insert
  to authenticated with check (true);

-- ============================================================
-- Notification Outbox
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  channel text not null,
  recipient text not null,
  customer_id text not null,
  title text not null,
  body text default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  status text not null default 'queued',
  attempts integer default 0,
  last_error text,
  sent_at timestamptz
);

alter table notifications enable row level security;

create policy "notifications_select_all" on notifications for select
  to authenticated using (true);

create policy "notifications_insert_own" on notifications for insert
  to authenticated with check (true);

create policy "notifications_update_own" on notifications for update
  to authenticated using (true) with check (true);

-- ============================================================
-- Auto-Notify Rules
-- ============================================================
create table if not exists auto_notify_rules (
  id uuid primary key default uuid_generate_v4(),
  enabled boolean not null default true,
  trigger_event text not null,
  from_status text not null,
  to_status text not null,
  template_key text not null,
  created_at timestamptz not null default now()
);

alter table auto_notify_rules enable row level security;

create policy "auto_notify_rules_select_all" on auto_notify_rules for select
  to authenticated using (true);

create policy "auto_notify_rules_admin" on auto_notify_rules for all
  to authenticated using (true);

-- ============================================================
-- System Configuration
-- ============================================================
create table if not exists system_config (
  id integer primary key default 1,
  config_json jsonb not null default '{}'::jsonb
);

alter table system_config enable row level security;

create policy "system_config_select_all" on system_config for select
  to authenticated using (true);

-- ============================================================
-- Inventory Items
-- ============================================================
create table if not exists inventory_items (
  id uuid primary key default uuid_generate_v4(),
  sku text not null unique,
  name text not null,
  category text not null,
  description text default '',
  quantity integer not null default 0,
  min_quantity integer not null default 0,
  unit_price numeric not null default 0,
  supplier text default '',
  location text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table inventory_items enable row level security;

create policy "inventory_select_all" on inventory_items for select
  to authenticated using (true);

create policy "inventory_insert_own" on inventory_items for insert
  to authenticated with check (true);

create policy "inventory_update_own" on inventory_items for update
  to authenticated using (true) with check (true);

-- ============================================================
-- Inventory Transactions
-- ============================================================
create table if not exists inventory_transactions (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references inventory_items(id) on delete cascade,
  item_sku text not null,
  item_name text not null,
  type text not null check (type in ('receive', 'use', 'adjust', 'return')),
  quantity integer not null,
  quantity_before integer not null,
  quantity_after integer not null,
  repair_id text,
  notes text default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table inventory_transactions enable row level security;

create policy "inv_trans_select_all" on inventory_transactions for select
  to authenticated using (true);

create policy "inv_trans_insert_own" on inventory_transactions for insert
  to authenticated with check (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index if not exists idx_repairs_repair_id on repairs(repair_id);
create index if not exists idx_repairs_status on repairs(status);
create index if not exists idx_repairs_customer on repairs(customer_name);
create index if not exists idx_repair_logs_repair_id on repair_logs(repair_id);
create index if not exists idx_notifications_status on notifications(status);
create index if not exists idx_inventory_items_sku on inventory_items(sku);
create index if not exists idx_inv_trans_item on inventory_transactions(item_id);

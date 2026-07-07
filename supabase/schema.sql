-- ============================================================
-- CRM Pro — Supabase Schema
-- Run this in your Supabase SQL Editor to create all tables.
-- ============================================================

-- Users
create table if not exists users (
  id text primary key,
  username text not null unique,
  password text not null,
  role text not null check (role in ('admin', 'technician')),
  last_login timestamptz,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);
alter table users disable row level security;

-- Repairs
create table if not exists repairs (
  id text primary key,
  repair_id text not null unique,
  customer_name text not null default '',
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
  status text not null,
  technician text default '',
  technician_notes text default '',
  warranty integer default 0,
  price numeric default 0,
  notes text default '',
  created_at timestamptz not null,
  updated_at timestamptz not null
);
alter table repairs disable row level security;

-- User activity log
create table if not exists activities (
  id text primary key,
  username text not null,
  timestamp timestamptz not null,
  activity text not null
);
alter table activities disable row level security;

-- Repair audit logs
create table if not exists repair_logs (
  id text primary key,
  repair_id text not null,
  username text not null,
  timestamp timestamptz not null,
  action text not null,
  details text default ''
);
alter table repair_logs disable row level security;

-- Notification outbox
create table if not exists notifications (
  id text primary key,
  channel text not null,
  recipient text not null,
  customer_id text not null,
  title text not null,
  body text default '',
  created_by text not null,
  created_at timestamptz not null,
  status text not null default 'queued',
  attempts integer default 0,
  last_error text,
  sent_at timestamptz
);
alter table notifications disable row level security;

-- Auto-notify rules
create table if not exists auto_notify_rules (
  id text primary key,
  enabled boolean not null default true,
  trigger_event text not null,
  from_status text not null,
  to_status text not null,
  template_key text not null,
  created_at timestamptz not null
);
alter table auto_notify_rules disable row level security;

-- System config (single row, id always 1)
create table if not exists system_config (
  id integer primary key default 1,
  config_json jsonb not null
);
alter table system_config disable row level security;

-- Inventory items (spare parts stock)
create table if not exists inventory_items (
  id text primary key,
  sku text not null unique,
  name text not null,
  category text not null,
  description text default '',
  quantity integer not null default 0,
  min_quantity integer not null default 0,
  unit_price numeric not null default 0,
  supplier text default '',
  location text default '',
  created_at timestamptz not null,
  updated_at timestamptz not null
);
alter table inventory_items disable row level security;

-- Inventory transactions (stock movement history)
create table if not exists inventory_transactions (
  id text primary key,
  item_id text not null references inventory_items(id) on delete cascade,
  item_sku text not null,
  item_name text not null,
  type text not null check (type in ('receive', 'use', 'adjust', 'return')),
  quantity integer not null,
  quantity_before integer not null,
  quantity_after integer not null,
  repair_id text,
  notes text default '',
  created_by text not null,
  created_at timestamptz not null
);
alter table inventory_transactions disable row level security;

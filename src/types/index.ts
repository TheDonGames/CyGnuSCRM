// ============================================================
// Core Data Model Interfaces — mirrors the MySQL schema spec
// ============================================================

export type UserRole = 'admin' | 'technician';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  last_login: string | null;   // ISO timestamp
  last_seen: string | null;    // ISO timestamp — heartbeat
  // is_active is derived: true when last_seen is within 45 seconds of now
  is_active: boolean;
  created_at: string;
}

export type RepairStatus =
  | 'Pending'
  | 'In Progress'
  | 'Awaiting Parts'
  | 'Ready'
  | 'Completed'
  | 'Cancelled';

export interface RepairRecord {
  id: string;
  repair_id: string;          // human-readable unique ID e.g. "REP-0001"
  customer_name: string;
  mof: string;                // mode of failure / fault category
  phone: string;
  phone_norm: string;         // digits-only normalized
  address: string;
  email: string;
  website: string;
  date_in: string;            // ISO date
  date_out: string | null;    // ISO date
  brand: string;
  model: string;
  serial: string;
  condition: string;
  problem: string;
  device_notes: string;
  status: RepairStatus;
  technician: string;
  technician_notes: string;
  warranty: number;           // months
  price: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface UserActivity {
  id: string;
  username: string;
  timestamp: string;          // ISO timestamp
  activity: string;           // human-readable description
}

export type LogAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';

export interface RecordLog {
  id: string;
  repair_id: string;
  username: string;
  timestamp: string;
  action: LogAction;
  details: string;            // e.g. "Status: 'Pending' → 'Ready'"
}

export type NotificationChannel = 'whatsapp' | 'email' | 'telegram';
export type NotificationStatus = 'queued' | 'sent' | 'failed';

export interface NotificationOutbox {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  customer_id: string;        // repair_id reference
  title: string;
  body: string;
  created_by: string;
  created_at: string;
  status: NotificationStatus;
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
}

export interface AutoNotifyRule {
  id: string;
  enabled: boolean;
  trigger_event: string;     // e.g. "status_change"
  from_status: string;       // e.g. "In Progress"
  to_status: string;         // e.g. "Ready"
  template_key: string;      // e.g. "device_ready_whatsapp"
  created_at: string;
}

// ============================================================
// Inventory & Stock
// ============================================================

export type InventoryCategory =
  | 'Screens & Displays'
  | 'Batteries'
  | 'Keyboards & Input'
  | 'Storage'
  | 'Memory'
  | 'Charging & Power'
  | 'Cooling & Fans'
  | 'Motherboards'
  | 'Cables & Connectors'
  | 'Tools & Consumables'
  | 'Other';

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  'Screens & Displays',
  'Batteries',
  'Keyboards & Input',
  'Storage',
  'Memory',
  'Charging & Power',
  'Cooling & Fans',
  'Motherboards',
  'Cables & Connectors',
  'Tools & Consumables',
  'Other',
];

export type InventoryTransactionType = 'receive' | 'use' | 'adjust' | 'return';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  description: string;
  quantity: number;
  min_quantity: number;       // low-stock threshold
  unit_price: number;
  supplier: string;
  location: string;           // shelf/bin e.g. "A-01"
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  item_sku: string;
  item_name: string;
  type: InventoryTransactionType;
  quantity: number;           // always positive; direction is determined by `type`
  quantity_before: number;
  quantity_after: number;
  repair_id: string | null;   // linked repair (relevant when type = 'use')
  notes: string;
  created_by: string;
  created_at: string;
}

// ============================================================
// System Configuration (from settings.json)
// ============================================================

export interface WhatsAppTemplateDef {
  key: string;
  label: string;
  lang: string;
  body: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  api_version: string;
  phone_number_id: string;
  access_token: string;
}

export interface EmailSettings {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  from_name: string;
}

export interface TelegramSettings {
  enabled: boolean;
  bot_token: string;
  chat_id: string;
}

export interface FlowStatuses {
  finish_statuses: string[];
  cancel_statuses: string[];
}

export interface SystemConfig {
  company_name: string;
  address: string;
  phone: string;
  mof: string;
  logo_path: string;
  theme: string;
  auto_id_prefix: string;
  whatsapp: WhatsAppSettings;
  email: EmailSettings;
  telegram: TelegramSettings;
  flow_statuses: FlowStatuses;
  whatsapp_templates: WhatsAppTemplateDef[];
}

// ============================================================
// Aggregate state shape persisted to localStorage / Supabase
// ============================================================

export interface AppState {
  config: SystemConfig;
  users: User[];
  repairs: RepairRecord[];
  activities: UserActivity[];
  logs: RecordLog[];
  notifications: NotificationOutbox[];
  autoNotifyRules: AutoNotifyRule[];
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  currentUserId: string | null;   // logged-in user (client-side only)
}

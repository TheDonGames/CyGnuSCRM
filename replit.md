# CRM Pro — Repair Management System

A React + TypeScript + Vite single-page app for managing repair jobs, devices, customers, inventory, and technicians.

## How to run

The **Start application** workflow runs `npm run dev` and serves the app on port 5000.

## Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **State / Persistence:** localStorage (synchronous) + Supabase (async, real-time sync)
- **Icons:** lucide-react
- **Backend:** Supabase (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`)

## Supabase setup

The app syncs to Supabase automatically once the database tables exist.

1. Open your [Supabase SQL Editor](https://app.supabase.com)
2. Run the contents of **`supabase/schema.sql`** — creates all 9 tables with RLS disabled
3. Restart the app — it will detect the empty tables and push the seed state up automatically
4. All subsequent changes sync within ~1.5 s (debounced)

If Supabase is unavailable the app falls back to localStorage transparently.

## Demo accounts (seed data)

| Role       | Username | Password  |
|------------|----------|-----------|
| Admin      | admin    | admin123  |
| Technician | jsmith   | tech123   |

## Modules

| Page | Status | Notes |
|------|--------|-------|
| Dashboard | ✅ Live | KPI cards, quick intake, activity |
| Repairs / Tickets | ✅ Live | Full CRUD, audit trail, auto-notify |
| Customer Profiles | ✅ Live | |
| Devices | ✅ Live | |
| Invoices Hub | ✅ Live | |
| Warranty Status | ✅ Live | |
| **Inventory / Stock** | ✅ **Live** | Parts, stock levels, adjust/receive/use/return, transaction history |
| WhatsApp Integration | ✅ Live | |
| Auto-Notify Rules | ✅ Live | |
| Outbox Log | ✅ Live | |
| Users Management | ✅ Live | Admin only |
| Central Audit Trail | ✅ Live | Admin only |
| Activity Log | ✅ Live | Admin only |
| Settings | ✅ Live | Admin only |

## Architecture notes

- `src/services/stateService.ts` — synchronous in-memory state (localStorage-backed)
- `src/services/supabaseSync.ts` — async bidirectional Supabase sync layer
- `src/context/StoreContext.tsx` — loads Supabase on mount, debounced sync (1.5 s) on mutations
- State key: `crm_pro_state_v2` in localStorage

## User preferences

- Keep existing project structure and stack unless asked to change it.
- Inventory item `adjust` type sets stock to an exact quantity (not a delta).

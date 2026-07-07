---
name: Supabase sync architecture
description: How the app syncs localStorage state to Supabase — dual-write strategy, startup flow, and table setup requirement.
---

## Rule
All state is held synchronously in memory (localStorage-backed via `StateService`). Supabase is a secondary async layer synced via `StoreContext`.

## Startup flow
1. `StoreContext` initializes from localStorage immediately (synchronous, fast)
2. Async: calls `loadFromSupabase()` — if tables have data, calls `service.mergeExternalState()`
3. If tables are empty (first run), pushes seed state up via `syncStateToSupabase()`

## Mutation sync
- Each state mutation → `service.setState()` → `saveState()` (localStorage) + subscriber fires
- Subscriber debounces 1.5 s then calls `syncStateToSupabase(state)` → returns bool
- `dbStatusRef` (ref, not state) used to avoid stale closure in the timeout callback

## Tables setup prerequisite
Tables must be created manually by running `supabase/schema.sql` in the Supabase SQL Editor before the first sync. The app detects missing tables and falls back gracefully to localStorage mode.

**Why:** createClient with anon key cannot run DDL — only the Supabase dashboard/CLI can.

## Storage key
localStorage key: `crm_pro_state_v2` (bumped from v1 to include inventory fields)

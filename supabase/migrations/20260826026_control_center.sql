-- ============================================================
-- MIGRACIÓN 026: Centro de Control Personal
-- Agrega planned_month a purchase_items para planificación mensual
-- ============================================================

-- ─── 1. planned_month en purchase_items ──────────────────────
-- Formato: 'YYYY-MM' (ej: '2026-08')
-- Indica que el usuario planifica realizar esta compra en ese mes.
-- No afecta balances ni transacciones.

alter table public.purchase_items
  add column if not exists planned_month text
    check (planned_month ~ '^\d{4}-(0[1-9]|1[0-2])$' or planned_month is null);

create index if not exists idx_purchase_items_planned_month
  on public.purchase_items(workspace_id, planned_month)
  where planned_month is not null;

-- ============================================================
-- MIGRACIÓN 029: Quick Pay sin cuenta — account_id nullable
-- Permite registrar pagos sin asociar una cuenta bancaria.
-- El saldo de cuentas solo se modifica cuando account_id es provisto.
-- Las RPC existentes ya manejan NULL via WHERE id = NULL (0 rows).
-- ============================================================

-- ─── 1. Hacer account_id nullable en tablas de pago ──────────

alter table public.transactions
  alter column account_id drop not null;

alter table public.debt_payments
  alter column account_id drop not null;

alter table public.client_payments
  alter column account_id drop not null;

alter table public.payroll_payments
  alter column account_id drop not null;

-- ─── 2. Comentario en tabla transactions ─────────────────────
comment on column public.transactions.account_id is
  'Cuenta origen/destino. NULL cuando el pago fue registrado sin cuenta (Quick Pay).';

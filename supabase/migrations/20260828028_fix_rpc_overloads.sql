-- ============================================================
-- MIGRACIÓN 028: Fix function overloading causing PGRST203
--
-- Migration 024 added p_currency parameter versions of three RPCs
-- but did NOT drop the old parameter-less versions. PostgREST
-- (PGRST203) cannot resolve which function to call when both
-- exist with overlapping signatures, breaking the Dashboard.
--
-- Fix: drop old 3/2-argument versions — the new ones have
-- p_currency DEFAULT NULL so they work identically when called
-- without that argument.
-- ============================================================

-- Drop old get_financial_summary (3 args, no currency)
drop function if exists public.get_financial_summary(uuid, date, date);

-- Drop old get_cashflow_series (2 args, no currency)
drop function if exists public.get_cashflow_series(uuid, integer);

-- Drop old get_expense_breakdown (3 args, no currency)
drop function if exists public.get_expense_breakdown(uuid, date, date);

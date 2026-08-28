-- ============================================================
-- MIGRACIÓN 003: Categorías del sistema (seed)
-- workspace_id IS NULL → disponibles para todos los workspaces
-- ============================================================

-- ─── Categorías de GASTO ─────────────────────────────────────
insert into public.categories (name, type, icon, is_system, workspace_id) values
  ('Alimentación',          'EXPENSE', '🍔', true, null),
  ('Transporte',            'EXPENSE', '🚗', true, null),
  ('Suscripciones',         'EXPENSE', '📱', true, null),
  ('Equipo / Nómina',       'EXPENSE', '👥', true, null),
  ('Publicidad',            'EXPENSE', '📢', true, null),
  ('Herramientas / Software','EXPENSE','💻', true, null),
  ('Servicios',             'EXPENSE', '🔧', true, null),
  ('Deudas / Cuotas',       'EXPENSE', '💳', true, null),
  ('Alquiler',              'EXPENSE', '🏠', true, null),
  ('Salud',                 'EXPENSE', '🏥', true, null),
  ('Educación',             'EXPENSE', '📚', true, null),
  ('Entretenimiento',       'EXPENSE', '🎬', true, null),
  ('Otros gastos',          'EXPENSE', '📦', true, null);

-- ─── Categorías de INGRESO ────────────────────────────────────
insert into public.categories (name, type, icon, is_system, workspace_id) values
  ('Clientes',              'INCOME', '🤝', true, null),
  ('Servicios prestados',   'INCOME', '💼', true, null),
  ('Ventas',                'INCOME', '🛍️', true, null),
  ('Consultoría',           'INCOME', '🎯', true, null),
  ('Transferencia recibida','INCOME', '💸', true, null),
  ('Otros ingresos',        'INCOME', '✨', true, null);

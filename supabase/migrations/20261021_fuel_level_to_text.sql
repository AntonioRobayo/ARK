-- Change fuel_level from integer to text
ALTER TABLE public.work_order
  ALTER COLUMN fuel_level TYPE text USING NULL;

-- Seed fuel_level catalog
INSERT INTO public.global_catalog (category, value, label_es, sort_order, is_active, is_system)
VALUES
  ('fuel_level', 'reserva',  'Reserva', 1, true, true),
  ('fuel_level', '1/4',      '1/4',     2, true, true),
  ('fuel_level', '2/4',      '2/4',     3, true, true),
  ('fuel_level', '3/4',      '3/4',     4, true, true),
  ('fuel_level', 'full',     'Full',    5, true, true)
ON CONFLICT (category, value) DO NOTHING;

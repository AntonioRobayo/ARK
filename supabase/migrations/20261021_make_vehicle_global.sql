-- Drop dependent policies first
DROP POLICY IF EXISTS "vehicle_tenant" ON public.vehicle;
DROP POLICY IF EXISTS "vehicle_ownership_tenant" ON public.vehicle_ownership_history;
DROP POLICY IF EXISTS "tenant_vehicle_select" ON public.vehicle;
DROP POLICY IF EXISTS "tenant_vehicle_insert" ON public.vehicle;
DROP POLICY IF EXISTS "tenant_vehicle_update" ON public.vehicle;
DROP POLICY IF EXISTS "tenant_vehicle_delete" ON public.vehicle;

-- Drop FK constraint on tenant_id
ALTER TABLE public.vehicle DROP CONSTRAINT IF EXISTS vehicle_tenant_id_fkey;

-- Drop the tenant_id column
ALTER TABLE public.vehicle DROP COLUMN IF EXISTS tenant_id;

-- Add unique index on plate (non-null plates must be globally unique)
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_plate_unique
  ON public.vehicle(UPPER(plate))
  WHERE plate IS NOT NULL AND plate != '';

-- Allow any authenticated user to read vehicles (global)
CREATE POLICY "authenticated_read_vehicle" ON public.vehicle
  FOR SELECT TO authenticated USING (true);

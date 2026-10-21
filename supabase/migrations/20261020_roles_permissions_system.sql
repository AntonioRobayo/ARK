-- Migration: Full roles & permissions system
-- Run in Supabase Dashboard → SQL Editor

-- ─── 1. Add missing user-management permissions ──────────────────────────────
INSERT INTO permission (code, module, description) VALUES
  ('users.invite',       'users', 'Invitar nuevos usuarios al taller'),
  ('users.deactivate',   'users', 'Activar / desactivar usuarios'),
  ('users.manage_roles', 'users', 'Gestionar roles y permisos de usuarios')
ON CONFLICT (code) DO NOTHING;

-- ─── 2. Add customers.manage_credit if missing ───────────────────────────────
INSERT INTO permission (code, module, description) VALUES
  ('customers.manage_credit', 'customers', 'Gestionar crédito de clientes')
ON CONFLICT (code) DO NOTHING;

-- ─── 3. Unique constraint on role(tenant_id, name) ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_tenant_id_name_key'
  ) THEN
    ALTER TABLE role ADD CONSTRAINT role_tenant_id_name_key UNIQUE (tenant_id, name);
  END IF;
END;
$$;

-- ─── 4. Function: create 6 default roles for a tenant ────────────────────────
CREATE OR REPLACE FUNCTION create_tenant_default_roles(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_owner_id        UUID;
  v_manager_id      UUID;
  v_mechanic_id     UUID;
  v_receptionist_id UUID;
  v_parts_id        UUID;
  v_accountant_id   UUID;
BEGIN
  INSERT INTO role (tenant_id, name, description, is_system)
    VALUES (p_tenant_id, 'owner', 'Dueño del taller', true)
    ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_owner_id;

  INSERT INTO role (tenant_id, name, description, is_system)
    VALUES (p_tenant_id, 'shop_manager', 'Gerente del taller', true)
    ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_manager_id;

  INSERT INTO role (tenant_id, name, description, is_system)
    VALUES (p_tenant_id, 'mechanic', 'Mecánico', true)
    ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_mechanic_id;

  INSERT INTO role (tenant_id, name, description, is_system)
    VALUES (p_tenant_id, 'receptionist', 'Recepcionista', true)
    ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_receptionist_id;

  INSERT INTO role (tenant_id, name, description, is_system)
    VALUES (p_tenant_id, 'parts_manager', 'Líder de Repuestos', true)
    ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_parts_id;

  INSERT INTO role (tenant_id, name, description, is_system)
    VALUES (p_tenant_id, 'accountant', 'Contador', true)
    ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_accountant_id;

  -- owner: all permissions
  INSERT INTO role_permission (role_id, permission_id)
    SELECT v_owner_id, id FROM permission ON CONFLICT DO NOTHING;

  -- shop_manager: all except users.manage_roles and config.manage
  INSERT INTO role_permission (role_id, permission_id)
    SELECT v_manager_id, id FROM permission
    WHERE code NOT IN ('users.manage_roles', 'config.manage')
    ON CONFLICT DO NOTHING;

  -- mechanic
  INSERT INTO role_permission (role_id, permission_id)
    SELECT v_mechanic_id, id FROM permission
    WHERE code IN ('ot.view','ot.create','ot.edit','ot.change_status',
                   'inventory.view','customers.view')
    ON CONFLICT DO NOTHING;

  -- receptionist
  INSERT INTO role_permission (role_id, permission_id)
    SELECT v_receptionist_id, id FROM permission
    WHERE code IN ('ot.view','ot.create','ot.edit','ot.change_status',
                   'customers.view','customers.create','customers.edit',
                   'billing.view','billing.receive_payment')
    ON CONFLICT DO NOTHING;

  -- parts_manager
  INSERT INTO role_permission (role_id, permission_id)
    SELECT v_parts_id, id FROM permission
    WHERE code IN ('inventory.view','inventory.view_costs','inventory.receive',
                   'inventory.approve_purchases','inventory.adjust','inventory.transfer',
                   'inventory.manage_suppliers','ot.view','ot.change_status','customers.view')
    ON CONFLICT DO NOTHING;

  -- accountant
  INSERT INTO role_permission (role_id, permission_id)
    SELECT v_accountant_id, id FROM permission
    WHERE code IN ('billing.view','billing.create_invoice','billing.receive_payment',
                   'billing.close_register','billing.approve_register_close',
                   'billing.approve_credit','billing.approve_delivery_with_balance',
                   'customers.view','customers.create','customers.edit','customers.manage_credit',
                   'reports.view','reports.export')
    ON CONFLICT DO NOTHING;
END;
$$;

-- ─── 5. Seed default roles for all existing tenants ──────────────────────────
SELECT create_tenant_default_roles(id) FROM tenants;

-- ─── 6. Backfill role_id from text role column ───────────────────────────────
UPDATE user_profile up
SET role_id = r.id
FROM role r
WHERE r.tenant_id = up.tenant_id
  AND r.name = up.role
  AND up.role_id IS NULL;

-- ─── 7. Function: user_has_permission(user_id, permission_code) ───────────────
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_perm_id  UUID;
  v_override BOOLEAN;
  v_role_has BOOLEAN;
BEGIN
  SELECT id INTO v_perm_id FROM permission WHERE code = p_code;
  IF v_perm_id IS NULL THEN RETURN false; END IF;

  -- User-level override wins (granted=true adds, granted=false removes)
  SELECT granted INTO v_override
  FROM user_permission
  WHERE user_id = p_user_id AND permission_id = v_perm_id;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- Fall back to role permissions
  SELECT EXISTS (
    SELECT 1
    FROM role_permission rp
    JOIN user_profile up ON up.role_id = rp.role_id
    WHERE up.id = p_user_id
      AND rp.permission_id = v_perm_id
  ) INTO v_role_has;

  RETURN COALESCE(v_role_has, false);
END;
$$;

-- Migration: Create quiz_categories table (tenant-scoped)

CREATE TABLE IF NOT EXISTS quiz_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  order_position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_categories_tenant ON quiz_categories(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_categories_name_tenant ON quiz_categories(name, tenant_id);

-- Seed default categories for ALL existing tenants
INSERT INTO quiz_categories (name, tenant_id, is_default, order_position)
SELECT cat.name, t.id, true, cat.pos
FROM tenants t
CROSS JOIN (VALUES
  ('General', 1),
  ('Capacitacion', 2),
  ('Evaluacion', 3),
  ('Sistemas', 4),
  ('Procesos', 5),
  ('Otro', 6)
) AS cat(name, pos)
ON CONFLICT DO NOTHING;

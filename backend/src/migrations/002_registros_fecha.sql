-- Feature 4 / prerequisito: fecha propia del movimiento, independiente de
-- `created_at` (que es la fecha de inserción). Permite datos históricos y que
-- las suscripciones generen cargos con fecha pasada.
ALTER TABLE registros
  ADD COLUMN IF NOT EXISTS fecha DATE NULL AFTER cantidad;

-- Rellena los registros existentes con la fecha de creación.
UPDATE registros SET fecha = DATE(created_at) WHERE fecha IS NULL;

-- A partir de aquí la fecha es obligatoria; el backend la fija a hoy si no llega.
ALTER TABLE registros
  MODIFY COLUMN fecha DATE NOT NULL;

CREATE INDEX idx_registros_user_fecha ON registros (user, fecha);

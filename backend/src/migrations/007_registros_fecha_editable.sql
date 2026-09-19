-- Vuelve a añadir `registros.fecha`, esta vez editable desde el front: es la
-- fecha real del gasto/ingreso (p. ej. si el domingo se cargan los gastos de
-- toda la semana, cada uno lleva su propia fecha), independiente de
-- `created_at`/`updated_at`, que siguen siendo auditoría automática de la fila.
-- El intento anterior (002/005) se revirtió en 006 por no ser editable; ahora sí.
ALTER TABLE registros
  ADD COLUMN IF NOT EXISTS fecha DATE NULL AFTER cantidad;

-- Rellena los registros existentes con su fecha de creación.
UPDATE registros SET fecha = DATE(created_at) WHERE fecha IS NULL;

ALTER TABLE registros
  MODIFY COLUMN fecha DATE NOT NULL DEFAULT (CURDATE());

CREATE INDEX idx_registros_user_fecha ON registros (user, fecha);

-- Revierte `registros.fecha`: un registro solo lleva fecha de creación y de
-- actualización, ambas automáticas. No hay fecha editable por el usuario.
-- Al quitar la columna, el índice (user, fecha) se reduce a (user), que sigue
-- cubriendo la foreign key fk_registros_user.
ALTER TABLE registros DROP COLUMN fecha;
ALTER TABLE registros RENAME INDEX idx_registros_user_fecha TO idx_registros_user;

ALTER TABLE registros
  ADD COLUMN updated_at TIMESTAMP NOT NULL
  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  AFTER created_at;

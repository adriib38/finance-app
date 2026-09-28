-- Feature 1 (plan v2): suscripciones recurrentes (pagos/ingresos mensuales
-- automáticos, p.ej. "Gimnasio 30€ el día 5").
--
-- `suscripciones`      la definición: nombre, importe, categoría, día de pago.
-- `suscripciones_cargos`  qué periodos (mes) de cada suscripción ya se han
--                         facturado. Es la pieza clave para que el motor de
--                         reconciliación (src/suscripciones/) sea idempotente:
--                         da igual que el servidor esté parado varios días o
--                         que el intervalo y el arranque se solapen, el
--                         UNIQUE (suscripcion_id, periodo) impide duplicar un
--                         cargo del mismo mes.

CREATE TABLE IF NOT EXISTS suscripciones (
  id           VARCHAR(36)   NOT NULL PRIMARY KEY,
  user         VARCHAR(36)   NOT NULL,
  nombre       VARCHAR(255)  NOT NULL,
  categoria_id VARCHAR(36)   NULL,
  tipo         ENUM('gasto','ingreso') NOT NULL DEFAULT 'gasto',
  cantidad     DECIMAL(12,2) NOT NULL,
  dia_pago     TINYINT UNSIGNED NOT NULL,          -- 1..31 (se ajusta al último día del mes si no existe, p.ej. 31 en febrero)
  fecha_inicio DATE          NOT NULL,              -- no se generan cargos de periodos anteriores a esta fecha
  fecha_fin    DATE          NULL,                  -- cancelación futura opcional; NULL = sin fin
  activa       BOOLEAN       NOT NULL DEFAULT 1,    -- pausar sin perder el histórico ni la definición
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_suscripciones_user FOREIGN KEY (user) REFERENCES users(uuid) ON DELETE CASCADE,
  CONSTRAINT fk_suscripciones_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  CONSTRAINT chk_suscripciones_dia_pago CHECK (dia_pago BETWEEN 1 AND 31),
  INDEX idx_suscripciones_user (user)
);

CREATE TABLE IF NOT EXISTS suscripciones_cargos (
  id             VARCHAR(36)  NOT NULL PRIMARY KEY,
  suscripcion_id VARCHAR(36)  NOT NULL,
  periodo        CHAR(7)      NOT NULL,             -- 'YYYY-MM' del mes facturado
  registro_id    VARCHAR(36)  NULL,                 -- registro generado; NULL si el usuario lo borró después (no se regenera)
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cargos_suscripcion FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_cargos_registro FOREIGN KEY (registro_id) REFERENCES registros(id) ON DELETE SET NULL,
  CONSTRAINT uq_cargos_suscripcion_periodo UNIQUE (suscripcion_id, periodo)
);

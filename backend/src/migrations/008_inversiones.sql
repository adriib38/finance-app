-- Feature: posiciones de activos (acciones/ETFs). Registra cada aportación
-- (compra) como una fila, igual que `registros` con los gastos/ingresos.
-- `importe` (= participaciones * precio_compra) se guarda ya calculado para
-- poder sumarlo directamente sin recalcular en cada consulta; lo fija el
-- modelo, no el cliente.
-- Por ahora solo trackea lo APORTADO: no hay valor de mercado (eso llega con
-- la futura integración de la API de cotizaciones).
CREATE TABLE IF NOT EXISTS inversiones (
  id              VARCHAR(36)   NOT NULL PRIMARY KEY,
  ticker          VARCHAR(20)   NOT NULL,
  nombre          VARCHAR(150)  NULL,
  tipo            ENUM('accion','etf') NOT NULL,
  participaciones DECIMAL(18,6) NOT NULL,
  precio_compra   DECIMAL(12,4) NOT NULL,
  importe         DECIMAL(12,2) NOT NULL,
  fecha           DATE          NOT NULL DEFAULT (CURDATE()),
  observaciones   TEXT          NULL,
  user            VARCHAR(36)   NOT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inversiones_user FOREIGN KEY (user)
    REFERENCES users(uuid) ON DELETE CASCADE
);

CREATE INDEX idx_inversiones_user_fecha ON inversiones (user, fecha);
CREATE INDEX idx_inversiones_user_ticker ON inversiones (user, ticker);

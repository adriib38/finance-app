-- Esquema completo de la base de datos `finance`.
--
-- NOTA: la fuente de verdad son las migraciones en `src/migrations/`, que se
-- aplican solas al arrancar el backend (o con `npm run migrate`). Este fichero
-- es una foto del estado resultante, útil para inicializar una BD desde cero
-- (p.ej. Docker) o para consulta rápida.
CREATE DATABASE IF NOT EXISTS finance;
USE finance;

CREATE TABLE IF NOT EXISTS users (
  uuid       VARCHAR(36)  NOT NULL PRIMARY KEY,
  username   VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Feature 6: tabla maestra de categorías (normaliza `registros.categoria`).
CREATE TABLE IF NOT EXISTS categorias (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  tipo       ENUM('gasto','ingreso') NOT NULL,
  color      VARCHAR(7)   NULL,
  activa     BOOLEAN      NOT NULL DEFAULT 1,
  orden      SMALLINT     NOT NULL DEFAULT 0,
  user       VARCHAR(36)  NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categorias_user FOREIGN KEY (user) REFERENCES users(uuid) ON DELETE CASCADE,
  CONSTRAINT uq_categorias_user_tipo_nombre UNIQUE (user, tipo, nombre)
);

CREATE TABLE IF NOT EXISTS registros (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  concepto      VARCHAR(255),
  observaciones TEXT,
  categoria     VARCHAR(100),               -- texto denormalizado (copia de categorias.nombre)
  categoria_id  VARCHAR(36)   NULL,          -- enlace a la tabla maestra
  tipo          VARCHAR(20),
  cantidad      DECIMAL(12,2) NOT NULL DEFAULT 0,
  user          VARCHAR(36)   NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_registros_user FOREIGN KEY (user) REFERENCES users(uuid) ON DELETE CASCADE,
  CONSTRAINT fk_registros_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  INDEX idx_registros_user (user)
);

-- Feature 1: suscripciones recurrentes (pagos/ingresos mensuales automáticos).
CREATE TABLE IF NOT EXISTS suscripciones (
  id           VARCHAR(36)   NOT NULL PRIMARY KEY,
  user         VARCHAR(36)   NOT NULL,
  nombre       VARCHAR(255)  NOT NULL,
  categoria_id VARCHAR(36)   NULL,
  tipo         ENUM('gasto','ingreso') NOT NULL DEFAULT 'gasto',
  cantidad     DECIMAL(12,2) NOT NULL,
  dia_pago     TINYINT UNSIGNED NOT NULL,
  fecha_inicio DATE          NOT NULL,
  fecha_fin    DATE          NULL,
  activa       BOOLEAN       NOT NULL DEFAULT 1,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_suscripciones_user FOREIGN KEY (user) REFERENCES users(uuid) ON DELETE CASCADE,
  CONSTRAINT fk_suscripciones_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  CONSTRAINT chk_suscripciones_dia_pago CHECK (dia_pago BETWEEN 1 AND 31),
  INDEX idx_suscripciones_user (user)
);

-- Qué periodos (mes) de cada suscripción ya se han facturado (ver
-- src/suscripciones/procesarSuscripciones.js).
CREATE TABLE IF NOT EXISTS suscripciones_cargos (
  id             VARCHAR(36)  NOT NULL PRIMARY KEY,
  suscripcion_id VARCHAR(36)  NOT NULL,
  periodo        CHAR(7)      NOT NULL,
  registro_id    VARCHAR(36)  NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cargos_suscripcion FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_cargos_registro FOREIGN KEY (registro_id) REFERENCES registros(id) ON DELETE SET NULL,
  CONSTRAINT uq_cargos_suscripcion_periodo UNIQUE (suscripcion_id, periodo)
);

-- Control de migraciones aplicadas.
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       VARCHAR(255) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

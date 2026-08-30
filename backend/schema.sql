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

-- Control de migraciones aplicadas.
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       VARCHAR(255) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

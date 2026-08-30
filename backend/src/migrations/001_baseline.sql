-- Estado base del esquema (users + registros). Idempotente para bases nuevas;
-- en bases ya existentes no hace nada.
CREATE TABLE IF NOT EXISTS users (
  uuid       VARCHAR(36)  NOT NULL PRIMARY KEY,
  username   VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registros (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  concepto      VARCHAR(255),
  observaciones TEXT,
  categoria     VARCHAR(100),
  tipo          VARCHAR(20),
  cantidad      DECIMAL(12,2) NOT NULL DEFAULT 0,
  user          VARCHAR(36)   NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_registros_user FOREIGN KEY (user) REFERENCES users(uuid) ON DELETE CASCADE
);

-- Feature 6: tabla maestra de categorías para normalizar los valores de
-- `registros.categoria` (evita duplicados tipo "Compra" / "compr" / "compra").
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

-- Los registros pasan a referenciar la maestra. Se mantiene `registros.categoria`
-- (texto) como copia denormalizada durante la transición.
ALTER TABLE registros
  ADD COLUMN IF NOT EXISTS categoria_id VARCHAR(36) NULL AFTER categoria;

ALTER TABLE registros
  ADD CONSTRAINT fk_registros_categoria
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL;

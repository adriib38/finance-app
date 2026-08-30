-- Da un DEFAULT a `registros.fecha` para que cualquier INSERT que no la
-- especifique (código antiguo, inserciones manuales) siga funcionando.
ALTER TABLE registros
  MODIFY COLUMN fecha DATE NOT NULL DEFAULT (CURDATE());

const { Sequelize } = require("sequelize");

require("dotenv").config();

// Instancia Sequelize para los modelos ORM (src/models/*). Usa las mismas
// credenciales que el pool mysql2 crudo de database.js (que se mantiene en
// uso por seedAdmin/migrate/procesarSuscripciones/ai, fuera del alcance de
// esta migración) — ambos apuntan a la misma base de datos.
const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    dialect: "mysql",
    pool: { max: 10, min: 0, idle: 10000 },
    logging: false,
    define: {
      timestamps: false,
      freezeTableName: true,
    },
  }
);

module.exports = sequelize;

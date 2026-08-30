const pool = require("./database");
const { v4: uuid } = require("uuid");
const { colorForIndex } = require("./utils/palette");
require("dotenv").config();

// Mismo UUID fijo que seedAdmin.
const ADMIN_UUID = "00000000-0000-0000-0000-000000000001";

// Conjunto base de categorías para que una instalación nueva tenga opciones
// sensatas desde el primer registro. Es idempotente: sólo inserta las que
// falten (la clave única user+tipo+nombre evita duplicados).
const DEFAULTS = {
  gasto: [
    "Compra",
    "Alquiler",
    "Suministros",
    "Transporte",
    "Ocio",
    "Restauración",
    "Salud",
    "Suscripciones",
    "Otros",
  ],
  ingreso: ["Nómina", "Freelance", "Inversiones", "Regalos", "Otros"],
};

async function seedCategorias() {
  const conn = pool.promise();

  let colorIdx = 0;
  for (const tipo of Object.keys(DEFAULTS)) {
    let orden = 0;
    for (const nombre of DEFAULTS[tipo]) {
      await conn.query(
        `INSERT INTO categorias (id, nombre, tipo, color, orden, user)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [uuid(), nombre, tipo, colorForIndex(colorIdx), orden, ADMIN_UUID]
      );
      orden++;
      colorIdx++;
    }
  }

  console.log("✓ Categorías base verificadas");
}

module.exports = seedCategorias;

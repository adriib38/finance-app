/**
 * Feature 6 — migración de datos.
 *
 * Crea una fila en `categorias` por cada valor distinto (user, tipo, categoria)
 * que ya exista en `registros`, normalizando el nombre (trim + colapsar espacios
 * + capitalizar), y enlaza cada registro con su `categoria_id`.
 *
 * La deduplicación fina ("Compra" vs "compr") se deja para la pantalla de
 * gestión (fusión de categorías): aquí sólo se unifican los que coinciden
 * ignorando mayúsculas y espacios de sobra.
 */
const { v4: uuid } = require("uuid");
const { colorForIndex } = require("../utils/palette");

function normalizeName(raw) {
  const clean = String(raw).trim().replace(/\s+/g, " ");
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

async function up(conn) {
  const [registros] = await conn.query(
    `SELECT DISTINCT user, tipo, categoria
       FROM registros
      WHERE categoria IS NOT NULL
        AND TRIM(categoria) <> ''
        AND tipo IN ('gasto', 'ingreso')`
  );

  // Agrupa por user+tipo+nombre normalizado (case-insensitive).
  const seen = new Map(); // key -> { user, tipo, nombre }
  for (const row of registros) {
    const nombre = normalizeName(row.categoria);
    if (!nombre) continue;
    const key = `${row.user}::${row.tipo}::${nombre.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, { user: row.user, tipo: row.tipo, nombre });
  }

  // Orden/color por usuario.
  const perUserCount = new Map();
  for (const { user, tipo, nombre } of seen.values()) {
    const idx = perUserCount.get(user) ?? 0;
    perUserCount.set(user, idx + 1);

    await conn.query(
      `INSERT INTO categorias (id, nombre, tipo, color, orden, user)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [uuid(), nombre, tipo, colorForIndex(idx), idx, user]
    );
  }

  // Enlaza los registros con la categoría correspondiente por nombre normalizado.
  await conn.query(
    `UPDATE registros r
       JOIN categorias c
         ON c.user = r.user
        AND c.tipo = r.tipo
        AND LOWER(c.nombre) = LOWER(TRIM(REGEXP_REPLACE(r.categoria, '\\\\s+', ' ')))
        SET r.categoria_id = c.id
      WHERE r.categoria_id IS NULL`
  );
}

module.exports = up;

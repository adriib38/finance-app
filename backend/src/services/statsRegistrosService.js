const db = require("../database");

// Construye el fragmento de filtro por rango de fechas sobre `fecha` (la
// fecha real del movimiento, editable — no `created_at`, que es la de alta).
// Devuelve { clause, params } para concatenar.
function rangoFechas({ from, to } = {}, alias = "") {
  const col = alias ? `${alias}.fecha` : "fecha";
  const clause = [];
  const params = [];
  if (from) {
    clause.push(`DATE(${col}) >= ?`);
    params.push(from);
  }
  if (to) {
    clause.push(`DATE(${col}) <= ?`);
    params.push(to);
  }
  return { clause: clause.length ? ` AND ${clause.join(" AND ")}` : "", params };
}

// Lista de meses "YYYY-MM" entre dos fechas ISO (inclusive), con tope de seguridad.
function monthsBetween(from, to, cap = 120) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) return [];
  const out = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end && out.length < cap) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const getStats = (userUuid, range = {}) => {
  const { clause, params } = rangoFechas(range);
  return new Promise((resolve, reject) => {
    db.query(
      `
      SELECT
        IFNULL(COUNT(*), 0) AS 'Número de registros',
        IFNULL(SUM(CASE WHEN tipo = 'gasto' THEN 1 ELSE 0 END), 0) AS 'Número de gastos',
        IFNULL(SUM(CASE WHEN tipo = 'ingreso' THEN 1 ELSE 0 END), 0) AS 'Número de ingresos',
        IFNULL(SUM(CASE WHEN tipo = 'gasto' THEN cantidad ELSE 0 END), 0) AS 'Gastos (€)',
        IFNULL(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad ELSE 0 END), 0) AS 'Ingresos (€)',
        (SELECT categoria
        FROM registros
        WHERE tipo = 'gasto' AND user = ?${clause}
        GROUP BY categoria
        ORDER BY COUNT(*) DESC
        LIMIT 1) AS 'Categoría moda gastos',
        (SELECT categoria
        FROM registros
        WHERE tipo = 'ingreso' AND user = ?${clause}
        GROUP BY categoria
        ORDER BY COUNT(*) DESC
        LIMIT 1) AS 'Categoría moda ingresos',
        (SELECT categoria
        FROM registros
        WHERE tipo = 'gasto' AND user = ?${clause}
        GROUP BY categoria
        ORDER BY SUM(cantidad) DESC
        LIMIT 1) AS 'Categoría más gastos',
        (SELECT categoria
        FROM registros
        WHERE tipo = 'ingreso' AND user = ?${clause}
        GROUP BY categoria
        ORDER BY SUM(cantidad) DESC
        LIMIT 1) AS 'Categoría más ingresos'
      FROM registros
      WHERE user = ?${clause};
      `,
      [
        userUuid, ...params,
        userUuid, ...params,
        userUuid, ...params,
        userUuid, ...params,
        userUuid, ...params,
      ],
      (err, results) => {
        if (err) {
          console.error("Error al obtener stats:", err);
          reject(err);
        } else {
          resolve(results[0]);
        }
      }
    );
  });
};

const getCantidadCategoriasTipo = (userUuid, tipo, range = {}) => {
  const { clause, params } = rangoFechas(range, "r");
  return new Promise((resolve, reject) => {
    db.query(
      `
      SELECT
        COALESCE(MAX(c.id), CONCAT('txt:', COALESCE(c.nombre, r.categoria))) AS 'id',
        SUM(r.cantidad) AS 'value',
        COALESCE(c.nombre, r.categoria) AS 'label',
        MAX(c.color) AS 'color'
      FROM registros r
      LEFT JOIN categorias c ON c.id = r.categoria_id
      WHERE r.tipo = ? AND r.user = ?${clause}
      GROUP BY COALESCE(c.nombre, r.categoria)
      ORDER BY value DESC;
      `,
      [tipo, userUuid, ...params],
      (err, results) => {
        if (err) {
          console.error("Error al obtener stats:", err);
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
};

/**
 * Serie temporal mensual: ingresos, gastos y balance (ingresos - gastos) por mes.
 * Si se pasa el rango completo (from + to) se rellenan los meses sin datos con 0,
 * para que el frontend solo tenga que pintar.
 */
const getTimeline = (userUuid, range = {}) => {
  const { clause, params } = rangoFechas(range);
  return new Promise((resolve, reject) => {
    db.query(
      `
      SELECT
        DATE_FORMAT(fecha, '%Y-%m') AS periodo,
        IFNULL(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad ELSE 0 END), 0) AS ingresos,
        IFNULL(SUM(CASE WHEN tipo = 'gasto'   THEN cantidad ELSE 0 END), 0) AS gastos
      FROM registros
      WHERE user = ?${clause}
      GROUP BY periodo
      ORDER BY periodo;
      `,
      [userUuid, ...params],
      (err, rows) => {
        if (err) {
          console.error("Error al obtener timeline:", err);
          return reject(err);
        }

        const byPeriodo = new Map(
          rows.map((r) => [
            r.periodo,
            { ingresos: round2(r.ingresos), gastos: round2(r.gastos) },
          ])
        );

        const periodos =
          range.from && range.to
            ? monthsBetween(range.from, range.to)
            : rows.map((r) => r.periodo);

        resolve(
          periodos.map((periodo) => {
            const v = byPeriodo.get(periodo) || { ingresos: 0, gastos: 0 };
            return {
              periodo,
              ingresos: v.ingresos,
              gastos: v.gastos,
              balance: round2(v.ingresos - v.gastos),
            };
          })
        );
      }
    );
  });
};

/**
 * Top N gastos más caros del periodo (registros individuales, no agregados).
 */
const getTopGastos = (userUuid, range = {}, limit = 5) => {
  const { clause, params } = rangoFechas(range, "r");
  const topLimit = Math.max(1, Math.min(50, Number(limit) || 5));
  return new Promise((resolve, reject) => {
    db.query(
      `
      SELECT
        r.id,
        r.concepto,
        r.observaciones,
        r.cantidad,
        r.fecha,
        COALESCE(c.nombre, r.categoria) AS categoria,
        c.color AS color
      FROM registros r
      LEFT JOIN categorias c ON c.id = r.categoria_id
      WHERE r.tipo = 'gasto' AND r.user = ?${clause}
      ORDER BY r.cantidad DESC
      LIMIT ?;
      `,
      [userUuid, ...params, topLimit],
      (err, results) => {
        if (err) {
          console.error("Error al obtener top gastos:", err);
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
};

module.exports = {
  getStats,
  getCantidadCategoriasTipo,
  getTimeline,
  getTopGastos,
};

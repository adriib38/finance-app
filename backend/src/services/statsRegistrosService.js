const { QueryTypes } = require("sequelize");
const sequelize = require("../sequelize");

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

const getStats = async (userUuid, range = {}) => {
  const { clause, params } = rangoFechas(range);
  const [stats] = await sequelize.query(
    `
    SELECT
      IFNULL(COUNT(*), 0) AS 'Número de registros',
      IFNULL(SUM(CASE WHEN tipo = 'gasto' THEN cantidad ELSE 0 END), 0) AS 'Gastos (€)',
      IFNULL(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad ELSE 0 END), 0) AS 'Ingresos (€)',
      IFNULL(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad ELSE 0 END), 0) - IFNULL(SUM(CASE WHEN tipo = 'gasto' THEN cantidad ELSE 0 END), 0) AS 'Balance (€)',
      IFNULL(SUM(CASE WHEN tipo = 'gasto' THEN 1 ELSE 0 END), 0) AS 'Número de gastos',
      IFNULL(SUM(CASE WHEN tipo = 'ingreso' THEN 1 ELSE 0 END), 0) AS 'Número de ingresos',
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
    {
      replacements: [
        userUuid, ...params,
        userUuid, ...params,
        userUuid, ...params,
        userUuid, ...params,
        userUuid, ...params,
      ],
      type: QueryTypes.SELECT,
    }
  );
  return stats;
};

const getCantidadCategoriasTipo = (userUuid, tipo, range = {}) => {
  const { clause, params } = rangoFechas(range, "r");
  return sequelize.query(
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
    { replacements: [tipo, userUuid, ...params], type: QueryTypes.SELECT }
  );
};

/**
 * Serie temporal mensual: ingresos, gastos y balance (ingresos - gastos) por mes.
 * Si se pasa el rango completo (from + to) se rellenan los meses sin datos con 0,
 * para que el frontend solo tenga que pintar.
 */
const getTimeline = async (userUuid, range = {}) => {
  const { clause, params } = rangoFechas(range);
  const rows = await sequelize.query(
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
    { replacements: [userUuid, ...params], type: QueryTypes.SELECT }
  );

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

  return periodos.map((periodo) => {
    const v = byPeriodo.get(periodo) || { ingresos: 0, gastos: 0 };
    return {
      periodo,
      ingresos: v.ingresos,
      gastos: v.gastos,
      balance: round2(v.ingresos - v.gastos),
    };
  });
};

/**
 * Top N gastos más caros del periodo (registros individuales, no agregados).
 */
const getTopGastos = (userUuid, range = {}, limit = 5) => {
  const { clause, params } = rangoFechas(range, "r");
  const topLimit = Math.max(1, Math.min(50, Number(limit) || 5));
  return sequelize.query(
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
    { replacements: [userUuid, ...params, topLimit], type: QueryTypes.SELECT }
  );
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// DAYOFWEEK de MySQL: 1 = domingo … 7 = sábado.
const DIAS_SEMANA = {
  1: "domingo", 2: "lunes", 3: "martes", 4: "miércoles",
  5: "jueves", 6: "viernes", 7: "sábado",
};

const getTotalesPeriodo = async (userUuid, range) => {
  const { clause, params } = rangoFechas(range);
  const [row] = await sequelize.query(
    `
    SELECT
      IFNULL(COUNT(*), 0) AS numRegistros,
      IFNULL(SUM(CASE WHEN tipo = 'gasto' THEN cantidad ELSE 0 END), 0) AS gastos,
      IFNULL(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad ELSE 0 END), 0) AS ingresos,
      IFNULL(SUM(CASE WHEN tipo = 'gasto' THEN 1 ELSE 0 END), 0) AS numGastos,
      IFNULL(SUM(CASE WHEN tipo = 'ingreso' THEN 1 ELSE 0 END), 0) AS numIngresos
    FROM registros
    WHERE user = ?${clause};
    `,
    { replacements: [userUuid, ...params], type: QueryTypes.SELECT }
  );
  const ingresos = Number(row.ingresos);
  const gastos = Number(row.gastos);
  return {
    numRegistros: Number(row.numRegistros),
    numGastos: Number(row.numGastos),
    numIngresos: Number(row.numIngresos),
    ingresos: round2(ingresos),
    gastos: round2(gastos),
    balance: round2(ingresos - gastos),
  };
};

const getMesesDelPeriodo = async (userUuid, range) => {
  const { clause, params } = rangoFechas(range);
  const rows = await sequelize.query(
    `
    SELECT
      MONTH(fecha) AS mes,
      IFNULL(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad ELSE 0 END), 0) AS ingresos,
      IFNULL(SUM(CASE WHEN tipo = 'gasto'   THEN cantidad ELSE 0 END), 0) AS gastos
    FROM registros
    WHERE user = ?${clause}
    GROUP BY mes;
    `,
    { replacements: [userUuid, ...params], type: QueryTypes.SELECT }
  );
  return rows.map((r) => {
    const ingresos = round2(r.ingresos);
    const gastos = round2(r.gastos);
    return {
      mes: Number(r.mes),
      nombre: MESES[Number(r.mes) - 1],
      ingresos,
      gastos,
      balance: round2(ingresos - gastos),
    };
  });
};

const getGastoMasAlto = async (userUuid, range) => {
  const { clause, params } = rangoFechas(range, "r");
  const [row] = await sequelize.query(
    `
    SELECT r.concepto, r.cantidad, r.fecha, COALESCE(c.nombre, r.categoria) AS categoria
    FROM registros r
    LEFT JOIN categorias c ON c.id = r.categoria_id
    WHERE r.tipo = 'gasto' AND r.user = ?${clause}
    ORDER BY r.cantidad DESC
    LIMIT 1;
    `,
    { replacements: [userUuid, ...params], type: QueryTypes.SELECT }
  );
  if (!row) return null;
  return {
    concepto: row.concepto,
    categoria: row.categoria,
    fecha: row.fecha,
    cantidad: round2(row.cantidad),
  };
};

const getCategoriaEstrella = async (userUuid, tipo, range) => {
  const { clause, params } = rangoFechas(range, "r");
  const [row] = await sequelize.query(
    `
    SELECT COALESCE(c.nombre, r.categoria) AS nombre, SUM(r.cantidad) AS total, MAX(c.color) AS color
    FROM registros r
    LEFT JOIN categorias c ON c.id = r.categoria_id
    WHERE r.tipo = ? AND r.user = ?${clause}
    GROUP BY nombre
    ORDER BY total DESC
    LIMIT 1;
    `,
    { replacements: [tipo, userUuid, ...params], type: QueryTypes.SELECT }
  );
  if (!row) return null;
  return { nombre: row.nombre, total: round2(row.total), color: row.color };
};

// Día de la semana en el que más se gasta de media (gasto total del día de
// semana entre nº de días distintos con movimientos ese día de semana).
const getDiaSemanaFavorito = async (userUuid, range) => {
  const { clause, params } = rangoFechas(range);
  const rows = await sequelize.query(
    `
    SELECT DAYOFWEEK(fecha) AS dow, SUM(cantidad) AS total, COUNT(DISTINCT fecha) AS dias
    FROM registros
    WHERE tipo = 'gasto' AND user = ?${clause}
    GROUP BY dow;
    `,
    { replacements: [userUuid, ...params], type: QueryTypes.SELECT }
  );
  if (!rows.length) return null;
  const best = rows.reduce((acc, r) => {
    const media = Number(r.total) / Number(r.dias);
    return !acc || media > acc.media ? { dow: Number(r.dow), media } : acc;
  }, null);
  return { dia: DIAS_SEMANA[best.dow], media: round2(best.media) };
};

const pctChange = (actual, previo) =>
  previo ? round2(((actual - previo) / Math.abs(previo)) * 100) : null;

/**
 * Resumen "wrapped" de un año completo: totales, hitos mensuales, gasto más
 * alto, categorías estrella, día de la semana donde más se gasta de media y
 * comparativa contra el año anterior (si hay datos).
 */
const getWrapped = async (userUuid, year) => {
  const anio = Number.isInteger(year) ? year : new Date().getFullYear();
  const range = { from: `${anio}-01-01`, to: `${anio}-12-31` };
  const rangePrev = { from: `${anio - 1}-01-01`, to: `${anio - 1}-12-31` };

  const [totales, meses, gastoMasAlto, categoriaGasto, categoriaIngreso, diaSemana, totalesPrev] =
    await Promise.all([
      getTotalesPeriodo(userUuid, range),
      getMesesDelPeriodo(userUuid, range),
      getGastoMasAlto(userUuid, range),
      getCategoriaEstrella(userUuid, "gasto", range),
      getCategoriaEstrella(userUuid, "ingreso", range),
      getDiaSemanaFavorito(userUuid, range),
      getTotalesPeriodo(userUuid, rangePrev),
    ]);

  const pickMes = (campo, comparador) =>
    meses.length ? meses.reduce((a, b) => (comparador(b[campo], a[campo]) ? b : a)) : null;

  const comparativaAnioAnterior = totalesPrev.numRegistros
    ? {
        anio: anio - 1,
        ingresos: totalesPrev.ingresos,
        gastos: totalesPrev.gastos,
        balance: totalesPrev.balance,
        pctIngresos: pctChange(totales.ingresos, totalesPrev.ingresos),
        pctGastos: pctChange(totales.gastos, totalesPrev.gastos),
        pctBalance: pctChange(totales.balance, totalesPrev.balance),
      }
    : null;

  return {
    anio,
    ...totales,
    mesMasGasto: pickMes("gastos", (b, a) => b > a),
    mesMasIngreso: pickMes("ingresos", (b, a) => b > a),
    mejorMes: pickMes("balance", (b, a) => b > a),
    peorMes: pickMes("balance", (b, a) => b < a),
    gastoMasAlto,
    categoriaEstrellaGasto: categoriaGasto,
    categoriaEstrellaIngreso: categoriaIngreso,
    diaSemanaFavorito: diaSemana,
    comparativaAnioAnterior,
  };
};

module.exports = {
  getStats,
  getCantidadCategoriasTipo,
  getTimeline,
  getTopGastos,
  getWrapped,
};

const { v4: uuid } = require("uuid");
const pool = require("../database");

const db = pool.promise();

const TIPOS = ["accion", "etf"];

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const COLUMNS =
  "id, ticker, nombre, tipo, participaciones, precio_compra, importe, fecha, observaciones, created_at, updated_at";

class Inversion {
  static async getAll(userUuid, { from, to, ticker } = {}) {
    const params = [userUuid];
    let where = "user = ?";
    if (from) {
      where += " AND fecha >= ?";
      params.push(from);
    }
    if (to) {
      where += " AND fecha <= ?";
      params.push(to);
    }
    if (ticker) {
      where += " AND ticker = ?";
      params.push(ticker.toUpperCase());
    }
    const [rows] = await db.query(
      `SELECT ${COLUMNS} FROM inversiones WHERE ${where} ORDER BY fecha DESC, created_at DESC`,
      params
    );
    return rows;
  }

  static async getById(id, userUuid) {
    const [rows] = await db.query(
      `SELECT ${COLUMNS} FROM inversiones WHERE id = ? AND user = ?`,
      [id, userUuid]
    );
    return rows[0] || null;
  }

  static async create(
    { ticker, nombre, tipo, participaciones, precio_compra, fecha, observaciones },
    userUuid
  ) {
    const id = uuid();
    // El importe aportado lo calcula el servidor, nunca lo manda el cliente.
    const importe = round2(Number(participaciones) * Number(precio_compra));
    await db.query(
      `INSERT INTO inversiones
        (id, ticker, nombre, tipo, participaciones, precio_compra, importe, fecha, observaciones, user)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURDATE()), ?, ?)`,
      [
        id,
        String(ticker).trim().toUpperCase(),
        nombre ? String(nombre).trim() : null,
        tipo,
        participaciones,
        precio_compra,
        importe,
        fecha || null,
        observaciones || null,
        userUuid,
      ]
    );
    return this.getById(id, userUuid);
  }

  static async update(id, userUuid, fields) {
    const existing = await this.getById(id, userUuid);
    if (!existing) return null;

    // participaciones/precio_compra van ligados: si cambia cualquiera de los
    // dos hay que recalcular `importe` con los dos valores finales.
    const participaciones =
      fields.participaciones !== undefined ? fields.participaciones : existing.participaciones;
    const precioCompra =
      fields.precio_compra !== undefined ? fields.precio_compra : existing.precio_compra;

    const sets = [];
    const params = [];

    const simple = ["nombre", "tipo", "fecha", "observaciones"];
    for (const key of simple) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(key === "nombre" && fields[key] ? String(fields[key]).trim() : fields[key]);
      }
    }
    if (fields.ticker !== undefined) {
      sets.push("ticker = ?");
      params.push(String(fields.ticker).trim().toUpperCase());
    }
    if (fields.participaciones !== undefined || fields.precio_compra !== undefined) {
      sets.push("participaciones = ?", "precio_compra = ?", "importe = ?");
      params.push(participaciones, precioCompra, round2(Number(participaciones) * Number(precioCompra)));
    }

    if (sets.length === 0) return existing;
    params.push(id, userUuid);
    await db.query(`UPDATE inversiones SET ${sets.join(", ")} WHERE id = ? AND user = ?`, params);
    return this.getById(id, userUuid);
  }

  static async remove(id, userUuid) {
    const [res] = await db.query(`DELETE FROM inversiones WHERE id = ? AND user = ?`, [
      id,
      userUuid,
    ]);
    return res.affectedRows > 0;
  }

  // Total aportado a la cartera + posición agregada por ticker (participaciones
  // totales, importe invertido y precio medio de compra). Sin valor de
  // mercado todavía: eso llega con la futura API de cotizaciones.
  //
  // Se distingue aportado NETO (compras - ventas, lo que queda realmente
  // invertido) de aportado BRUTO (solo compras, ignorando lo vendido): el
  // bruto es el que hace falta como base de coste para calcular el
  // beneficio total más adelante (beneficio = valor_actual + vendido - bruto).
  static async getResumen(userUuid) {
    const [posiciones] = await db.query(
      `SELECT
          ticker,
          -- nombre/tipo pueden variar entre aportaciones (rara vez); nos
          -- quedamos con los de la aportación más reciente.
          SUBSTRING_INDEX(GROUP_CONCAT(nombre ORDER BY fecha DESC, created_at DESC), ',', 1) AS nombre,
          SUBSTRING_INDEX(GROUP_CONCAT(tipo ORDER BY fecha DESC, created_at DESC), ',', 1) AS tipo,
          SUM(participaciones) AS participaciones,
          SUM(importe) AS importe
         FROM inversiones
        WHERE user = ?
        GROUP BY ticker
        ORDER BY importe DESC`,
      [userUuid]
    );

    const [[{ totalInvertido, totalVendido }]] = await db.query(
      `SELECT
          IFNULL(SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END), 0) AS totalInvertido,
          IFNULL(SUM(CASE WHEN importe < 0 THEN -importe ELSE 0 END), 0) AS totalVendido
         FROM inversiones
        WHERE user = ?`,
      [userUuid]
    );

    const total = posiciones.reduce((acc, p) => acc + Number(p.importe || 0), 0);

    return {
      // Neto: lo que sigue realmente invertido (compras - ventas).
      totalAportado: round2(total),
      // Bruto: solo compras, sin restar lo vendido.
      totalInvertido: round2(totalInvertido),
      // Dinero recibido al vender (siempre >= 0).
      totalVendido: round2(totalVendido),
      posiciones: posiciones.map((p) => ({
        ticker: p.ticker,
        nombre: p.nombre,
        tipo: p.tipo,
        participaciones: Number(p.participaciones),
        importe: round2(p.importe),
        precioMedio: Number(p.participaciones)
          ? round2(Number(p.importe) / Number(p.participaciones))
          : 0,
      })),
    };
  }

  // Aportaciones mensuales agregadas, para el gráfico de barras.
  static async getAportacionesMensuales(userUuid) {
    const [rows] = await db.query(
      `SELECT DATE_FORMAT(fecha, '%Y-%m') AS periodo, SUM(importe) AS importe
         FROM inversiones
        WHERE user = ?
        GROUP BY periodo
        ORDER BY periodo`,
      [userUuid]
    );
    return rows.map((r) => ({ periodo: r.periodo, importe: round2(r.importe) }));
  }
}

Inversion.TIPOS = TIPOS;
module.exports = Inversion;

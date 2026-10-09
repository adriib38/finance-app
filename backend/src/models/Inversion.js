const { v4: uuid } = require("uuid");
const { DataTypes, Op, Sequelize } = require("sequelize");
const sequelize = require("../sequelize");

const TIPOS = ["accion", "etf"];

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const COLUMNS = [
  "id",
  "ticker",
  "nombre",
  "tipo",
  "participaciones",
  "precio_compra",
  "importe",
  "fecha",
  "observaciones",
  "created_at",
  "updated_at",
];

const InversionModel = sequelize.define(
  "Inversion",
  {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    ticker: { type: DataTypes.STRING(20), allowNull: false },
    nombre: { type: DataTypes.STRING(150), allowNull: true },
    tipo: { type: DataTypes.ENUM(...TIPOS), allowNull: false },
    participaciones: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
    precio_compra: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
    importe: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.fn("CURDATE"),
    },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    user: { type: DataTypes.STRING(36), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: "inversiones" }
);

class Inversion {
  static async getAll(userUuid, { from, to, ticker } = {}) {
    const where = { user: userUuid };
    if (from || to) {
      where.fecha = {};
      if (from) where.fecha[Op.gte] = from;
      if (to) where.fecha[Op.lte] = to;
    }
    if (ticker) where.ticker = ticker.toUpperCase();
    return InversionModel.findAll({
      where,
      attributes: COLUMNS,
      order: [
        ["fecha", "DESC"],
        ["created_at", "DESC"],
      ],
      raw: true,
    });
  }

  static async getById(id, userUuid) {
    const row = await InversionModel.findOne({
      where: { id, user: userUuid },
      attributes: COLUMNS,
      raw: true,
    });
    return row || null;
  }

  static async create(
    { ticker, nombre, tipo, participaciones, precio_compra, fecha, observaciones },
    userUuid
  ) {
    const id = uuid();
    // El importe aportado lo calcula el servidor, nunca lo manda el cliente.
    const importe = round2(Number(participaciones) * Number(precio_compra));
    const data = {
      id,
      ticker: String(ticker).trim().toUpperCase(),
      nombre: nombre ? String(nombre).trim() : null,
      tipo,
      participaciones,
      precio_compra,
      importe,
      observaciones: observaciones || null,
      user: userUuid,
    };
    if (fecha) data.fecha = fecha;
    await InversionModel.create(data);
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

    const values = {};
    const simple = ["nombre", "tipo", "fecha", "observaciones"];
    for (const key of simple) {
      if (fields[key] !== undefined) {
        values[key] = key === "nombre" && fields[key] ? String(fields[key]).trim() : fields[key];
      }
    }
    if (fields.ticker !== undefined) {
      values.ticker = String(fields.ticker).trim().toUpperCase();
    }
    if (fields.participaciones !== undefined || fields.precio_compra !== undefined) {
      values.participaciones = participaciones;
      values.precio_compra = precioCompra;
      values.importe = round2(Number(participaciones) * Number(precioCompra));
    }

    if (Object.keys(values).length === 0) return existing;
    await InversionModel.update(values, { where: { id, user: userUuid } });
    return this.getById(id, userUuid);
  }

  static async remove(id, userUuid) {
    const affected = await InversionModel.destroy({ where: { id, user: userUuid } });
    return affected > 0;
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
    const posiciones = await InversionModel.findAll({
      where: { user: userUuid },
      attributes: [
        "ticker",
        // nombre/tipo pueden variar entre aportaciones (rara vez); nos
        // quedamos con los de la aportación más reciente.
        [
          sequelize.literal(
            "SUBSTRING_INDEX(GROUP_CONCAT(nombre ORDER BY fecha DESC, created_at DESC), ',', 1)"
          ),
          "nombre",
        ],
        [
          sequelize.literal(
            "SUBSTRING_INDEX(GROUP_CONCAT(tipo ORDER BY fecha DESC, created_at DESC), ',', 1)"
          ),
          "tipo",
        ],
        [sequelize.fn("SUM", sequelize.col("participaciones")), "participaciones"],
        [sequelize.fn("SUM", sequelize.col("importe")), "importe"],
      ],
      group: ["ticker"],
      order: [[sequelize.literal("importe"), "DESC"]],
      raw: true,
    });

    const totales = await InversionModel.findOne({
      where: { user: userUuid },
      attributes: [
        [
          sequelize.fn(
            "SUM",
            sequelize.literal("CASE WHEN importe > 0 THEN importe ELSE 0 END")
          ),
          "totalInvertido",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal("CASE WHEN importe < 0 THEN -importe ELSE 0 END")
          ),
          "totalVendido",
        ],
      ],
      raw: true,
    });

    const totalInvertido = totales ? totales.totalInvertido : 0;
    const totalVendido = totales ? totales.totalVendido : 0;

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
    const rows = await InversionModel.findAll({
      where: { user: userUuid },
      attributes: [
        [sequelize.fn("DATE_FORMAT", sequelize.col("fecha"), "%Y-%m"), "periodo"],
        [sequelize.fn("SUM", sequelize.col("importe")), "importe"],
      ],
      group: [sequelize.literal("periodo")],
      order: [[sequelize.literal("periodo"), "ASC"]],
      raw: true,
    });
    return rows.map((r) => ({ periodo: r.periodo, importe: round2(r.importe) }));
  }
}

Inversion.TIPOS = TIPOS;
Inversion.Model = InversionModel;
module.exports = Inversion;

const { v4: uuid } = require("uuid");
const { DataTypes, Op } = require("sequelize");
const sequelize = require("../sequelize");
const Categoria = require("./Categoria");

const TIPOS = ["gasto", "ingreso"];

const SuscripcionModel = sequelize.define(
  "Suscripcion",
  {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    user: { type: DataTypes.STRING(36), allowNull: false },
    nombre: { type: DataTypes.STRING(255), allowNull: false },
    categoria_id: { type: DataTypes.STRING(36), allowNull: true },
    tipo: { type: DataTypes.ENUM(...TIPOS), allowNull: false, defaultValue: "gasto" },
    cantidad: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    dia_pago: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: true },
    activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: "suscripciones" }
);

SuscripcionModel.belongsTo(Categoria.Model, {
  as: "categoriaRef",
  foreignKey: "categoria_id",
});

const DETAIL_ATTRS = [
  "id",
  "nombre",
  "categoria_id",
  "tipo",
  "cantidad",
  "dia_pago",
  "fecha_inicio",
  "fecha_fin",
  "activa",
  "user",
  "created_at",
  "updated_at",
];

class Suscripcion {
  static async getAll(userUuid) {
    const rows = await SuscripcionModel.findAll({
      where: { user: userUuid },
      attributes: [
        "id",
        "nombre",
        "categoria_id",
        "tipo",
        "cantidad",
        "dia_pago",
        "fecha_inicio",
        "fecha_fin",
        "activa",
        "created_at",
        "updated_at",
      ],
      include: [{ model: Categoria.Model, as: "categoriaRef", attributes: ["nombre"] }],
      order: [
        ["activa", "DESC"],
        ["nombre", "ASC"],
      ],
    });
    return rows.map((row) => {
      const plain = row.get({ plain: true });
      const categoria = plain.categoriaRef ? plain.categoriaRef.nombre : null;
      delete plain.categoriaRef;
      // `.get({ plain: true })` castea BOOLEAN a true/false; el resto de
      // métodos del modelo usan `raw: true` (devuelven el 0/1 nativo de
      // MySQL) — se normaliza aquí para que la forma sea consistente entre
      // list/getById/create/update, igual que antes de la migración.
      return { ...plain, activa: plain.activa ? 1 : 0, categoria };
    });
  }

  static async getById(id, userUuid) {
    const row = await SuscripcionModel.findOne({
      where: { id, user: userUuid },
      attributes: DETAIL_ATTRS,
      raw: true,
    });
    return row || null;
  }

  // Todas las suscripciones activas de cualquier usuario cuya fecha de inicio
  // ya ha llegado — es lo que consulta el motor de reconciliación en cada
  // arranque/intervalo. El filtrado fino por periodo (qué mes toca) lo hace
  // `procesarSuscripciones` con `suscripciones_cargos`.
  static async getActivas() {
    return SuscripcionModel.findAll({
      where: {
        activa: true,
        fecha_inicio: { [Op.lte]: sequelize.fn("CURDATE") },
      },
      attributes: [
        "id",
        "nombre",
        "categoria_id",
        "tipo",
        "cantidad",
        "dia_pago",
        "fecha_inicio",
        "fecha_fin",
        "user",
      ],
      raw: true,
    });
  }

  static async create(
    { nombre, categoria_id, tipo, cantidad, dia_pago, fecha_inicio, fecha_fin },
    userUuid
  ) {
    const id = uuid();
    await SuscripcionModel.create({
      id,
      user: userUuid,
      nombre: String(nombre).trim(),
      categoria_id: categoria_id ?? null,
      tipo,
      cantidad,
      dia_pago,
      fecha_inicio,
      fecha_fin: fecha_fin ?? null,
    });
    return this.getById(id, userUuid);
  }

  static async update(id, userUuid, fields) {
    // `fecha_inicio` no es editable a propósito: cambiarla después de crear
    // la suscripción dispararía un backfill inesperado en el próximo arranque
    // del motor. Para "empezar de nuevo" hay que crear otra suscripción.
    const allowed = [
      "nombre",
      "categoria_id",
      "tipo",
      "cantidad",
      "dia_pago",
      "fecha_fin",
      "activa",
    ];
    const values = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        values[key] = key === "nombre" ? String(fields[key]).trim() : fields[key];
      }
    }
    if (Object.keys(values).length === 0) return this.getById(id, userUuid);
    await SuscripcionModel.update(values, { where: { id, user: userUuid } });
    return this.getById(id, userUuid);
  }

  static async remove(id, userUuid) {
    // ON DELETE CASCADE se lleva por delante `suscripciones_cargos` (es solo
    // contabilidad interna); los `registros` ya generados no se tocan.
    const affected = await SuscripcionModel.destroy({ where: { id, user: userUuid } });
    return affected > 0;
  }
}

Suscripcion.TIPOS = TIPOS;
Suscripcion.Model = SuscripcionModel;
module.exports = Suscripcion;

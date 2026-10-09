const { v4: uuid } = require("uuid");
const { DataTypes, Op } = require("sequelize");
const sequelize = require("../sequelize");
const { colorForIndex } = require("../utils/palette");

const TIPOS = ["gasto", "ingreso"];

const CategoriaModel = sequelize.define(
  "Categoria",
  {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    tipo: { type: DataTypes.ENUM(...TIPOS), allowNull: false },
    color: { type: DataTypes.STRING(7), allowNull: true },
    activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orden: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
    user: { type: DataTypes.STRING(36), allowNull: false },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  { tableName: "categorias" }
);

const PUBLIC_ATTRS = ["id", "nombre", "tipo", "color", "activa", "orden", "created_at"];

// Normaliza el error de restricción UNIQUE (user, tipo, nombre) al formato
// `err.code === 'ER_DUP_ENTRY'` que ya esperan los controllers.
function normalizeDupError(err) {
  if (err.name === "SequelizeUniqueConstraintError") {
    err.code = "ER_DUP_ENTRY";
  }
  throw err;
}

class Categoria {
  static async getAll(userUuid, { tipo } = {}) {
    const where = { user: userUuid };
    if (tipo && TIPOS.includes(tipo)) where.tipo = tipo;
    return CategoriaModel.findAll({
      where,
      attributes: PUBLIC_ATTRS,
      order: [
        ["tipo", "ASC"],
        ["orden", "ASC"],
        ["nombre", "ASC"],
      ],
      raw: true,
    });
  }

  static async getById(id, userUuid) {
    const row = await CategoriaModel.findOne({
      where: { id, user: userUuid },
      attributes: PUBLIC_ATTRS,
      raw: true,
    });
    return row || null;
  }

  static async create({ nombre, tipo, color, orden }, userUuid) {
    const id = uuid();
    const count = await CategoriaModel.count({ where: { user: userUuid, tipo } });
    const maxOrden = await CategoriaModel.max("orden", { where: { user: userUuid, tipo } });
    const nextOrden =
      orden === undefined || orden === null
        ? (maxOrden === null ? -1 : maxOrden) + 1
        : orden;
    const finalColor = color || colorForIndex(count);
    try {
      await CategoriaModel.create({
        id,
        nombre: nombre.trim(),
        tipo,
        color: finalColor,
        orden: nextOrden,
        user: userUuid,
      });
    } catch (err) {
      normalizeDupError(err);
    }
    return this.getById(id, userUuid);
  }

  static async update(id, userUuid, fields) {
    const allowed = ["nombre", "color", "activa", "orden"];
    const values = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        values[key] = key === "nombre" ? String(fields[key]).trim() : fields[key];
      }
    }
    if (Object.keys(values).length === 0) return this.getById(id, userUuid);
    try {
      await CategoriaModel.update(values, { where: { id, user: userUuid } });
    } catch (err) {
      normalizeDupError(err);
    }
    return this.getById(id, userUuid);
  }

  static async remove(id, userUuid) {
    // La FK en registros es ON DELETE SET NULL: los registros conservan el
    // texto en `registros.categoria` pero pierden el enlace.
    const affected = await CategoriaModel.destroy({ where: { id, user: userUuid } });
    return affected > 0;
  }

  /**
   * Fusiona `sourceId` dentro de `targetId`: reasigna los registros y borra la
   * categoría absorbida. Ambas deben ser del mismo usuario y tipo.
   */
  static async merge(sourceId, targetId, userUuid) {
    if (sourceId === targetId) {
      throw new Error("No se puede fusionar una categoría consigo misma");
    }
    const [source, target] = await Promise.all([
      this.getById(sourceId, userUuid),
      this.getById(targetId, userUuid),
    ]);
    if (!source || !target) throw new Error("Categoría no encontrada");
    if (source.tipo !== target.tipo) {
      throw new Error("Sólo se pueden fusionar categorías del mismo tipo");
    }

    await sequelize.transaction(async (t) => {
      await sequelize.models.Registro.update(
        { categoria_id: targetId, categoria: target.nombre },
        { where: { categoria_id: sourceId, user: userUuid }, transaction: t }
      );
      await CategoriaModel.destroy({
        where: { id: sourceId, user: userUuid },
        transaction: t,
      });
    });
    return this.getById(targetId, userUuid);
  }
}

Categoria.TIPOS = TIPOS;
Categoria.Model = CategoriaModel;
module.exports = Categoria;

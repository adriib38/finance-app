const { v4: uuid } = require("uuid");
const pool = require("../database");
const { colorForIndex } = require("../utils/palette");

const db = pool.promise();

const TIPOS = ["gasto", "ingreso"];

class Categoria {
  static async getAll(userUuid, { tipo } = {}) {
    const params = [userUuid];
    let where = "user = ?";
    if (tipo && TIPOS.includes(tipo)) {
      where += " AND tipo = ?";
      params.push(tipo);
    }
    const [rows] = await db.query(
      `SELECT id, nombre, tipo, color, activa, orden, created_at
         FROM categorias
        WHERE ${where}
        ORDER BY tipo, orden, nombre`,
      params
    );
    return rows;
  }

  static async getById(id, userUuid) {
    const [rows] = await db.query(
      `SELECT id, nombre, tipo, color, activa, orden, created_at
         FROM categorias WHERE id = ? AND user = ?`,
      [id, userUuid]
    );
    return rows[0] || null;
  }

  static async create({ nombre, tipo, color, orden }, userUuid) {
    const id = uuid();
    const [[{ count, maxOrden }]] = await db.query(
      `SELECT COUNT(*) AS count, COALESCE(MAX(orden), -1) AS maxOrden
         FROM categorias WHERE user = ? AND tipo = ?`,
      [userUuid, tipo]
    );
    const nextOrden =
      orden === undefined || orden === null ? maxOrden + 1 : orden;
    const finalColor = color || colorForIndex(count);
    await db.query(
      `INSERT INTO categorias (id, nombre, tipo, color, orden, user)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, nombre.trim(), tipo, finalColor, nextOrden, userUuid]
    );
    return this.getById(id, userUuid);
  }

  static async update(id, userUuid, fields) {
    const allowed = ["nombre", "color", "activa", "orden"];
    const sets = [];
    const params = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(key === "nombre" ? String(fields[key]).trim() : fields[key]);
      }
    }
    if (sets.length === 0) return this.getById(id, userUuid);
    params.push(id, userUuid);
    await db.query(
      `UPDATE categorias SET ${sets.join(", ")} WHERE id = ? AND user = ?`,
      params
    );
    return this.getById(id, userUuid);
  }

  static async remove(id, userUuid) {
    // La FK en registros es ON DELETE SET NULL: los registros conservan el
    // texto en `registros.categoria` pero pierden el enlace.
    const [res] = await db.query(
      `DELETE FROM categorias WHERE id = ? AND user = ?`,
      [id, userUuid]
    );
    return res.affectedRows > 0;
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

    const conn = await pool.promise().getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE registros SET categoria_id = ?, categoria = ?
           WHERE categoria_id = ? AND user = ?`,
        [targetId, target.nombre, sourceId, userUuid]
      );
      await conn.query(`DELETE FROM categorias WHERE id = ? AND user = ?`, [
        sourceId,
        userUuid,
      ]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return this.getById(targetId, userUuid);
  }
}

Categoria.TIPOS = TIPOS;
module.exports = Categoria;

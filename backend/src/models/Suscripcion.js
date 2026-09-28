const { v4: uuid } = require("uuid");
const pool = require("../database");

const db = pool.promise();

const TIPOS = ["gasto", "ingreso"];

class Suscripcion {
  static async getAll(userUuid) {
    const [rows] = await db.query(
      `SELECT s.id, s.nombre, s.categoria_id, c.nombre AS categoria, s.tipo,
              s.cantidad, s.dia_pago, s.fecha_inicio, s.fecha_fin, s.activa,
              s.created_at, s.updated_at
         FROM suscripciones s
         LEFT JOIN categorias c ON c.id = s.categoria_id
        WHERE s.user = ?
        ORDER BY s.activa DESC, s.nombre`,
      [userUuid]
    );
    return rows;
  }

  static async getById(id, userUuid) {
    const [rows] = await db.query(
      `SELECT id, nombre, categoria_id, tipo, cantidad, dia_pago, fecha_inicio,
              fecha_fin, activa, user, created_at, updated_at
         FROM suscripciones WHERE id = ? AND user = ?`,
      [id, userUuid]
    );
    return rows[0] || null;
  }

  // Todas las suscripciones activas de cualquier usuario cuya fecha de inicio
  // ya ha llegado — es lo que consulta el motor de reconciliación en cada
  // arranque/intervalo. El filtrado fino por periodo (qué mes toca) lo hace
  // `procesarSuscripciones` con `suscripciones_cargos`.
  static async getActivas() {
    const [rows] = await db.query(
      `SELECT id, nombre, categoria_id, tipo, cantidad, dia_pago, fecha_inicio,
              fecha_fin, user
         FROM suscripciones
        WHERE activa = 1 AND fecha_inicio <= CURDATE()`
    );
    return rows;
  }

  static async create(
    { nombre, categoria_id, tipo, cantidad, dia_pago, fecha_inicio, fecha_fin },
    userUuid
  ) {
    const id = uuid();
    await db.query(
      `INSERT INTO suscripciones
         (id, user, nombre, categoria_id, tipo, cantidad, dia_pago, fecha_inicio, fecha_fin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userUuid,
        String(nombre).trim(),
        categoria_id ?? null,
        tipo,
        cantidad,
        dia_pago,
        fecha_inicio,
        fecha_fin ?? null,
      ]
    );
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
      `UPDATE suscripciones SET ${sets.join(", ")} WHERE id = ? AND user = ?`,
      params
    );
    return this.getById(id, userUuid);
  }

  static async remove(id, userUuid) {
    // ON DELETE CASCADE se lleva por delante `suscripciones_cargos` (es solo
    // contabilidad interna); los `registros` ya generados no se tocan.
    const [res] = await db.query(
      `DELETE FROM suscripciones WHERE id = ? AND user = ?`,
      [id, userUuid]
    );
    return res.affectedRows > 0;
  }
}

Suscripcion.TIPOS = TIPOS;
module.exports = Suscripcion;

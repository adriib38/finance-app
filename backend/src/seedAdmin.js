const pool = require("./database");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// UUID fijo del único usuario. Se mantiene estable entre reinicios para que
// la FK registros.user no se rompa.
const ADMIN_UUID = "00000000-0000-0000-0000-000000000001";

// Garantiza que sólo exista el usuario admin definido en el .env.
// - Crea el usuario si no existe.
// - Sincroniza usuario/contraseña con el .env en cada arranque.
// - Reasigna los registros de cualquier otra cuenta al admin y borra esas cuentas.
// Se ejecuta dentro de una transacción sobre una única conexión para que dos
// arranques simultáneos no puedan dejar la tabla en un estado inconsistente.
async function seedAdmin() {
  const username = (process.env.ADMIN_USERNAME || "admin")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "");
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error("ADMIN_PASSWORD no está definido en el .env");
  }

  const saltRounds = parseInt(process.env.SALT_ROUNDS, 10) || 10;
  const hash = bcrypt.hashSync(password, saltRounds);

  const conn = pool.promise();
  const db = await conn.getConnection();
  try {
    await db.beginTransaction();

    // 1. Crear / actualizar el usuario admin.
    await db.query(
      `INSERT INTO users (uuid, username, password) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE username = VALUES(username), password = VALUES(password)`,
      [ADMIN_UUID, username, hash]
    );

    // 2. Conservar los datos: mover registros de otras cuentas al admin.
    await db.query("UPDATE registros SET user = ? WHERE user <> ?", [ADMIN_UUID, ADMIN_UUID]);

    // 3. Eliminar cualquier otra cuenta.
    const [del] = await db.query("DELETE FROM users WHERE uuid <> ?", [ADMIN_UUID]);
    if (del && del.affectedRows > 0) {
      console.log(`✓ Eliminadas ${del.affectedRows} cuenta(s) sobrantes`);
    }

    await db.commit();
    console.log(`✓ Usuario único listo: ${username}`);
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    db.release();
  }
}

module.exports = seedAdmin;

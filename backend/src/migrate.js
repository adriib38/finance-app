/**
 * Runner de migraciones mínimo.
 *
 * - Aplica en orden los ficheros de `src/migrations` (`.sql` o `.js`).
 * - Registra los aplicados en la tabla `schema_migrations` para no repetirlos.
 * - Un `.js` de migración exporta `async function up(conn)` donde `conn` es una
 *   conexión mysql2/promise con `multipleStatements` activado.
 *
 * Uso: `npm run migrate` o `require("./migrate")()` desde `main.js`.
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    multipleStatements: true,
  });
}

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function appliedMigrations(conn) {
  const [rows] = await conn.query("SELECT name FROM schema_migrations");
  return new Set(rows.map((r) => r.name));
}

function pendingFiles(applied) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") || f.endsWith(".js"))
    .sort()
    .filter((f) => !applied.has(f));
}

async function runMigrations() {
  const conn = await createConnection();
  try {
    await ensureMigrationsTable(conn);
    const applied = await appliedMigrations(conn);
    const pending = pendingFiles(applied);

    if (pending.length === 0) {
      console.log("✓ Migraciones al día");
      return;
    }

    for (const file of pending) {
      const full = path.join(MIGRATIONS_DIR, file);
      console.log(`→ Aplicando migración ${file}`);
      await conn.beginTransaction();
      try {
        if (file.endsWith(".sql")) {
          const sql = fs.readFileSync(full, "utf8").trim();
          if (sql) await conn.query(sql);
        } else {
          const migration = require(full);
          const up = typeof migration === "function" ? migration : migration.up;
          if (typeof up !== "function") {
            throw new Error(`La migración ${file} no exporta una función up()`);
          }
          await up(conn);
        }
        await conn.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
        await conn.commit();
        console.log(`✓ ${file}`);
      } catch (err) {
        await conn.rollback();
        throw new Error(`Fallo en la migración ${file}: ${err.message}`);
      }
    }
  } finally {
    await conn.end();
  }
}

module.exports = runMigrations;

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

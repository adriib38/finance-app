const db = require("./dbReadOnly");

const MAX_ROWS = 500;
const STATEMENT_TIMEOUT_MS = 5000;

// Operaciones prohibidas fuera de literales/comentarios. La garantía real es el
// usuario MySQL de solo lectura; esto es una barrera adicional y da un error
// claro al modelo para que reformule.
const FORBIDDEN =
  /\b(INSERT|UPDATE|DELETE|REPLACE|MERGE|TRUNCATE|DROP|CREATE|ALTER|RENAME|GRANT|REVOKE|SET|LOCK|UNLOCK|CALL|DO|LOAD|OUTFILE|DUMPFILE|HANDLER|PREPARE|EXECUTE|DEALLOCATE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/i;

const SYSTEM_SCHEMAS = /\b(information_schema|performance_schema|mysql|sys)\s*\./i;

// Sustituye literales string, identificadores con backtick y comentarios por
// placeholders para que el análisis de palabras clave no dé falsos positivos.
function stripLiterals(sql) {
  return sql
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`[^`]*`/g, "``")
    .replace(/--[^\n]*/g, " ")
    .replace(/#[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

function validateSelect(rawSql) {
  const sql = String(rawSql || "")
    .trim()
    .replace(/;\s*$/, "");
  if (!sql) throw new Error("SQL vacía");

  const bare = stripLiterals(sql);

  if (bare.includes(";")) {
    throw new Error("Solo se permite una sentencia SQL");
  }
  if (!/^\s*(select|with)\b/i.test(bare)) {
    throw new Error("Solo se permiten consultas SELECT");
  }
  if (FORBIDDEN.test(bare)) {
    throw new Error("La consulta contiene una operación no permitida (solo lectura)");
  }
  if (SYSTEM_SCHEMAS.test(bare)) {
    throw new Error("No se permite consultar esquemas del sistema");
  }
  if (/\busers\b/i.test(bare) && /\bpassword\b/i.test(bare)) {
    throw new Error("No se permite leer la columna password de users");
  }
  return sql;
}

function enforceLimit(sql) {
  return /\blimit\s+\d/i.test(stripLiterals(sql)) ? sql : `${sql}\nLIMIT ${MAX_ROWS}`;
}

// Ejecuta una SELECT validada y devuelve las filas (con tope de MAX_ROWS).
async function runSelect(rawSql) {
  const sql = enforceLimit(validateSelect(rawSql));
  const [rows] = await db.query({ sql, timeout: STATEMENT_TIMEOUT_MS });
  const arr = Array.isArray(rows) ? rows : [rows];
  return {
    sql,
    rows: arr.slice(0, MAX_ROWS),
    truncated: arr.length > MAX_ROWS,
  };
}

module.exports = { validateSelect, runSelect, MAX_ROWS };

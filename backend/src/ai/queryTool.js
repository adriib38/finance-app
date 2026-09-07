const db = require("./dbReadOnly");

const MAX_ROWS = 500;
const STATEMENT_TIMEOUT_MS = 5000;

// Operaciones prohibidas fuera de literales/comentarios. La garantía real es el
// usuario MySQL de solo lectura; esto es una barrera adicional y da un error
// claro al modelo para que reformule.
const FORBIDDEN =
  /\b(UPDATE|DELETE|REPLACE|MERGE|TRUNCATE|DROP|CREATE|ALTER|RENAME|GRANT|REVOKE|SET|LOCK|UNLOCK|CALL|DO|LOAD|OUTFILE|DUMPFILE|HANDLER|PREPARE|EXECUTE|DEALLOCATE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/i;

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

// `kind`: "select" (por defecto) o "insert". Valida que la sentencia empiece
// por el verbo esperado y que no contenga operaciones prohibidas.
function validateQuery(rawSql, kind = "select") {
  const sql = String(rawSql || "")
    .trim()
    .replace(/;\s*$/, "");
  if (!sql) throw new Error("SQL vacía");

  const bare = stripLiterals(sql);

  if (bare.includes(";")) {
    throw new Error("Solo se permite una sentencia SQL");
  }

  if (kind === "insert") {
    if (!/^\s*insert\b/i.test(bare)) {
      throw new Error("Solo se permiten sentencias INSERT");
    }
    if (/\busers\b/i.test(bare)) {
      throw new Error("No se permite operar sobre la tabla users");
    }
    // El uuid del usuario NO lo pone el modelo: debe usar la variable @uid,
    // que el backend fija a partir del token en cada INSERT.
    if (/insert\s+into\s+`?(registros|categorias)`?/i.test(bare) && !/@uid\b/.test(bare)) {
      throw new Error(
        "Usa la variable @uid como valor de la columna 'user' (no un uuid literal)"
      );
    }
  } else {
    if (!/^\s*(select|with)\b/i.test(bare)) {
      throw new Error("Solo se permiten consultas SELECT");
    }
    if (/\busers\b/i.test(bare) && /\bpassword\b/i.test(bare)) {
      throw new Error("No se permite leer la columna password de users");
    }
  }

  if (FORBIDDEN.test(bare)) {
    throw new Error("La consulta contiene una operación no permitida");
  }
  if (SYSTEM_SCHEMAS.test(bare)) {
    throw new Error("No se permite operar sobre esquemas del sistema");
  }
  return sql;
}

function enforceLimit(sql) {
  return /\blimit\s+\d/i.test(stripLiterals(sql)) ? sql : `${sql}\nLIMIT ${MAX_ROWS}`;
}

// Ejecuta una SELECT validada y devuelve las filas (con tope de MAX_ROWS).
async function runSelect(rawSql) {
  const sql = enforceLimit(validateQuery(rawSql));
  const [rows] = await db.query({ sql, timeout: STATEMENT_TIMEOUT_MS });
  const arr = Array.isArray(rows) ? rows : [rows];
  return {
    sql,
    rows: arr.slice(0, MAX_ROWS),
    truncated: arr.length > MAX_ROWS,
  };
}

// Ejecuta un INSERT validado. El uuid del usuario autenticado se expone al
// INSERT como la variable de sesión @uid (fijada por el backend a partir del
// token, nunca por el modelo), sobre la misma conexión.
async function runInsert(rawSql, userUuid) {
  const sql = validateQuery(rawSql, "insert");
  const conn = await db.getConnection();
  try {
    await conn.query("SET @uid = ?", [userUuid || null]);
    const [result] = await conn.query({ sql, timeout: STATEMENT_TIMEOUT_MS });
    return {
      sql,
      affectedRows: result.affectedRows ?? 0,
      insertId: result.insertId || null,
    };
  } finally {
    conn.release();
  }
}

module.exports = { validateQuery, runSelect, runInsert, MAX_ROWS };

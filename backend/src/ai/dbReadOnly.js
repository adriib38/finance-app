const mysql = require("mysql2");
require("dotenv").config();

// Pool separado para la tool del bot. Usa un usuario de SOLO LECTURA si está
// configurado (DB_RO_USER / DB_RO_PASSWORD); si no, cae al usuario principal
// con un aviso — para producción hay que crear el usuario RO:
//
//   CREATE USER 'finance_ro'@'%' IDENTIFIED BY '<pass>';
//   GRANT SELECT ON finance.* TO 'finance_ro'@'%';
//
const roUser = process.env.DB_RO_USER;
const roPass = process.env.DB_RO_PASSWORD;

if (!roUser) {
  console.warn(
    "[ai] DB_RO_USER no definido: la tool SQL usará el usuario principal " +
      "(con permisos de escritura). Crea un usuario de solo lectura para producción."
  );
} else if (!roPass) {
  console.warn(
    "[ai] DB_RO_USER está definido pero DB_RO_PASSWORD está vacío: la conexión " +
      "de solo lectura probablemente fallará. Rellena DB_RO_PASSWORD en el .env."
  );
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: roUser || process.env.DB_USER,
  password: roUser ? roPass || "" : process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  multipleStatements: false, // defensa extra: nunca varias sentencias
});

module.exports = pool.promise();

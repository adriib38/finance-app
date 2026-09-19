const mysql = require('mysql2');

require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Las columnas DATE (solo `registros.fecha`) viajan como 'YYYY-MM-DD' tal
  // cual, sin pasar por un objeto Date: mysql2 construye ese Date a
  // medianoche en la hora local del servidor y al serializarlo a JSON se
  // convierte a UTC, desplazando el día en zonas con offset positivo. Los
  // DATETIME/TIMESTAMP (created_at, updated_at) no se tocan.
  dateStrings: ['DATE'],
});

// Export the pool instead of a single connection
module.exports = pool;
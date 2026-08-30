const db = require("../database");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// App de un solo usuario: sólo lectura de la cuenta y verificación de contraseña.
// El alta del usuario admin se hace en src/seedAdmin.js al arrancar el servidor.
class User {
  static validatePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  static getUserByUsername(username, callback) {
    if (!username) {
      const error = new Error("Missing required fields");
      console.error("Error getting user:", error);
      return callback(error, null);
    }

    db.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
      (err, results) => {
        if (err) {
          console.error("Error getting user:", err);
          return callback(err, null);
        } else {
          return callback(null, results[0]);
        }
      }
    );
  }

  static getUserByUuid(uuid, callback) {
    if (!uuid) {
      const error = new Error("Missing required fields");
      console.error("Error getting user:", error);
      return callback(error, null);
    }

    db.query(
      "SELECT username, created_at FROM users WHERE uuid = ?",
      [uuid],
      (err, results) => {
        if (err) {
          console.error("Error getting user:", err);
          return callback(err, null);
        } else {
          return callback(null, results[0]);
        }
      }
    );
  }
}

module.exports = User;

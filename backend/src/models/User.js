const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../sequelize");
require("dotenv").config();

const UserModel = sequelize.define(
  "User",
  {
    uuid: { type: DataTypes.STRING(36), primaryKey: true },
    username: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  { tableName: "users" }
);

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

    UserModel.findOne({ where: { username }, raw: true })
      .then((result) => callback(null, result || undefined))
      .catch((err) => {
        console.error("Error getting user:", err);
        callback(err, null);
      });
  }

  static getUserByUuid(uuid, callback) {
    if (!uuid) {
      const error = new Error("Missing required fields");
      console.error("Error getting user:", error);
      return callback(error, null);
    }

    UserModel.findOne({
      where: { uuid },
      attributes: ["uuid", "username", "created_at"],
      raw: true,
    })
      .then((result) => callback(null, result || undefined))
      .catch((err) => {
        console.error("Error getting user:", err);
        callback(err, null);
      });
  }
}

module.exports = User;

const { v4: uuid } = require("uuid");
const { DataTypes, Sequelize } = require("sequelize");
const sequelize = require("../sequelize");

const RegistroModel = sequelize.define(
  "Registro",
  {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    concepto: { type: DataTypes.STRING(255), allowNull: true },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    categoria: { type: DataTypes.STRING(100), allowNull: true },
    categoria_id: { type: DataTypes.STRING(36), allowNull: true },
    tipo: { type: DataTypes.STRING(20), allowNull: true },
    cantidad: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.fn("CURDATE"),
    },
    user: { type: DataTypes.STRING(36), allowNull: false },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  { tableName: "registros" }
);

const REGISTROS_FROM_USER_ATTRS = [
  "id",
  "concepto",
  "observaciones",
  "tipo",
  "cantidad",
  "categoria",
  "categoria_id",
  "fecha",
  "created_at",
  "updated_at",
];

class Registro {
  static getAllRegistros(callback) {
    RegistroModel.findAll({ raw: true })
      .then((results) => callback(null, results))
      .catch((err) => callback(err, null));
  }

  static getRegistroById(id, callback) {
    RegistroModel.findOne({ where: { id }, raw: true })
      .then((result) => callback(null, result || undefined))
      .catch((err) => callback(err, null));
  }

  static getRegistroByCategory(categoria, callback) {
    RegistroModel.findAll({ where: { categoria }, raw: true })
      .then((results) => callback(null, results))
      .catch((err) => callback(err, null));
  }

  static updateRegistro(id, newRegistro, callback) {
    const columns = [
      "concepto",
      "observaciones",
      "categoria",
      "categoria_id",
      "tipo",
      "cantidad",
      "fecha",
    ];

    const values = {};
    for (const col of columns) {
      if (newRegistro[col] !== undefined) {
        values[col] = newRegistro[col];
      }
    }

    if (Object.keys(values).length === 0) {
      return callback(null, { affectedRows: 0 });
    }

    RegistroModel.update(values, { where: { id } })
      .then(([affectedRows]) => callback(null, { affectedRows }))
      .catch((err) => callback(err, null));
  }

  static createRegistro(newRegistro, userUuid, callback) {
    const nuevoId = uuid();

    const {
      concepto,
      observaciones,
      categoria,
      categoria_id = null,
      tipo,
      cantidad,
      // Fecha real del movimiento; si no llega, el DEFAULT de la columna la
      // fija a hoy (alta con fecha implícita).
      fecha = null,
    } = newRegistro;

    const data = {
      id: nuevoId,
      concepto,
      observaciones,
      categoria,
      categoria_id,
      tipo,
      cantidad,
      user: userUuid,
    };
    if (fecha !== null) data.fecha = fecha;

    RegistroModel.create(data)
      .then(() => {
        const nuevoRegistro = {
          id: nuevoId,
          concepto,
          observaciones,
          categoria,
          categoria_id,
          tipo,
          cantidad,
          fecha,
          userUuid,
        };
        callback(null, nuevoRegistro);
      })
      .catch((err) => {
        console.error("Error al crear el registro:", err);
        callback(err, null);
      });
  }

  static deleteRegistro(id, callback) {
    RegistroModel.destroy({ where: { id } })
      .then((affectedRows) => callback(null, { affectedRows }))
      .catch((err) => {
        console.error("Error al eliminar el registro:", err);
        callback(err, null);
      });
  }

  static getRegistrosFromUser(userUuid, callback) {
    RegistroModel.findAll({
      where: { user: userUuid },
      attributes: REGISTROS_FROM_USER_ATTRS,
      raw: true,
    })
      .then((results) => callback(null, results))
      .catch((err) => callback(err, null));
  }
}

Registro.Model = RegistroModel;
module.exports = Registro;

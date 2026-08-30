const { v4: uuid } = require("uuid");
const db = require("../database");

class Registro {
  constructor(registro) {
    this.concepto = uuid();
    this.observaciones = registro.observaciones;
    this.categoria = registro.categoria;
    this.tipo = registro.tipo;
    this.cantidad = registro.cantidad;
  }

  static getAllRegistros(callback) {
    db.query(`SELECT * FROM registros`, (err, results) => {
      callback(err, results);
    });
  }

  static getRegistroById(id, callback) {
    db.query(`SELECT * FROM registros WHERE id = ?`, [id], (err, results) => {
      callback(err, results[0]);
    });
  }

  static getRegistroByCategory(categoria, callback) {
    db.query(
      `SELECT * FROM registros WHERE categoria = ?`,
      [categoria],
      (err, results) => {
        callback(err, results);
      }
    );
  }

  static updateRegistro(id, newRegistro, callback) {
    const columns = [
      "concepto",
      "observaciones",
      "categoria",
      "categoria_id",
      "tipo",
      "cantidad",
    ];

    const sets = [];
    const params = [];
    for (const col of columns) {
      if (newRegistro[col] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(newRegistro[col]);
      }
    }

    if (sets.length === 0) {
      return callback(null, { affectedRows: 0 });
    }

    params.push(id);
    const query = `UPDATE registros SET ${sets.join(", ")} WHERE id = ?`;

    db.query(query, params, (err, results) => {
      callback(err, results);
    });
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
    } = newRegistro;

    const query =
      "INSERT INTO registros (id, concepto, observaciones, categoria, categoria_id, tipo, cantidad, user) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    const params = [
      nuevoId,
      concepto,
      observaciones,
      categoria,
      categoria_id,
      tipo,
      cantidad,
      userUuid,
    ];

    db.query(query, params, (err, results) => {
      if (err) {
        console.error("Error al crear el registro:", err);
        callback(err, null);
      } else {
        const nuevoRegistro = {
          id: nuevoId,
          concepto,
          observaciones,
          categoria,
          categoria_id,
          tipo,
          cantidad,
          userUuid,
        };
        callback(null, nuevoRegistro);
      }
    });
  }

  static deleteRegistro(id, callback) {
    const query = `DELETE FROM registros WHERE id = ?`;
    db.query(query, id, (err, results) => {
      if (err) {
        console.error("Error al eliminar el registro:", err);
        callback(err, null);
      } else {
        callback(null, results);
      }
    });

  }

  static getRegistrosFromUser(userUuid, callback) {
    const query = `SELECT id, concepto, observaciones, tipo, cantidad, categoria, categoria_id, created_at, updated_at FROM registros WHERE user = ?`;
    db.query(query, userUuid, (err, results) => {
      if(err) {
        callback(err, null);
      } else {
        callback(null, results);
      }
    });
  }
}

module.exports = Registro;

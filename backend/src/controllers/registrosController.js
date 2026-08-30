const Registro = require("../models/Registro");
const Categoria = require("../models/Categoria");

// Resuelve el par (categoria_id, categoria texto) a partir de lo que llegue en
// el body. Si viene categoria_id se usa su nombre como texto denormalizado.
async function resolveCategoria(body, userUuid) {
  if (body.categoria_id) {
    const cat = await Categoria.getById(body.categoria_id, userUuid);
    if (!cat) {
      const err = new Error("categoria_id no encontrada");
      err.status = 400;
      throw err;
    }
    return { categoria_id: cat.id, categoria: cat.nombre, tipo: cat.tipo };
  }
  if (body.categoria !== undefined) {
    return { categoria_id: null, categoria: body.categoria };
  }
  return {};
}


const getAllRegistros = (req, res) => {
  Registro.getAllRegistros((err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error getting registros", error: err });
    } else {
      return res.status(200).json(results);
    }
  });
};

const getRegistroById = (req, res) => {
  Registro.getRegistroById(req.params.id, (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error getting registro", error: err });
    } else {
      return res.status(200).json(results);
    }
  });
};

const getRegistroByCategory = (req, res) => {
  Registro.getRegistroByCategory(req.params.categoria, (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error getting registros", error: err });
    } else {
      return res.status(200).json(results);
    }
  });
};

const updateRegistro = async (req, res) => {
  const { body } = req;
  const { id } = req.params;
  const userIdFromToken = req.userUuid;

  if (
    !body.concepto &&
    !body.observaciones &&
    !body.categoria &&
    !body.categoria_id &&
    !body.tipo &&
    !body.cantidad
  ) {
    return res
      .status(400)
      .send({ status: "ERROR", data: "No fields provided for update" });
  }

  const newRegistro = {};

  if (body.concepto !== undefined) {
    newRegistro.concepto = body.concepto;
  }

  if (body.observaciones !== undefined) {
    newRegistro.observaciones = body.observaciones;
  }

  try {
    const cat = await resolveCategoria(body, userIdFromToken);
    if (cat.categoria !== undefined) newRegistro.categoria = cat.categoria;
    if (cat.categoria_id !== undefined) newRegistro.categoria_id = cat.categoria_id;
  } catch (e) {
    return res.status(e.status || 500).json({ message: e.message });
  }

  if (body.tipo !== undefined) {
    newRegistro.tipo = body.tipo;
  }

  if (body.cantidad !== undefined) {
    newRegistro.cantidad = body.cantidad;
  }

  Registro.getRegistroById(id, (err, registro) => {
    if (err) {
      return res.status(500).json({ message: "Error getting registro", error: err });
    }

    if (!registro) {
      return res.status(404).json({ message: "Registro not found" });
    }
    
    if (registro.user !== userIdFromToken) {
      return res.status(403).json({ message: "You are not authorized to update this registro" });
    }
    
    Registro.updateRegistro(req.params.id, newRegistro, (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error updating registros", error: err });
      } else {
        return res
          .status(200)
          .json({ message: "Updated succesfull", newRegistro });
      }
    });
  });
};

const createRegistro = async (req, res) => {
  const { body } = req;
  if (
    !body.concepto ||
    !body.observaciones ||
    !body.categoria_id ||
    !body.tipo ||
    !body.cantidad
  ) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  let cat;
  try {
    cat = await resolveCategoria(body, req.userUuid);
  } catch (e) {
    return res.status(e.status || 500).json({ message: e.message });
  }

  if (cat.tipo && cat.tipo !== body.tipo) {
    return res
      .status(400)
      .json({ message: "La categoría no corresponde al tipo del registro" });
  }

  const newRegistro = {
    concepto: body.concepto,
    observaciones: body.observaciones,
    categoria: cat.categoria,
    categoria_id: cat.categoria_id ?? null,
    tipo: body.tipo,
    cantidad: body.cantidad,
  };

  Registro.createRegistro(newRegistro, req.userUuid, (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error creating registro", error: err });
    } else {
      return res
        .status(201)
        .json({ message: "Created succesfull", newRegistro });
    }
  });
};

const deleteRegistro = async (req, res) => {
  const { id } = req.params;
  const userIdFromToken = req.userUuid;
  try {
    Registro.getRegistroById(id, (err, registro) => {
      if (err) {
        return res.status(500).json({ message: "Error getting registro", error: err });
      }

      if (!registro) {
        return res.status(404).json({ message: "Registro not found" });
      }

      //User and author are not the same
      if (registro.user !== userIdFromToken) {
        return res.status(403).json({ message: "You are not authorized to delete this registro" });
      }

      Registro.deleteRegistro(id, (err, result) => {
        if (err) {
          return res.status(500).json({ message: "Error deleting registro", error: err });
        }
        return res.status(200).json({ message: "Registro deleted successfully" });
      });
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error });
  }
};


const getRegistrosFromUser = (req, res) => {
  Registro.getRegistrosFromUser(req.userUuid, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error getting registros" });
    } else {
      return res.status(200).json(results);
    }
  });
};


module.exports = {
  getRegistroById,
  getRegistroByCategory,
  getAllRegistros,
  updateRegistro,
  createRegistro,
  deleteRegistro,
  getRegistrosFromUser
};

const Categoria = require("../models/Categoria");

const HEX = /^#[0-9a-fA-F]{6}$/;

const getCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.getAll(req.userUuid, {
      tipo: req.query.tipo,
    });
    return res.status(200).json(categorias);
  } catch (err) {
    console.error("Error getting categorias:", err);
    return res.status(500).json({ message: "Error getting categorias" });
  }
};

const createCategoria = async (req, res) => {
  const { nombre, tipo, color } = req.body;

  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: "El nombre es requerido" });
  }
  if (!Categoria.TIPOS.includes(tipo)) {
    return res.status(400).json({ message: "tipo debe ser 'gasto' o 'ingreso'" });
  }
  if (color && !HEX.test(color)) {
    return res.status(400).json({ message: "color debe ser un hex #rrggbb" });
  }

  try {
    const categoria = await Categoria.create({ nombre, tipo, color }, req.userUuid);
    return res.status(201).json(categoria);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Ya existe una categoría con ese nombre y tipo" });
    }
    console.error("Error creating categoria:", err);
    return res.status(500).json({ message: "Error creating categoria" });
  }
};

const updateCategoria = async (req, res) => {
  const { nombre, color, activa, orden } = req.body;
  const fields = {};

  if (nombre !== undefined) {
    if (!String(nombre).trim()) {
      return res.status(400).json({ message: "El nombre no puede estar vacío" });
    }
    fields.nombre = nombre;
  }
  if (color !== undefined) {
    if (color !== null && !HEX.test(color)) {
      return res.status(400).json({ message: "color debe ser un hex #rrggbb" });
    }
    fields.color = color;
  }
  if (activa !== undefined) fields.activa = activa ? 1 : 0;
  if (orden !== undefined) fields.orden = Number(orden);

  try {
    const existing = await Categoria.getById(req.params.id, req.userUuid);
    if (!existing) return res.status(404).json({ message: "Categoría no encontrada" });

    const categoria = await Categoria.update(req.params.id, req.userUuid, fields);

    // Mantener sincronizado el texto denormalizado en registros.
    if (fields.nombre && fields.nombre !== existing.nombre) {
      const pool = require("../database").promise();
      await pool.query(
        `UPDATE registros SET categoria = ? WHERE categoria_id = ? AND user = ?`,
        [categoria.nombre, categoria.id, req.userUuid]
      );
    }

    return res.status(200).json(categoria);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Ya existe una categoría con ese nombre y tipo" });
    }
    console.error("Error updating categoria:", err);
    return res.status(500).json({ message: "Error updating categoria" });
  }
};

const deleteCategoria = async (req, res) => {
  try {
    const ok = await Categoria.remove(req.params.id, req.userUuid);
    if (!ok) return res.status(404).json({ message: "Categoría no encontrada" });
    return res.status(200).json({ message: "Categoría eliminada" });
  } catch (err) {
    console.error("Error deleting categoria:", err);
    return res.status(500).json({ message: "Error deleting categoria" });
  }
};

const mergeCategoria = async (req, res) => {
  const { sourceId } = req.body;
  const targetId = req.params.id;
  if (!sourceId) {
    return res.status(400).json({ message: "sourceId es requerido" });
  }
  try {
    const categoria = await Categoria.merge(sourceId, targetId, req.userUuid);
    return res.status(200).json(categoria);
  } catch (err) {
    console.error("Error merging categoria:", err);
    return res.status(400).json({ message: err.message || "Error al fusionar" });
  }
};

module.exports = {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  mergeCategoria,
};

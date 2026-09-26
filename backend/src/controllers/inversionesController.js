const Inversion = require("../models/Inversion");

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function readRange(req) {
  const range = {};
  if (ISO_DATE.test(req.query.from || "")) range.from = req.query.from;
  if (ISO_DATE.test(req.query.to || "")) range.to = req.query.to;
  return range;
}

const getInversiones = async (req, res) => {
  try {
    const inversiones = await Inversion.getAll(req.userUuid, {
      ...readRange(req),
      ticker: req.query.ticker,
    });
    return res.status(200).json(inversiones);
  } catch (err) {
    console.error("Error getting inversiones:", err);
    return res.status(500).json({ message: "Error getting inversiones" });
  }
};

const getResumen = async (req, res) => {
  try {
    const resumen = await Inversion.getResumen(req.userUuid);
    return res.status(200).json(resumen);
  } catch (err) {
    console.error("Error getting resumen de inversiones:", err);
    return res.status(500).json({ message: "Error getting resumen de inversiones" });
  }
};

const getTimeline = async (req, res) => {
  try {
    const data = await Inversion.getAportacionesMensuales(req.userUuid);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error getting timeline de inversiones:", err);
    return res.status(500).json({ message: "Error getting timeline de inversiones" });
  }
};

const validarCampos = ({ ticker, tipo, participaciones, precio_compra }) => {
  if (!ticker || !String(ticker).trim()) return "El ticker es requerido";
  if (!Inversion.TIPOS.includes(tipo)) return "tipo debe ser 'accion' o 'etf'";
  if (!(Number(participaciones) > 0)) return "participaciones debe ser mayor que 0";
  if (!(Number(precio_compra) > 0)) return "precio_compra debe ser mayor que 0";
  return null;
};

const createInversion = async (req, res) => {
  const { ticker, nombre, tipo, participaciones, precio_compra, fecha, observaciones } = req.body;

  const error = validarCampos(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const inversion = await Inversion.create(
      { ticker, nombre, tipo, participaciones, precio_compra, fecha, observaciones },
      req.userUuid
    );
    return res.status(201).json(inversion);
  } catch (err) {
    console.error("Error creating inversion:", err);
    return res.status(500).json({ message: "Error creating inversion" });
  }
};

const updateInversion = async (req, res) => {
  const { ticker, nombre, tipo, participaciones, precio_compra, fecha, observaciones } = req.body;
  const fields = {};

  if (ticker !== undefined) {
    if (!String(ticker).trim()) return res.status(400).json({ message: "El ticker no puede estar vacío" });
    fields.ticker = ticker;
  }
  if (tipo !== undefined) {
    if (!Inversion.TIPOS.includes(tipo)) return res.status(400).json({ message: "tipo debe ser 'accion' o 'etf'" });
    fields.tipo = tipo;
  }
  if (participaciones !== undefined) {
    if (!(Number(participaciones) > 0)) return res.status(400).json({ message: "participaciones debe ser mayor que 0" });
    fields.participaciones = participaciones;
  }
  if (precio_compra !== undefined) {
    if (!(Number(precio_compra) > 0)) return res.status(400).json({ message: "precio_compra debe ser mayor que 0" });
    fields.precio_compra = precio_compra;
  }
  if (nombre !== undefined) fields.nombre = nombre;
  if (fecha !== undefined) fields.fecha = fecha;
  if (observaciones !== undefined) fields.observaciones = observaciones;

  try {
    const inversion = await Inversion.update(req.params.id, req.userUuid, fields);
    if (!inversion) return res.status(404).json({ message: "Inversión no encontrada" });
    return res.status(200).json(inversion);
  } catch (err) {
    console.error("Error updating inversion:", err);
    return res.status(500).json({ message: "Error updating inversion" });
  }
};

const deleteInversion = async (req, res) => {
  try {
    const ok = await Inversion.remove(req.params.id, req.userUuid);
    if (!ok) return res.status(404).json({ message: "Inversión no encontrada" });
    return res.status(200).json({ message: "Inversión eliminada" });
  } catch (err) {
    console.error("Error deleting inversion:", err);
    return res.status(500).json({ message: "Error deleting inversion" });
  }
};

module.exports = {
  getInversiones,
  getResumen,
  getTimeline,
  createInversion,
  updateInversion,
  deleteInversion,
};

const Suscripcion = require("../models/Suscripcion");
const Categoria = require("../models/Categoria");
const { proximaFechaCobro } = require("../utils/fechasRecurrentes");

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function conProximoCargo(susc) {
  return {
    ...susc,
    proximoCargo: susc.activa ? proximaFechaCobro(susc.dia_pago) : null,
  };
}

const getSuscripciones = async (req, res) => {
  try {
    const suscripciones = await Suscripcion.getAll(req.userUuid);
    return res.status(200).json(suscripciones.map(conProximoCargo));
  } catch (err) {
    console.error("Error getting suscripciones:", err);
    return res.status(500).json({ message: "Error getting suscripciones" });
  }
};

async function validarCampos(body, userUuid, { parcial = false } = {}) {
  const { nombre, categoria_id, tipo, cantidad, dia_pago, fecha_inicio, fecha_fin } = body;

  if (!parcial || nombre !== undefined) {
    if (!nombre || !String(nombre).trim()) {
      return "El nombre es requerido";
    }
  }
  if (!parcial || tipo !== undefined) {
    if (!Suscripcion.TIPOS.includes(tipo)) {
      return "tipo debe ser 'gasto' o 'ingreso'";
    }
  }
  if (!parcial || cantidad !== undefined) {
    if (cantidad === undefined || Number.isNaN(Number(cantidad)) || Number(cantidad) <= 0) {
      return "cantidad debe ser un número mayor que 0";
    }
  }
  if (!parcial || dia_pago !== undefined) {
    const dia = Number(dia_pago);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      return "dia_pago debe ser un entero entre 1 y 31";
    }
  }
  if (!parcial) {
    if (!fecha_inicio || !ISO_DATE.test(fecha_inicio)) {
      return "fecha_inicio es requerida en formato YYYY-MM-DD";
    }
  }
  if (fecha_fin !== undefined && fecha_fin !== null) {
    if (!ISO_DATE.test(fecha_fin)) {
      return "fecha_fin debe tener formato YYYY-MM-DD";
    }
  }
  if (categoria_id) {
    const cat = await Categoria.getById(categoria_id, userUuid);
    if (!cat) return "categoria_id no encontrada";
    if (tipo && cat.tipo !== tipo) {
      return "La categoría no corresponde al tipo de la suscripción";
    }
  }
  return null;
}

const createSuscripcion = async (req, res) => {
  const error = await validarCampos(req.body, req.userUuid);
  if (error) return res.status(400).json({ message: error });

  try {
    const suscripcion = await Suscripcion.create(req.body, req.userUuid);
    return res.status(201).json(conProximoCargo(suscripcion));
  } catch (err) {
    console.error("Error creating suscripcion:", err);
    return res.status(500).json({ message: "Error creating suscripcion" });
  }
};

const updateSuscripcion = async (req, res) => {
  const existing = await Suscripcion.getById(req.params.id, req.userUuid);
  if (!existing) {
    return res.status(404).json({ message: "Suscripción no encontrada" });
  }

  const error = await validarCampos(req.body, req.userUuid, { parcial: true });
  if (error) return res.status(400).json({ message: error });

  const { nombre, categoria_id, tipo, cantidad, dia_pago, fecha_fin, activa } = req.body;
  const fields = {};
  if (nombre !== undefined) fields.nombre = nombre;
  if (categoria_id !== undefined) fields.categoria_id = categoria_id;
  if (tipo !== undefined) fields.tipo = tipo;
  if (cantidad !== undefined) fields.cantidad = cantidad;
  if (dia_pago !== undefined) fields.dia_pago = Number(dia_pago);
  if (fecha_fin !== undefined) fields.fecha_fin = fecha_fin;
  if (activa !== undefined) fields.activa = activa ? 1 : 0;

  try {
    const suscripcion = await Suscripcion.update(req.params.id, req.userUuid, fields);
    return res.status(200).json(conProximoCargo(suscripcion));
  } catch (err) {
    console.error("Error updating suscripcion:", err);
    return res.status(500).json({ message: "Error updating suscripcion" });
  }
};

const deleteSuscripcion = async (req, res) => {
  try {
    const ok = await Suscripcion.remove(req.params.id, req.userUuid);
    if (!ok) return res.status(404).json({ message: "Suscripción no encontrada" });
    return res.status(200).json({ message: "Suscripción eliminada" });
  } catch (err) {
    console.error("Error deleting suscripcion:", err);
    return res.status(500).json({ message: "Error deleting suscripcion" });
  }
};

module.exports = {
  getSuscripciones,
  createSuscripcion,
  updateSuscripcion,
  deleteSuscripcion,
};

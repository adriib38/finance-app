const statsRegistrosService = require('../services/statsRegistrosService');

// Lee el rango de fechas opcional de la query (?from=YYYY-MM-DD&to=YYYY-MM-DD).
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function readRange(req) {
  const range = {};
  if (ISO_DATE.test(req.query.from || "")) range.from = req.query.from;
  if (ISO_DATE.test(req.query.to || "")) range.to = req.query.to;
  return range;
}

const getStats = async (req, res) => {
  try {
    const stats = await statsRegistrosService.getStats(req.userUuid, readRange(req));
    res.send( stats )
  } catch (error) {
    console.error("Error al obtener stats:", error);
    res.status(500).send({ status: 'ERROR', message: 'Error al obtener stats' });
  }
}

const getCantidadCategoriasGastos= async (req, res) => {
  try {
    const stats = await statsRegistrosService.getCantidadCategoriasTipo(req.userUuid, 'gasto', readRange(req));
    res.send( stats )
  } catch (error) {
    console.error("Error al obtener stats:", error);
    res.status(500).send({ message: 'Error al obtener stats' });
  }
}

const getCantidadCategoriasIngresos= async (req, res) => {
  try {
    const stats = await statsRegistrosService.getCantidadCategoriasTipo(req.userUuid, 'ingreso', readRange(req));
    res.send( stats )
  } catch (error) {
    console.error("Error al obtener stats:", error);
    res.status(500).send({ status: 'ERROR', message: 'Error al obtener stats' });
  }
}

const getTimeline = async (req, res) => {
  try {
    const data = await statsRegistrosService.getTimeline(req.userUuid, readRange(req));
    res.send(data)
  } catch (error) {
    console.error("Error al obtener timeline:", error);
    res.status(500).send({ message: 'Error al obtener timeline' });
  }
}

module.exports = {
  getStats,
  getCantidadCategoriasGastos,
  getCantidadCategoriasIngresos,
  getTimeline
};

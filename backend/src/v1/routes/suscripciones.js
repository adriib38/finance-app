const express = require("express");
const suscripcionesController = require("../../controllers/suscripcionesController");
const router = express.Router();

const verifyToken = require("../../controllers/middlewares/verifyJWT.js");

router
  .get("/", verifyToken, suscripcionesController.getSuscripciones)
  .post("/", verifyToken, suscripcionesController.createSuscripcion)
  .put("/:id", verifyToken, suscripcionesController.updateSuscripcion)
  .delete("/:id", verifyToken, suscripcionesController.deleteSuscripcion);

module.exports = router;

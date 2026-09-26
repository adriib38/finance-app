const express = require("express");
const inversionesController = require("../../controllers/inversionesController");
const router = express.Router();

const verifyToken = require("../../controllers/middlewares/verifyJWT.js");

router
  .get("/", verifyToken, inversionesController.getInversiones)
  .post("/", verifyToken, inversionesController.createInversion)
  .get("/resumen", verifyToken, inversionesController.getResumen)
  .get("/timeline", verifyToken, inversionesController.getTimeline)
  .put("/:id", verifyToken, inversionesController.updateInversion)
  .delete("/:id", verifyToken, inversionesController.deleteInversion);

module.exports = router;

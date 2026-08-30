const express = require("express");
const categoriasController = require("../../controllers/categoriasController");
const router = express.Router();

const verifyToken = require("../../controllers/middlewares/verifyJWT.js");

router
  .get("/", verifyToken, categoriasController.getCategorias)
  .post("/", verifyToken, categoriasController.createCategoria)
  .put("/:id", verifyToken, categoriasController.updateCategoria)
  .delete("/:id", verifyToken, categoriasController.deleteCategoria)
  .post("/:id/merge", verifyToken, categoriasController.mergeCategoria);

module.exports = router;

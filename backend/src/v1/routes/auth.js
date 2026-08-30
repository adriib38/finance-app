const express = require("express");
const authController = require("../../controllers/authController");
const router = express.Router();

const verifyToken = require("../../controllers/middlewares/verifyJWT.js");

// App de un solo usuario: no hay alta ni baja de cuentas.
router
  .post("/signin", authController.signin)
  .post("/signout", authController.signout)
  .get("/user", verifyToken, authController.getUserByUuid)

module.exports = router;

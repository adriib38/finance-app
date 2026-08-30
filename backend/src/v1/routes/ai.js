const express = require("express");
const { ask } = require("../../ai/askController");
const router = express.Router();

const verifyToken = require("../../controllers/middlewares/verifyJWT.js");

router.post("/ask", verifyToken, ask);

module.exports = router;

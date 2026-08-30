const OpenAI = require("openai");
require("dotenv").config();

// Modelo por defecto: barato y de sobra para text-to-SQL sobre este esquema.
// Configurable con AI_MODEL en el .env (p. ej. "gpt-4o").
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

let _client = null;

// Cliente perezoso: no revienta el arranque del servidor si falta la API key.
function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error("OPENAI_API_KEY no está definida");
    err.code = "NO_API_KEY";
    throw err;
  }
  if (!_client) {
    _client = new OpenAI(); // lee OPENAI_API_KEY del entorno
  }
  return _client;
}

module.exports = { getClient, MODEL };

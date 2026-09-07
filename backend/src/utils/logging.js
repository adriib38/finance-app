// Logger mínimo sobre console con prefijo y timestamp.
// Uso: const logging = require("../utils/logging"); logging.info("mensaje", dato);

function ts() {
  return new Date().toISOString();
}

module.exports = {
  info: (...args) => console.log(`[${ts()}] [INFO]`, ...args),
  warn: (...args) => console.warn(`[${ts()}] [WARN]`, ...args),
  error: (...args) => console.error(`[${ts()}] [ERROR]`, ...args),
};

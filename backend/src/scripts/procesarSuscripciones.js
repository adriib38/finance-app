/**
 * Ejecuta manualmente el motor de reconciliación de suscripciones (ver
 * src/suscripciones/procesarSuscripciones.js), sin esperar al arranque del
 * servidor ni al intervalo periódico.
 *
 *   node src/scripts/procesarSuscripciones.js
 */
const procesarSuscripciones = require("../suscripciones/procesarSuscripciones");

procesarSuscripciones()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

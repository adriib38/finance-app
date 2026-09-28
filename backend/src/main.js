const app = require("./app");
const runMigrations = require("./migrate");
const seedAdmin = require("./seedAdmin");
const seedCategorias = require("./seedCategorias");
const procesarSuscripciones = require("./suscripciones/procesarSuscripciones");
require("dotenv").config();

// Cada cuánto se reintenta el motor de suscripciones mientras el proceso
// sigue vivo (además de una vez al arrancar). No hace falta más precisión que
// esta para una app de un solo usuario: es barato (un par de SELECT si no hay
// nada pendiente) e idempotente, así que da igual si se solapa con el
// arranque o con otra ejecución.
const SUSCRIPCIONES_INTERVALO_MS = 60 * 60 * 1000; // 1 hora

async function init() {
  try {
    // Aplica las migraciones de esquema pendientes.
    await runMigrations();

    // Asegura que sólo exista el usuario admin antes de aceptar peticiones.
    await seedAdmin();

    // Categorías base (idempotente).
    await seedCategorias();

    // Genera los cargos de suscripciones pendientes (incluye los que se
    // hayan perdido mientras el servidor estaba parado).
    await procesarSuscripciones();

    //Run server
    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    console.log(`✓ Server on port ${port}`);

    // Repite la comprobación mientras el proceso siga vivo, para que las
    // suscripciones se generen el mismo día de pago aunque el servidor no se
    // reinicie durante meses.
    setInterval(() => {
      procesarSuscripciones().catch((err) =>
        console.error("Error procesando suscripciones:", err)
      );
    }, SUSCRIPCIONES_INTERVALO_MS);
  } catch (error) {
    console.error("Error starting server: ", error);
    process.exit(1);
  }
}

init();

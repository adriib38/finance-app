const app = require("./app");
const runMigrations = require("./migrate");
const seedAdmin = require("./seedAdmin");
const seedCategorias = require("./seedCategorias");
require("dotenv").config();

async function init() {
  try {
    // Aplica las migraciones de esquema pendientes.
    await runMigrations();

    // Asegura que sólo exista el usuario admin antes de aceptar peticiones.
    await seedAdmin();

    // Categorías base (idempotente).
    await seedCategorias();

    //Run server
    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    console.log(`✓ Server on port ${port}`);
  } catch (error) {
    console.error("Error starting server: ", error);
    process.exit(1);
  }
}

init();

const pool = require("../database");
const { v4: uuid } = require("uuid");
require("dotenv").config();

// Mismo UUID fijo que seedAdmin/seedCategorias.
const ADMIN_UUID = "00000000-0000-0000-0000-000000000001";

// Registros ficticios para probar la UI/stats con un mes completo de datos:
// un set fijo y realista (no aleatorio) de octubre 2026, a diferencia de
// src/scripts/seedTestData.js (genera N registros aleatorios repartidos por
// todo 2026). Usa este cuando quieras datos deterministas y legibles para
// probar un mes concreto; usa el otro para volumen/estrés.
// `categoria` es el nombre tal cual lo sembró seedCategorias (src/seedCategorias.js).
const PERIODO_DESDE = "2026-10-01";
const PERIODO_HASTA = "2026-10-31";

const INGRESOS = [
  { concepto: "Nómina octubre", categoria: "Nómina", cantidad: 1800.0, fecha: "2026-10-01" },
  { concepto: "Proyecto diseño web", categoria: "Freelance", cantidad: 250.0, fecha: "2026-10-10" },
  { concepto: "Consultoría puntual", categoria: "Freelance", cantidad: 120.0, fecha: "2026-10-22" },
  { concepto: "Cumpleaños", categoria: "Regalos", cantidad: 50.0, fecha: "2026-10-15" },
];

const GASTOS = [
  { concepto: "Alquiler piso octubre", categoria: "Alquiler", cantidad: 650.0, fecha: "2026-10-01" },
  { concepto: "Luz y agua", categoria: "Suministros", cantidad: 85.3, fecha: "2026-10-03" },
  { concepto: "Internet y móvil", categoria: "Suministros", cantidad: 42.1, fecha: "2026-10-18" },
  { concepto: "Mercadona semanal", categoria: "Compra", cantidad: 63.45, fecha: "2026-10-02" },
  { concepto: "Mercadona semanal", categoria: "Compra", cantidad: 58.9, fecha: "2026-10-09" },
  { concepto: "Mercadona semanal", categoria: "Compra", cantidad: 71.2, fecha: "2026-10-16" },
  { concepto: "Mercadona semanal", categoria: "Compra", cantidad: 66.75, fecha: "2026-10-23" },
  { concepto: "Mercadona semanal", categoria: "Compra", cantidad: 69.0, fecha: "2026-10-30" },
  { concepto: "Abono transporte mensual", categoria: "Transporte", cantidad: 40.0, fecha: "2026-10-01" },
  { concepto: "Gasolina", categoria: "Transporte", cantidad: 15.5, fecha: "2026-10-12" },
  { concepto: "Parking", categoria: "Transporte", cantidad: 22.0, fecha: "2026-10-25" },
  { concepto: "Cine con amigos", categoria: "Ocio", cantidad: 35.0, fecha: "2026-10-05" },
  { concepto: "Concierto", categoria: "Ocio", cantidad: 28.0, fecha: "2026-10-19" },
  { concepto: "Cena fuera", categoria: "Restauración", cantidad: 24.5, fecha: "2026-10-04" },
  { concepto: "Comida rápida", categoria: "Restauración", cantidad: 18.9, fecha: "2026-10-11" },
  { concepto: "Cena cumpleaños", categoria: "Restauración", cantidad: 32.0, fecha: "2026-10-26" },
  { concepto: "Farmacia", categoria: "Salud", cantidad: 45.0, fecha: "2026-10-14" },
  { concepto: "Spotify", categoria: "Suscripciones", cantidad: 12.99, fecha: "2026-10-01" },
  { concepto: "Netflix", categoria: "Suscripciones", cantidad: 15.99, fecha: "2026-10-01" },
  { concepto: "iCloud", categoria: "Suscripciones", cantidad: 9.99, fecha: "2026-10-05" },
  { concepto: "Varios", categoria: "Otros", cantidad: 20.0, fecha: "2026-10-20" },
];

// Seed de datos de PRUEBA (octubre 2026) para el admin. Reemplaza (borra +
// reinserta) solo los registros del admin dentro de ese rango de fechas, así
// que es seguro volver a ejecutarlo. Idempotente en el sentido de "deja
// siempre el mismo set", no en el de "no duplica si ya existen": al borrar
// primero el rango, una segunda ejecución no acumula filas.
//
// GUARDARRAÍL: se niega a correr si DB_DATABASE no contiene "test", para no
// poder ensuciar por error la base de datos de producción. Pensado para
// ejecutarse con `npm run seed:demo-octubre` (carga backend/.env.test).
async function seedTestData() {
  const dbName = process.env.DB_DATABASE || "";
  if (!dbName.toLowerCase().includes("test")) {
    throw new Error(
      `DB_DATABASE="${dbName}" no parece una base de datos de pruebas (no contiene ` +
        `"test"). Aborto para no tocar producción por error. Usa ` +
        `"npm run seed:demo-octubre" (carga backend/.env.test).`
    );
  }

  const conn = pool.promise();

  await conn.query(
    `DELETE FROM registros WHERE user = ? AND fecha BETWEEN ? AND ?`,
    [ADMIN_UUID, PERIODO_DESDE, PERIODO_HASTA]
  );

  const categoriasPorClave = new Map();
  const [categorias] = await conn.query(
    `SELECT id, nombre, tipo FROM categorias WHERE user = ?`,
    [ADMIN_UUID]
  );
  for (const c of categorias) {
    categoriasPorClave.set(`${c.tipo}:${c.nombre}`, c.id);
  }

  async function insertar(tipo, registros) {
    for (const r of registros) {
      const categoriaId = categoriasPorClave.get(`${tipo}:${r.categoria}`);
      if (!categoriaId) {
        throw new Error(
          `No existe la categoría "${r.categoria}" (${tipo}) para el admin. ` +
            `Asegúrate de haber corrido seedCategorias antes.`
        );
      }
      await conn.query(
        `INSERT INTO registros (id, concepto, observaciones, categoria, categoria_id, tipo, cantidad, fecha, user)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
        [uuid(), r.concepto, r.categoria, categoriaId, tipo, r.cantidad, r.fecha, ADMIN_UUID]
      );
    }
  }

  await insertar("ingreso", INGRESOS);
  await insertar("gasto", GASTOS);

  console.log(
    `✓ Seed de prueba: ${INGRESOS.length} ingresos + ${GASTOS.length} gastos ` +
      `entre ${PERIODO_DESDE} y ${PERIODO_HASTA} (admin)`
  );
}

module.exports = seedTestData;

if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}

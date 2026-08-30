/**
 * Genera registros ficticios de prueba repartidos por todo 2026.
 *
 *   node src/scripts/seedTestData.js [n]        # añade n registros (por defecto 250)
 *   node src/scripts/seedTestData.js [n] --reset  # borra antes los ficticios previos
 *
 * Los registros ficticios llevan observaciones que empiezan por "[seed]" para
 * poder borrarlos luego sin tocar los reales.
 */
const { v4: uuid } = require("uuid");
const pool = require("../database");

const ADMIN_UUID = "00000000-0000-0000-0000-000000000001";
const SEED_TAG = "[seed]";

const CONCEPTOS = {
  Compra: ["Compra semanal Mercadona", "Supermercado Carrefour", "Frutería del barrio", "Compra Lidl", "Panadería", "Carnicería"],
  Alquiler: ["Alquiler piso", "Mensualidad alquiler"],
  Suministros: ["Factura de luz", "Factura del agua", "Factura de gas", "Internet fibra", "Cuota móvil"],
  Transporte: ["Gasolina", "Abono transporte", "Billete de tren", "Taxi", "Parking centro", "Revisión del coche", "Peaje autopista"],
  Ocio: ["Entradas cine", "Concierto", "Libros", "Videojuego", "Escapada fin de semana", "Cañas con amigos", "Museo"],
  "Restauración": ["Comida de trabajo", "Cena en restaurante", "Desayuno cafetería", "Menú del día", "Pizzas para llevar", "Brunch domingo"],
  Salud: ["Farmacia", "Dentista", "Óptica - gafas nuevas", "Fisioterapeuta", "Consulta médica", "Analítica"],
  Suscripciones: ["Netflix", "Spotify", "Amazon Prime", "Cuota gimnasio", "iCloud 200GB", "HBO Max", "Disney+"],
  "Otros-gasto": ["Regalo de cumpleaños", "Ropa de temporada", "Peluquería", "Donación ONG", "Imprevisto varios", "Material oficina"],
  "Nómina": ["Nómina mensual", "Paga extra"],
  Freelance: ["Proyecto web cliente", "Consultoría técnica", "Diseño de logo", "Mantenimiento web mensual", "Auditoría"],
  Inversiones: ["Dividendos", "Venta de acciones", "Intereses cuenta remunerada", "Reparto fondo indexado"],
  "Regalos": ["Regalo de cumpleaños", "Devolución de Hacienda", "Premio sorteo"],
  "Otros-ingreso": ["Venta segunda mano Wallapop", "Reembolso compra", "Ingreso varios"],
};

const RANGOS = {
  Compra: [12, 130], Alquiler: [600, 950], Suministros: [18, 120], Transporte: [8, 95],
  Ocio: [9, 130], "Restauración": [7, 65], Salud: [8, 160], Suscripciones: [5, 45],
  "Otros-gasto": [6, 180], "Nómina": [1400, 2200], Freelance: [180, 1600],
  Inversiones: [15, 520], "Regalos": [15, 220], "Otros-ingreso": [8, 250],
};

const rnd = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (n) => String(n).padStart(2, "0");

function fecha2026() {
  const mes = Math.floor(Math.random() * 12); // 0-11
  const dia = 1 + Math.floor(Math.random() * 28);
  const hora = 8 + Math.floor(Math.random() * 13);
  const min = Math.floor(Math.random() * 60);
  return `2026-${pad(mes + 1)}-${pad(dia)} ${pad(hora)}:${pad(min)}:00`;
}

function conceptosKey(nombre, tipo) {
  if (nombre === "Otros") return tipo === "gasto" ? "Otros-gasto" : "Otros-ingreso";
  return nombre;
}

async function main() {
  const n = Number(process.argv.find((a) => /^\d+$/.test(a))) || 250;
  const reset = process.argv.includes("--reset");
  const db = pool.promise();

  if (reset) {
    const [r] = await db.query(
      "DELETE FROM registros WHERE user = ? AND observaciones LIKE ?",
      [ADMIN_UUID, `${SEED_TAG}%`]
    );
    console.log(`✓ Borrados ${r.affectedRows} registros ficticios previos`);
  }

  const [categorias] = await db.query(
    "SELECT id, nombre, tipo FROM categorias WHERE user = ? AND activa = 1",
    [ADMIN_UUID]
  );
  if (categorias.length === 0) {
    throw new Error("No hay categorías. Arranca el backend una vez para sembrarlas.");
  }
  const gastos = categorias.filter((c) => c.tipo === "gasto");
  const ingresos = categorias.filter((c) => c.tipo === "ingreso");

  const rows = [];
  for (let i = 0; i < n; i++) {
    const esGasto = Math.random() < 0.72;
    const cat = pick(esGasto ? gastos : ingresos);
    const key = conceptosKey(cat.nombre, cat.tipo);
    const [min, max] = RANGOS[key] || [5, 100];
    const cantidad = Math.round(rnd(min, max) * 100) / 100;
    const ts = fecha2026();
    // ~12% de los registros se "editaron" más tarde el mismo año.
    const editado = Math.random() < 0.12;
    const updated = editado ? fecha2026() : ts;

    rows.push([
      uuid(),
      pick(CONCEPTOS[key] || ["Registro de prueba"]),
      `${SEED_TAG} registro ficticio de prueba`,
      cat.nombre,
      cat.id,
      cat.tipo,
      cantidad,
      ADMIN_UUID,
      ts,
      updated < ts ? ts : updated,
    ]);
  }

  await db.query(
    `INSERT INTO registros
       (id, concepto, observaciones, categoria, categoria_id, tipo, cantidad, user, created_at, updated_at)
     VALUES ?`,
    [rows]
  );

  const gCount = rows.filter((r) => r[5] === "gasto").length;
  console.log(`✓ Insertados ${rows.length} registros ficticios (${gCount} gastos, ${rows.length - gCount} ingresos) con fechas de 2026`);
  await pool.promise().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

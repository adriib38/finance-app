/**
 * Motor de reconciliación de suscripciones recurrentes (Feature 1, plan v2).
 *
 * Idea de diseño: en vez de "disparar el día X", en cada arranque (y cada
 * cierto intervalo mientras el proceso sigue vivo, ver main.js) se pregunta
 * qué periodos (mes) de cada suscripción activa ya deberían haberse cobrado y
 * todavía no tienen cargo registrado. Así da igual que el servidor haya
 * estado parado varios días: al volver a levantarse genera los que falten,
 * con la fecha real a la que correspondían (no la fecha en la que arrancó el
 * servidor) — si no se hiciera así, un cobro atrasado ensuciaría las
 * estadísticas del mes en el que casualmente se reinició el server.
 *
 * Es idempotente: `suscripciones_cargos` tiene UNIQUE (suscripcion_id,
 * periodo), así que aunque se llame varias veces seguidas (arranque +
 * intervalo solapados) nunca duplica un cargo.
 */
const { v4: uuid } = require("uuid");
const pool = require("../database");
const Categoria = require("../models/Categoria");
const Suscripcion = require("../models/Suscripcion");
const {
  fechaCobro,
  periodoKey,
  siguienteMes,
  soloFecha,
} = require("../utils/fechasRecurrentes");

const db = pool.promise();

// Límite de seguridad: no generar de golpe más de 240 meses (20 años) aunque
// `fecha_inicio` esté mal puesta muy en el pasado — evita que un alta con la
// fecha equivocada dispare miles de registros en el primer arranque.
const MAX_PERIODOS_POR_EJECUCION = 240;

function formatFecha(date) {
  // 'YYYY-MM-DD' — created_at/updated_at son TIMESTAMP; se guarda a
  // medianoche del día real de cobro.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function periodosCargados(suscripcionId) {
  const [rows] = await db.query(
    `SELECT periodo FROM suscripciones_cargos WHERE suscripcion_id = ?`,
    [suscripcionId]
  );
  return new Set(rows.map((r) => r.periodo));
}

/**
 * Periodos (mes) de `susc` cuya fecha de cobro ya llegó (<= hoy), están
 * dentro de [fecha_inicio, fecha_fin] y todavía no tienen cargo registrado.
 */
async function periodosPendientes(susc, hoy) {
  const cargados = await periodosCargados(susc.id);
  const inicio = soloFecha(new Date(susc.fecha_inicio));
  const fin = susc.fecha_fin ? soloFecha(new Date(susc.fecha_fin)) : null;
  const hoySoloFecha = soloFecha(hoy);

  let year = inicio.getFullYear();
  let month = inicio.getMonth() + 1;
  const pendientes = [];

  for (let i = 0; i < MAX_PERIODOS_POR_EJECUCION; i++) {
    const fecha = fechaCobro(susc.dia_pago, year, month);
    if (fecha > hoySoloFecha) break;
    if (fin && fecha > fin) break;

    // El día de pago clampeado puede caer antes de `fecha_inicio` en el mes
    // de alta (p.ej. alta el 15 con día de pago 5): ese primer mes no se
    // factura, pero se sigue iterando hacia los siguientes.
    if (fecha >= inicio) {
      const periodo = periodoKey(year, month);
      if (!cargados.has(periodo)) pendientes.push({ periodo, fecha });
    }

    [year, month] = siguienteMes(year, month);
  }
  return pendientes;
}

async function generarCargo(susc, periodo, fecha) {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    let categoriaNombre = null;
    if (susc.categoria_id) {
      const cat = await Categoria.getById(susc.categoria_id, susc.user);
      categoriaNombre = cat ? cat.nombre : null;
    }

    const registroId = uuid();
    const fechaStr = formatFecha(fecha);
    await conn.query(
      `INSERT INTO registros
         (id, concepto, observaciones, categoria, categoria_id, tipo, cantidad, user, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        registroId,
        susc.nombre,
        `Cargo automático de la suscripción "${susc.nombre}" (${periodo})`,
        categoriaNombre,
        susc.categoria_id,
        susc.tipo,
        susc.cantidad,
        susc.user,
        fechaStr,
        fechaStr,
      ]
    );
    await conn.query(
      `INSERT INTO suscripciones_cargos (id, suscripcion_id, periodo, registro_id)
       VALUES (?, ?, ?, ?)`,
      [uuid(), susc.id, periodo, registroId]
    );

    await conn.commit();
    console.log(`✓ Suscripción "${susc.nombre}": cargo ${periodo} (${fechaStr})`);
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      // Ya facturado por otra ejecución concurrente (arranque e intervalo
      // solapados) — no es un error real, simplemente ya está hecho.
      return;
    }
    throw err;
  } finally {
    conn.release();
  }
}

async function procesarSuscripciones() {
  const activas = await Suscripcion.getActivas();
  if (activas.length === 0) return;

  const hoy = new Date();
  for (const susc of activas) {
    try {
      const pendientes = await periodosPendientes(susc, hoy);
      for (const { periodo, fecha } of pendientes) {
        await generarCargo(susc, periodo, fecha);
      }
    } catch (err) {
      // Una suscripción con datos raros no debe impedir procesar el resto.
      console.error(`Error procesando la suscripción ${susc.id}:`, err);
    }
  }
}

module.exports = procesarSuscripciones;
module.exports.periodosPendientes = periodosPendientes;

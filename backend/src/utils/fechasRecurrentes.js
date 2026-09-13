// Helpers de fechas para las suscripciones recurrentes (día de pago mensual).
// Puros (no tocan la BD) para que el motor de reconciliación sea fácil de
// razonar y de testear.

function diasEnMes(year, month /* 1-12 */) {
  return new Date(year, month, 0).getDate();
}

// Ajusta el día de pago al mes concreto: si el mes no tiene ese día (p.ej. 31
// en febrero o abril) se cobra el último día de ese mes.
function clampDia(diaPago, year, month) {
  return Math.min(diaPago, diasEnMes(year, month));
}

function periodoKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// Fecha real de cobro de un periodo, con el día ya ajustado.
function fechaCobro(diaPago, year, month) {
  return new Date(year, month - 1, clampDia(diaPago, year, month));
}

function siguienteMes(year, month) {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

// Trunca a medianoche local, para comparar fechas ignorando la hora.
function soloFecha(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Próxima fecha de cobro (>= hoy) para un día de pago, sin mirar si el
// periodo ya está facturado — pensado para mostrar "próximo cargo" en el
// listado del frontend.
function proximaFechaCobro(diaPago, hoy = new Date()) {
  const hoySoloFecha = soloFecha(hoy);
  let year = hoySoloFecha.getFullYear();
  let month = hoySoloFecha.getMonth() + 1;
  let fecha = fechaCobro(diaPago, year, month);
  if (fecha < hoySoloFecha) {
    [year, month] = siguienteMes(year, month);
    fecha = fechaCobro(diaPago, year, month);
  }
  return fecha;
}

module.exports = {
  diasEnMes,
  clampDia,
  periodoKey,
  fechaCobro,
  siguienteMes,
  soloFecha,
  proximaFechaCobro,
};

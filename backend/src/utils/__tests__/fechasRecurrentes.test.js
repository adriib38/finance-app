const {
  diasEnMes,
  clampDia,
  periodoKey,
  fechaCobro,
  siguienteMes,
  soloFecha,
  proximaFechaCobro,
} = require("../fechasRecurrentes");

describe("diasEnMes", () => {
  test("meses de 31 días", () => {
    expect(diasEnMes(2026, 1)).toBe(31);
  });

  test("meses de 30 días", () => {
    expect(diasEnMes(2026, 4)).toBe(30);
  });

  test("febrero en año no bisiesto", () => {
    expect(diasEnMes(2026, 2)).toBe(28);
  });

  test("febrero en año bisiesto", () => {
    expect(diasEnMes(2024, 2)).toBe(29);
  });
});

describe("clampDia", () => {
  test("devuelve el día tal cual si el mes lo tiene", () => {
    expect(clampDia(15, 2026, 1)).toBe(15);
  });

  test("clampea el día de pago 31 a febrero (28 en año no bisiesto)", () => {
    expect(clampDia(31, 2026, 2)).toBe(28);
  });

  test("clampea el día de pago 31 a febrero bisiesto (29)", () => {
    expect(clampDia(31, 2024, 2)).toBe(29);
  });

  test("clampea el día de pago 31 a abril (30)", () => {
    expect(clampDia(31, 2026, 4)).toBe(30);
  });
});

describe("periodoKey", () => {
  test("formatea el mes con cero a la izquierda", () => {
    expect(periodoKey(2026, 3)).toBe("2026-03");
  });

  test("no añade cero si el mes ya tiene dos cifras", () => {
    expect(periodoKey(2026, 11)).toBe("2026-11");
  });
});

describe("fechaCobro", () => {
  test("usa el día de pago clampeado al mes concreto", () => {
    const fecha = fechaCobro(31, 2026, 2);
    expect(fecha.getFullYear()).toBe(2026);
    expect(fecha.getMonth()).toBe(1); // febrero (0-indexed)
    expect(fecha.getDate()).toBe(28);
  });

  test("respeta el día si el mes lo tiene", () => {
    const fecha = fechaCobro(5, 2026, 6);
    expect(fecha.getDate()).toBe(5);
  });
});

describe("siguienteMes", () => {
  test("avanza dentro del mismo año", () => {
    expect(siguienteMes(2026, 5)).toEqual([2026, 6]);
  });

  test("hace rollover de diciembre a enero del año siguiente", () => {
    expect(siguienteMes(2026, 12)).toEqual([2027, 1]);
  });
});

describe("soloFecha", () => {
  test("trunca la hora, dejando la fecha local a medianoche", () => {
    const conHora = new Date(2026, 5, 15, 23, 59, 59);
    const truncada = soloFecha(conHora);
    expect(truncada.getHours()).toBe(0);
    expect(truncada.getMinutes()).toBe(0);
    expect(truncada.getSeconds()).toBe(0);
    expect(truncada.getFullYear()).toBe(2026);
    expect(truncada.getMonth()).toBe(5);
    expect(truncada.getDate()).toBe(15);
  });
});

describe("proximaFechaCobro", () => {
  test("si el día de pago de este mes aún no ha llegado, lo devuelve", () => {
    const hoy = new Date(2026, 5, 10); // 10 de junio de 2026
    const fecha = proximaFechaCobro(20, hoy);
    expect(fecha.getMonth()).toBe(5);
    expect(fecha.getDate()).toBe(20);
  });

  test("si el día de pago de este mes ya pasó, salta al mes siguiente", () => {
    const hoy = new Date(2026, 5, 25); // 25 de junio de 2026
    const fecha = proximaFechaCobro(20, hoy);
    expect(fecha.getMonth()).toBe(6); // julio
    expect(fecha.getDate()).toBe(20);
  });

  test("si hoy es justo el día de pago, hoy mismo cuenta como 'próximo' (contrato >= hoy)", () => {
    const hoy = new Date(2026, 5, 20);
    const fecha = proximaFechaCobro(20, hoy);
    expect(fecha.getMonth()).toBe(5);
    expect(fecha.getDate()).toBe(20);
  });

  test("hace rollover de año cuando el próximo cobro cae en enero", () => {
    const hoy = new Date(2026, 11, 25); // 25 de diciembre de 2026
    const fecha = proximaFechaCobro(20, hoy);
    expect(fecha.getFullYear()).toBe(2027);
    expect(fecha.getMonth()).toBe(0);
    expect(fecha.getDate()).toBe(20);
  });

  test("respeta el clamp de fin de mes dentro del propio mes corto", () => {
    const hoy = new Date(2026, 1, 1); // 1 de febrero de 2026, día de pago 31
    const fecha = proximaFechaCobro(31, hoy);
    // El cobro de febrero se clampea a 28, y esa fecha ya es >= hoy, así que no hace falta rollover.
    expect(fecha.getMonth()).toBe(1);
    expect(fecha.getDate()).toBe(28);
  });
});

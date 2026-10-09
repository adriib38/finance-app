// `periodosPendientes` es el corazón del motor de reconciliación de
// suscripciones: decide qué meses hay que cobrar. Un fallo aquí significa
// cargos duplicados o, peor, cargos que nunca llegan a generarse.
//
// Se mockea la BD (solo se usa para leer qué periodos ya están facturados)
// para poder testear la lógica de fechas de forma totalmente determinista.

const mockQuery = jest.fn();

jest.mock("../../database", () => ({
  promise: () => ({ query: (...args) => mockQuery(...args) }),
}));

jest.mock("../../models/Categoria", () => ({}));
jest.mock("../../models/Suscripcion", () => ({}));

const { periodosPendientes } = require("../procesarSuscripciones");

function mockPeriodosCargados(periodos) {
  mockQuery.mockResolvedValueOnce([periodos.map((p) => ({ periodo: p }))]);
}

describe("periodosPendientes", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("genera un único periodo pendiente para una suscripción recién creada", async () => {
    mockPeriodosCargados([]);
    const susc = {
      id: "s1",
      dia_pago: 5,
      fecha_inicio: "2026-06-05",
      fecha_fin: null,
    };
    const hoy = new Date(2026, 5, 10); // 10 de junio de 2026

    const pendientes = await periodosPendientes(susc, hoy);

    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].periodo).toBe("2026-06");
  });

  test("no genera nada si la fecha de cobro de este mes todavía no ha llegado", async () => {
    mockPeriodosCargados([]);
    const susc = {
      id: "s1",
      dia_pago: 20,
      fecha_inicio: "2026-06-05",
      fecha_fin: null,
    };
    const hoy = new Date(2026, 5, 10);

    const pendientes = await periodosPendientes(susc, hoy);

    expect(pendientes).toHaveLength(0);
  });

  test("genera varios periodos acumulados si el servidor ha estado parado meses", async () => {
    mockPeriodosCargados([]);
    const susc = {
      id: "s1",
      dia_pago: 1,
      fecha_inicio: "2026-01-01",
      fecha_fin: null,
    };
    const hoy = new Date(2026, 3, 15); // 15 de abril de 2026

    const pendientes = await periodosPendientes(susc, hoy);

    expect(pendientes.map((p) => p.periodo)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
  });

  test("es idempotente: no repite periodos ya cargados", async () => {
    mockPeriodosCargados(["2026-01", "2026-02"]);
    const susc = {
      id: "s1",
      dia_pago: 1,
      fecha_inicio: "2026-01-01",
      fecha_fin: null,
    };
    const hoy = new Date(2026, 2, 15); // 15 de marzo de 2026

    const pendientes = await periodosPendientes(susc, hoy);

    expect(pendientes.map((p) => p.periodo)).toEqual(["2026-03"]);
  });

  test("no factura el primer mes si el día de pago clampeado cae antes del alta", async () => {
    mockPeriodosCargados([]);
    // Alta el 15 de junio, día de pago 5: el cobro clampeado de junio (día 5)
    // cae antes del alta, así que ese mes no se factura, pero sí los siguientes.
    const susc = {
      id: "s1",
      dia_pago: 5,
      fecha_inicio: "2026-06-15",
      fecha_fin: null,
    };
    const hoy = new Date(2026, 6, 10); // 10 de julio de 2026

    const pendientes = await periodosPendientes(susc, hoy);

    expect(pendientes.map((p) => p.periodo)).toEqual(["2026-07"]);
  });

  test("respeta fecha_fin y deja de generar periodos tras la baja", async () => {
    mockPeriodosCargados([]);
    const susc = {
      id: "s1",
      dia_pago: 1,
      fecha_inicio: "2026-01-01",
      fecha_fin: "2026-02-15",
    };
    const hoy = new Date(2026, 5, 1); // 1 de junio de 2026

    const pendientes = await periodosPendientes(susc, hoy);

    // Marzo (cobro día 1) cae después de fecha_fin (15 feb), así que se detiene en febrero.
    expect(pendientes.map((p) => p.periodo)).toEqual(["2026-01", "2026-02"]);
  });

  test("clampea el día de pago en meses cortos al generar periodos pendientes", async () => {
    mockPeriodosCargados([]);
    const susc = {
      id: "s1",
      dia_pago: 31,
      fecha_inicio: "2026-01-31",
      fecha_fin: null,
    };
    const hoy = new Date(2026, 2, 1); // 1 de marzo de 2026

    const pendientes = await periodosPendientes(susc, hoy);

    expect(pendientes.map((p) => p.periodo)).toEqual(["2026-01", "2026-02"]);
    const febrero = pendientes.find((p) => p.periodo === "2026-02");
    expect(febrero.fecha.getDate()).toBe(28);
  });
});

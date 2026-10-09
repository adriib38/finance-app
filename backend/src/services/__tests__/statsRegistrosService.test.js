// Estas funciones calculan las cifras que el usuario ve en el dashboard
// (totales, timeline mensual, top gastos). Se mockea `sequelize.query` (el
// servicio usa Sequelize en modo "raw query", no el ORM de modelos) para
// fijar filas de ejemplo y comprobar que el redondeo, el relleno de meses
// vacíos y los límites se calculan bien sin depender de una base de datos real.

const mockQuery = jest.fn();

jest.mock("../../sequelize", () => ({
  query: (...args) => mockQuery(...args),
}));

const {
  getTimeline,
  getTopGastos,
  getStats,
} = require("../statsRegistrosService");

describe("getTimeline", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("redondea a 2 decimales y calcula el balance", async () => {
    mockQuery.mockResolvedValueOnce([
      { periodo: "2026-01", ingresos: 100.005, gastos: 40.001 },
    ]);

    const rows = await getTimeline("user-1");

    expect(rows).toEqual([
      { periodo: "2026-01", ingresos: 100.01, gastos: 40, balance: 60.01 },
    ]);
  });

  test("rellena con 0 los meses sin movimientos cuando se pasa from/to", async () => {
    mockQuery.mockResolvedValueOnce([
      { periodo: "2026-01", ingresos: 100, gastos: 50 },
    ]);

    const rows = await getTimeline("user-1", {
      from: "2026-01-01",
      to: "2026-03-31",
    });

    expect(rows.map((r) => r.periodo)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    expect(rows[1]).toEqual({
      periodo: "2026-02",
      ingresos: 0,
      gastos: 0,
      balance: 0,
    });
  });

  test("sin rango completo, solo devuelve los meses con datos", async () => {
    mockQuery.mockResolvedValueOnce([
      { periodo: "2026-01", ingresos: 10, gastos: 5 },
      { periodo: "2026-05", ingresos: 20, gastos: 0 },
    ]);

    const rows = await getTimeline("user-1");

    expect(rows.map((r) => r.periodo)).toEqual(["2026-01", "2026-05"]);
  });

  test("propaga el error si la consulta falla", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db down"));

    await expect(getTimeline("user-1")).rejects.toThrow("db down");
  });
});

describe("getTopGastos", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("limita el top a un máximo de 50", async () => {
    mockQuery.mockImplementation((sql, options) => {
      const { replacements } = options;
      expect(replacements[replacements.length - 1]).toBe(50);
      return Promise.resolve([]);
    });

    await getTopGastos("user-1", {}, 999);
  });

  test("usa un mínimo de 1 aunque se pida un límite menor o inválido", async () => {
    mockQuery.mockImplementation((sql, options) => {
      const { replacements } = options;
      expect(replacements[replacements.length - 1]).toBe(1);
      return Promise.resolve([]);
    });

    await getTopGastos("user-1", {}, -5);
  });

  test("usa el valor por defecto (5) si no se especifica límite", async () => {
    mockQuery.mockImplementation((sql, options) => {
      const { replacements } = options;
      expect(replacements[replacements.length - 1]).toBe(5);
      return Promise.resolve([]);
    });

    await getTopGastos("user-1", {});
  });
});

describe("getStats", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("devuelve la primera fila de resultados", async () => {
    const fakeRow = { "Número de registros": 3 };
    mockQuery.mockResolvedValueOnce([fakeRow]);

    const row = await getStats("user-1");

    expect(row).toBe(fakeRow);
  });
});

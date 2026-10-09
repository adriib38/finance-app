import {
  monthRange,
  yearRange,
  monthLabel,
  formatFechaCorta,
} from "../dateRange";

describe("monthRange", () => {
  test("devuelve el primer y último día de un mes de 31 días", () => {
    const ref = new Date(2026, 0, 15); // enero 2026
    expect(monthRange(ref)).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });

  test("devuelve el último día correcto en febrero bisiesto", () => {
    const ref = new Date(2024, 1, 10); // febrero 2024 (bisiesto)
    expect(monthRange(ref)).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });

  test("devuelve el último día correcto en febrero no bisiesto", () => {
    const ref = new Date(2026, 1, 10);
    expect(monthRange(ref)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
});

describe("yearRange", () => {
  test("devuelve el 1 de enero y el 31 de diciembre del año de referencia", () => {
    const ref = new Date(2026, 5, 1);
    expect(yearRange(ref)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
});

describe("monthLabel", () => {
  test("devuelve una etiqueta corta de 3 letras sin año", () => {
    expect(monthLabel("2026-06")).toMatch(/^[a-zA-Z.]{3,4}$/);
  });

  test("añade los dos últimos dígitos del año cuando withYear es true", () => {
    expect(monthLabel("2026-06", true)).toMatch(/26$/);
  });
});

describe("formatFechaCorta", () => {
  test("convierte YYYY-MM-DD a DD/MM/YYYY", () => {
    expect(formatFechaCorta("2026-09-30")).toBe("30/09/2026");
  });

  test("ignora la parte de hora si viene un ISO completo", () => {
    expect(formatFechaCorta("2026-09-30T00:00:00.000Z")).toBe("30/09/2026");
  });

  test("devuelve cadena vacía si no hay valor", () => {
    expect(formatFechaCorta(null)).toBe("");
    expect(formatFechaCorta(undefined)).toBe("");
    expect(formatFechaCorta("")).toBe("");
  });
});

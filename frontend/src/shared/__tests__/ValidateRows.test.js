import { validateRow } from "../ValidateRows";

const rowValido = {
  categoria: "Comida",
  concepto: "Supermercado",
  tipo: "gasto",
  observaciones: "Compra semanal",
  cantidad: 50,
  fecha: "2026-06-01",
};

describe("validateRow", () => {
  test("no devuelve errores para un registro completo", () => {
    expect(validateRow(rowValido)).toEqual([]);
  });

  test("exige categoría", () => {
    const errores = validateRow({ ...rowValido, categoria: "" });
    expect(errores).toContain("La categoría es requerida");
  });

  test("exige concepto", () => {
    const errores = validateRow({ ...rowValido, concepto: "" });
    expect(errores).toContain("El concepto es requerido");
  });

  test("exige tipo", () => {
    const errores = validateRow({ ...rowValido, tipo: "" });
    expect(errores).toContain("El tipo es requerido");
  });

  test("exige observaciones", () => {
    const errores = validateRow({ ...rowValido, observaciones: "" });
    expect(errores).toContain("Las observaciones son requeridas");
  });

  test("exige una cantidad mayor que 0", () => {
    const errores = validateRow({ ...rowValido, cantidad: 0 });
    expect(errores).toContain("La cantidad es requerida");
  });

  test("exige fecha", () => {
    const errores = validateRow({ ...rowValido, fecha: null });
    expect(errores).toContain("La fecha es requerida");
  });

  test("acumula todos los errores cuando faltan varios campos", () => {
    const errores = validateRow({});
    expect(errores).toHaveLength(6);
  });
});

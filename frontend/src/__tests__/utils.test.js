import {
  validateUsername,
  validatePassword,
  validateRepeatPassword,
} from "../utils";

describe("validateUsername", () => {
  test("acepta un username de longitud válida", () => {
    expect(validateUsername("admin")).toBe(true);
  });

  test("rechaza algo que no sea string", () => {
    expect(validateUsername(12345)).toBe(false);
  });

  test("rechaza username demasiado corto", () => {
    expect(validateUsername("ab")).toBe(false);
  });

  test("rechaza username demasiado largo", () => {
    expect(validateUsername("a".repeat(21))).toBe(false);
  });

  test("acepta justo en los límites (3 y 20)", () => {
    expect(validateUsername("abc")).toBe(true);
    expect(validateUsername("a".repeat(20))).toBe(true);
  });
});

describe("validatePassword", () => {
  test("acepta una contraseña de longitud válida", () => {
    expect(validatePassword("password123")).toBe(true);
  });

  test("rechaza algo que no sea string", () => {
    expect(validatePassword(12345678)).toBe(false);
  });

  test("rechaza contraseña demasiado corta", () => {
    expect(validatePassword("short1")).toBe(false);
  });

  test("rechaza contraseña demasiado larga", () => {
    expect(validatePassword("a".repeat(129))).toBe(false);
  });
});

describe("validateRepeatPassword", () => {
  test("devuelve true si ambas contraseñas coinciden", () => {
    expect(validateRepeatPassword("secret123", "secret123")).toBe(true);
  });

  test("devuelve false si no coinciden", () => {
    expect(validateRepeatPassword("secret123", "otraClave")).toBe(false);
  });
});

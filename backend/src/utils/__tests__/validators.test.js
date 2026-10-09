const { validateUserFields } = require("../validators");

describe("validateUserFields", () => {
  test("acepta un usuario y contraseña válidos", () => {
    const { valid, errors } = validateUserFields({
      username: "admin",
      password: "password123",
    });
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  test("rechaza username ausente", () => {
    const { valid, errors } = validateUserFields({ password: "password123" });
    expect(valid).toBe(false);
    expect(errors).toContain(
      "Username must be a string between 3 and 20 characters"
    );
  });

  test("rechaza username demasiado corto", () => {
    const { valid, errors } = validateUserFields({
      username: "ab",
      password: "password123",
    });
    expect(valid).toBe(false);
    expect(errors).toContain(
      "Username must be a string between 3 and 20 characters"
    );
  });

  test("rechaza username demasiado largo", () => {
    const { valid } = validateUserFields({
      username: "a".repeat(21),
      password: "password123",
    });
    expect(valid).toBe(false);
  });

  test("rechaza password ausente", () => {
    const { valid, errors } = validateUserFields({ username: "admin" });
    expect(valid).toBe(false);
    expect(errors).toContain(
      "Password must be a string between 8 and 128 characters"
    );
  });

  test("rechaza password demasiado corta", () => {
    const { valid } = validateUserFields({
      username: "admin",
      password: "short1",
    });
    expect(valid).toBe(false);
  });

  test("rechaza password demasiado larga", () => {
    const { valid } = validateUserFields({
      username: "admin",
      password: "a".repeat(129),
    });
    expect(valid).toBe(false);
  });

  test("acumula ambos errores si username y password son inválidos", () => {
    const { valid, errors } = validateUserFields({ username: "a", password: "x" });
    expect(valid).toBe(false);
    expect(errors).toHaveLength(2);
  });

  test("rechaza username que no es string", () => {
    const { valid } = validateUserFields({ username: 12345, password: "password123" });
    expect(valid).toBe(false);
  });
});

// Helpers de rango de fechas para el filtro de la home. Todo en hora local
// (los límites de mes/año se calculan sobre la fecha local del usuario).

const ymd = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
};

// Primer y último día del mes de `ref`.
export const monthRange = (ref = new Date()) => ({
  from: ymd(new Date(ref.getFullYear(), ref.getMonth(), 1)),
  to: ymd(new Date(ref.getFullYear(), ref.getMonth() + 1, 0)),
});

// 1 de enero – 31 de diciembre del año de `ref`.
export const yearRange = (ref = new Date()) => ({
  from: `${ref.getFullYear()}-01-01`,
  to: `${ref.getFullYear()}-12-31`,
});

// Etiqueta corta de un periodo "YYYY-MM" → "ago" (o "ago 26" con withYear).
export const monthLabel = (periodo, withYear = false) => {
  const [y, m] = String(periodo).split("-").map(Number);
  const label = new Date(y || 2000, (m || 1) - 1).toLocaleString("default", {
    month: "short",
  });
  return withYear ? `${label} ${String(y).slice(2)}` : label;
};

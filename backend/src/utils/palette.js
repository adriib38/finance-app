// Paleta compartida para asignar color por defecto a las categorías.
// Mismos tonos que usan las gráficas del frontend, ampliada para no repetir
// demasiado pronto.
const PALETTE = [
  "#048BA8",
  "#F29E4C",
  "#A4036F",
  "#16DB93",
  "#EFEA5A",
  "#2E86AB",
  "#E0274C",
  "#8E7DBE",
  "#F4A259",
  "#5B8E7D",
  "#BC4B51",
  "#3D5A80",
];

function colorForIndex(i) {
  return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

module.exports = { PALETTE, colorForIndex };

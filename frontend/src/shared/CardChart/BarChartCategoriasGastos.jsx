import { BarChart } from "@mui/x-charts/BarChart";
import { useMemo } from "react";
import "./index.css";

const eur = (n) =>
  `${Number(n || 0).toLocaleString("es-ES", { maximumFractionDigits: 0 })} €`;

// Ranking horizontal de gastos por categoría. Cada barra usa el color de su
// categoría (el mismo que el pie de arriba); las categorías sin color propio
// caen en este rojo de "gasto".
const GASTO_COLOR = "#E0274C";

// Alto de fila fijo para que el gráfico crezca con el número de categorías
// en vez de comprimirlas todas en una altura constante.
const ROW_HEIGHT = 44;
const MIN_HEIGHT = 220;

// Recibe las mismas filas [{ id, value, label, color }] que ya usa el pie
// de "Gastos por categoría" (sin el sufijo de total añadido para la leyenda).
function BarChartCategoriasGastos({ data = [] }) {
  // MUI X-Charts asigna `series[].color` por serie completa, no por barra.
  // Para que cada categoría salga con su propio color hace falta una serie
  // por categoría, cada una con un único valor en su fila (el resto queda a
  // `undefined`) y todas apiladas en el mismo `stack`: así ocupan la fila
  // entera en vez de repartirse el ancho de la banda como barras agrupadas.
  const { dataset, series } = useMemo(() => {
    const dataset = data.map((d, i) => ({ label: d.label, [`v${i}`]: d.value }));
    const series = data.map((d, i) => ({
      dataKey: `v${i}`,
      label: d.label,
      color: d.color || GASTO_COLOR,
      stack: "gastos",
      valueFormatter: eur,
    }));
    return { dataset, series };
  }, [data]);

  if (dataset.length === 0) {
    return (
      <article className="cardChart-article">
        <header className="cardChart-header">
          <p>Ranking de gastos por categoría</p>
        </header>
        <p style={{ color: "#999" }}>Sin gastos en el periodo.</p>
      </article>
    );
  }

  return (
    <article className="cardChart-article">
      <header className="cardChart-header">
        <p>Ranking de gastos por categoría</p>
      </header>

      <BarChart
        dataset={dataset}
        layout="horizontal"
        yAxis={[{ scaleType: "band", dataKey: "label" }]}
        xAxis={[{ valueFormatter: eur }]}
        series={series}
        height={Math.max(MIN_HEIGHT, dataset.length * ROW_HEIGHT)}
        margin={{ left: 110 }}
        slots={{ legend: () => null }}
      />
    </article>
  );
}

export default BarChartCategoriasGastos;

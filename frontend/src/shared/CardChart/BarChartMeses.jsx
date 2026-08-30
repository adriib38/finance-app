import { BarChart } from "@mui/x-charts/BarChart";
import { axisClasses } from "@mui/x-charts/ChartsAxis";
import { useMemo } from "react";
import { monthLabel } from "../../utils/dateRange";
import "./index.css";

const chartSetting = {
  height: 450,
  sx: {
    [`.${axisClasses.left} .${axisClasses.label}`]: {},
  },
};

const valueFormatter = (cantidad) =>
  `${Number(cantidad || 0).toLocaleString("es-ES", { maximumFractionDigits: 0 })} €`;

// Recibe la serie mensual ya agregada en backend: [{ periodo, ingresos, gastos, balance }]
function BarChartMeses({ data = [] }) {
  const { dataset, titulo } = useMemo(() => {
    const years = [...new Set(data.map((d) => d.periodo.slice(0, 4)))];
    const multiYear = years.length > 1;
    return {
      titulo: multiYear
        ? `${years[0]}–${years[years.length - 1]}`
        : years[0] || "",
      dataset: data.map((d) => ({
        month: monthLabel(d.periodo, multiYear),
        gasto: d.gastos,
        ingreso: d.ingresos,
      })),
    };
  }, [data]);

  return (
    <article id="barChartMeses" className="cardChart-article">
      <header className="cardChart-header">
        <p>Comparación por meses · {titulo}</p>
      </header>

      <BarChart
        dataset={dataset}
        xAxis={[{ scaleType: "band", dataKey: "month" }]}
        series={[
          { dataKey: "gasto", label: "Gasto", color: "#e0274c", valueFormatter },
          { dataKey: "ingreso", label: "Ingreso", color: "#27e058", valueFormatter },
        ]}
        {...chartSetting}
      />
    </article>
  );
}

export default BarChartMeses;

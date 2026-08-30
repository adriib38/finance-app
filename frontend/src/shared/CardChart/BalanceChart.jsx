import { LineChart } from "@mui/x-charts/LineChart";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import { useMemo } from "react";
import { monthLabel } from "../../utils/dateRange";
import "./index.css";

const valueFormatter = (v) =>
  `${Number(v || 0).toLocaleString("es-ES", { maximumFractionDigits: 0 })} €`;

// Balance mensual (ingresos - gastos) ya calculado en backend.
function BalanceChart({ data = [] }) {
  const { dataset, titulo } = useMemo(() => {
    const years = [...new Set(data.map((d) => d.periodo.slice(0, 4)))];
    const multiYear = years.length > 1;
    return {
      titulo: multiYear
        ? `${years[0]}–${years[years.length - 1]}`
        : years[0] || "",
      dataset: data.map((d) => ({
        month: monthLabel(d.periodo, multiYear),
        balance: d.balance,
      })),
    };
  }, [data]);

  return (
    <article className="cardChart-article">
      <header className="cardChart-header">
        <p>Balance mensual (ingresos − gastos) · {titulo}</p>
      </header>

      <LineChart
        dataset={dataset}
        xAxis={[{ scaleType: "point", dataKey: "month" }]}
        series={[
          {
            dataKey: "balance",
            label: "Balance",
            color: "#048BA8",
            area: true,
            showMark: true,
            valueFormatter,
          },
        ]}
        height={320}
      >
        <ChartsReferenceLine
          y={0}
          lineStyle={{ stroke: "#999", strokeDasharray: "5 5" }}
        />
      </LineChart>
    </article>
  );
}

export default BalanceChart;

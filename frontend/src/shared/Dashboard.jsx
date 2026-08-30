import { useContext, useEffect, useMemo, useState } from "react";
import { PieChart, pieArcLabelClasses } from "@mui/x-charts/PieChart";
import {
  getStatsCantidadCategoria,
  getStatsTimeline,
} from "../services/RegistrosService";
import { HomeFilterContext } from "../context/HomeFilterContext";
import CardChart from "../shared/CardChart/CardChart";
import BarChartMeses from "./CardChart/BarChartMeses";
import BalanceChart from "./CardChart/BalanceChart";

const eur = (n) =>
  `${Number(n || 0).toLocaleString("es-ES", { maximumFractionDigits: 0 })} €`;

const mapCat = (rows) =>
  (rows || []).map((x) => ({
    id: x.id,
    value: Number(x.value) || 0,
    label: x.label,
    ...(x.color ? { color: x.color } : {}),
  }));

// Añade el total en € a cada etiqueta de la leyenda.
const withLegendTotals = (data) =>
  (data || []).map((d) => ({ ...d, label: `${d.label} · ${eur(d.value)}` }));

// Etiqueta de cada sector: porcentaje sobre el total de la serie.
const makeArcLabel = (data) => {
  const total = (data || []).reduce((s, d) => s + Number(d.value || 0), 0);
  return (item) =>
    total ? `${((Number(item.value) / total) * 100).toFixed(1)}%` : "";
};

function Dashboard() {
  const { range } = useContext(HomeFilterContext);

  const [rawGastos, setRawGastos] = useState([]);
  const [rawIngresos, setRawIngresos] = useState([]);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [g, i, t] = await Promise.all([
          getStatsCantidadCategoria("Gastos", range),
          getStatsCantidadCategoria("Ingresos", range),
          getStatsTimeline(range),
        ]);
        if (!cancelled) {
          setRawGastos(mapCat(g.data));
          setRawIngresos(mapCat(i.data));
          setTimeline(Array.isArray(t.data) ? t.data : []);
        }
      } catch (error) {
        console.error("Error al obtener stats:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const gastos = useMemo(() => withLegendTotals(rawGastos), [rawGastos]);
  const ingresos = useMemo(() => withLegendTotals(rawIngresos), [rawIngresos]);
  const arcLabelGastos = useMemo(() => makeArcLabel(rawGastos), [rawGastos]);
  const arcLabelIngresos = useMemo(() => makeArcLabel(rawIngresos), [rawIngresos]);

  const sectionStyle = {
    display: "flex",
    flexDirection: "column",
    flexWrap: "wrap",
    gap: "30px",
    marginTop: "40px",
  };

  const cardChartStyles = {
    flex: "1"
  };

  const chartConfig = {
    height: 230,
    sx: {
      [`& .${pieArcLabelClasses.root}`]: {
        fill: "white",
      },
    },
    colors: ["#EFEA5A", "#048BA8", "#A4036F", "#F29E4C", "#16DB93"],
    slotProps : {
      legend: {
        direction: 'column',
        position: { vertical: 'middle', horizontal: 'right' },
        padding: -10
      }
    }
  }

  return (
    <section style={sectionStyle}>
      <div style={{display: "flex", flexDirection: 'row', justifyContent: "space-between"}}>
        <div style={cardChartStyles}>
          <CardChart
            type={"Gasto"}
            title={"Gastos por categoría"}
            chart={
              gastos.length === 0 ? (
                <p style={{ color: "#999" }}>Sin gastos en el periodo.</p>
              ) : (
                <PieChart
                  series={[
                    {
                      arcLabel: arcLabelGastos,
                      arcLabelMinAngle: 20,
                      data: gastos,
                    },
                  ]}
                  sx={chartConfig.sx}
                  colors={chartConfig.colors}
                  slotProps={chartConfig.slotProps}
                  width={chartConfig.width}
                  height={chartConfig.height}
                  padding={chartConfig.padding}
                />
              )
            }
          ></CardChart>
        </div>

        <div style={cardChartStyles}>
          <CardChart
            type={"Ingreso"}
            title={"Ingresos por categoría"}
            chart={
              ingresos.length === 0 ? (
                <p style={{ color: "#999" }}>Sin ingresos en el periodo.</p>
              ) : (
                <PieChart
                  series={[
                    {
                      arcLabel: arcLabelIngresos,
                      arcLabelMinAngle: 20,
                      data: ingresos,
                    },
                  ]}
                  sx={chartConfig.sx}
                  slotProps={chartConfig.slotProps}
                  colors={chartConfig.colors}
                  width={chartConfig.width}
                  height={chartConfig.height}
                />
              )
            }
          ></CardChart>
        </div>

      </div>

      <BalanceChart data={timeline} />

      <BarChartMeses data={timeline} />
    </section>
  );
}

export default Dashboard;

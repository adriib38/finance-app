import "./index.css";
import "./TopGastosCard.css";

const eur = (n) =>
  `${Number(n || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;

// `g.fecha` llega como 'YYYY-MM-DD' (sin hora). Se le añade T00:00:00 para que
// el motor de fechas del navegador la interprete en hora LOCAL: sin eso,
// `new Date('YYYY-MM-DD')` se interpreta como UTC y en husos horarios
// negativos puede mostrar el día anterior.
const fecha = (isoDate) =>
  isoDate
    ? new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
    : "";

const GASTO_COLOR = "#E0274C";

// Indicador sencillo: los 5 gastos individuales más caros del periodo
// seleccionado (no agregados por categoría, a diferencia del resto de
// gráficos del dashboard).
function TopGastosCard({ data = [] }) {
  return (
    <article className="cardChart-article">
      <header className="cardChart-header">
        <p>Top 5 gastos más caros</p>
      </header>

      {data.length === 0 ? (
        <p style={{ color: "#999" }}>Sin gastos en el periodo.</p>
      ) : (
        <ol className="topGastos-list">
          {data.map((g, i) => (
            <li key={g.id ?? i} className="topGastos-item">
              <span className="topGastos-rank">{i + 1}</span>

              <span className="topGastos-info">
                <span className="topGastos-concepto">{g.concepto || "Sin concepto"}</span>
                <span
                  className="topGastos-categoria"
                  style={{ color: g.color || GASTO_COLOR }}
                >
                  {g.categoria} · {fecha(g.fecha)}
                </span>
              </span>

              <span className="topGastos-cantidad">{eur(g.cantidad)}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export default TopGastosCard;

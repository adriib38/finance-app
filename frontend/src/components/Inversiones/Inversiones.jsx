import { useCallback, useEffect, useState } from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import {
  getInversiones,
  getResumenInversiones,
  getAportacionesMensuales,
  createInversion,
  deleteInversion,
} from "../../services/InversionesService";
import { monthLabel } from "../../utils/dateRange";
import "../../shared/CardChart/index.css";
import "../../shared/CardChart/TopGastosCard.css";
import "./style.css";

const eur = (n) =>
  `${Number(n || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;

const fecha = (isoDate) =>
  isoDate
    ? new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
    : "";

const today = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const emptyForm = () => ({
  ticker: "",
  nombre: "",
  tipo: "accion",
  participaciones: "",
  precio_compra: "",
  fecha: today(),
  observaciones: "",
});

// Gráfico de aportaciones mensuales: reutiliza el mismo patrón que
// BarChartMeses/BalanceChart pero con una sola serie (lo aportado, no hay
// todavía valor de mercado con el que comparar).
function AportacionesChart({ data }) {
  const dataset = data.map((d) => ({
    month: monthLabel(d.periodo, true),
    importe: d.importe,
  }));

  return (
    <article className="cardChart-article">
      <header className="cardChart-header">
        <p>Aportaciones mensuales</p>
      </header>
      {dataset.length === 0 ? (
        <p style={{ color: "#999" }}>Todavía no hay aportaciones registradas.</p>
      ) : (
        <BarChart
          dataset={dataset}
          xAxis={[{ scaleType: "band", dataKey: "month" }]}
          series={[{ dataKey: "importe", label: "Aportado", color: "#048BA8", valueFormatter: eur }]}
          height={320}
        />
      )}
    </article>
  );
}

function Posiciones({ posiciones }) {
  return (
    <article className="cardChart-article">
      <header className="cardChart-header">
        <p>Posiciones</p>
      </header>
      {posiciones.length === 0 ? (
        <p style={{ color: "#999" }}>Todavía no tienes posiciones abiertas.</p>
      ) : (
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Participaciones</th>
                <th>Precio medio</th>
                <th>Aportado</th>
              </tr>
            </thead>
            <tbody>
              {posiciones.map((p) => (
                <tr key={p.ticker}>
                  <td className="inv-ticker">{p.ticker}</td>
                  <td>{p.nombre || "—"}</td>
                  <td>
                    <span className={`inv-badge inv-badge--${p.tipo}`}>
                      {p.tipo === "etf" ? "ETF" : "Acción"}
                    </span>
                  </td>
                  <td>{p.participaciones.toLocaleString("es-ES", { maximumFractionDigits: 6 })}</td>
                  <td>{eur(p.precioMedio)}</td>
                  <td className="inv-importe">{eur(p.importe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function NuevaAportacion({ onCreated }) {
  const [formState, setFormState] = useState(emptyForm());
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);

  const { ticker, tipo, participaciones, precio_compra, fecha: fechaForm } = formState;
  const valid = ticker.trim() && tipo && Number(participaciones) > 0 && Number(precio_compra) > 0 && fechaForm;

  const handlerForm = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handlerSubmit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setErr(null);
    try {
      await createInversion({
        ticker: ticker.trim().toUpperCase(),
        nombre: formState.nombre.trim() || null,
        tipo,
        participaciones: Number(participaciones),
        precio_compra: Number(precio_compra),
        fecha: fechaForm,
        observaciones: formState.observaciones.trim() || null,
      });
      setFormState(emptyForm());
      onCreated();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="cardChart-article">
      <header className="cardChart-header">
        <p>Nueva aportación</p>
      </header>

      <form id="form-nueva-inversion" onSubmit={handlerSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ticker">Ticker</label>
            <input
              type="text"
              id="ticker"
              name="ticker"
              placeholder="VWCE, AAPL…"
              required
              onChange={handlerForm}
              value={formState.ticker}
            />
          </div>
          <div className="form-group">
            <label htmlFor="nombre">Nombre (opcional)</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              placeholder="Vanguard FTSE All-World"
              onChange={handlerForm}
              value={formState.nombre}
            />
          </div>
        </div>

        <fieldset className="radio-group">
          <legend>Tipo de activo</legend>
          <div className="radio-option">
            <input
              type="radio"
              id="accion"
              name="tipo"
              value="accion"
              onChange={handlerForm}
              checked={formState.tipo === "accion"}
            />
            <label htmlFor="accion">Acción</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              id="etf"
              name="tipo"
              value="etf"
              onChange={handlerForm}
              checked={formState.tipo === "etf"}
            />
            <label htmlFor="etf">ETF</label>
          </div>
        </fieldset>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="participaciones">Participaciones</label>
            <input
              type="number"
              id="participaciones"
              name="participaciones"
              step="any"
              min="0"
              required
              onChange={handlerForm}
              value={formState.participaciones}
            />
          </div>
          <div className="form-group">
            <label htmlFor="precio_compra">Precio de compra (€)</label>
            <input
              type="number"
              id="precio_compra"
              name="precio_compra"
              step="any"
              min="0"
              required
              onChange={handlerForm}
              value={formState.precio_compra}
            />
          </div>
          <div className="form-group">
            <label htmlFor="fecha">Fecha</label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              required
              max={today()}
              onChange={handlerForm}
              value={formState.fecha}
            />
          </div>
        </div>

        {Number(participaciones) > 0 && Number(precio_compra) > 0 && (
          <p className="inv-preview">
            Importe: <b>{eur(Number(participaciones) * Number(precio_compra))}</b>
          </p>
        )}

        <label htmlFor="observaciones">Observaciones (opcional)</label>
        <textarea
          name="observaciones"
          id="observaciones"
          placeholder="Aportación periódica, compra puntual…"
          onChange={handlerForm}
          value={formState.observaciones}
        ></textarea>

        <button type="submit" disabled={!valid || saving}>
          {saving ? "Guardando…" : "Añadir aportación"}
        </button>
      </form>

      <Snackbar open={!!err} autoHideDuration={4000} onClose={() => setErr(null)}>
        <Alert severity="error" variant="filled" onClose={() => setErr(null)}>
          {err}
        </Alert>
      </Snackbar>
    </article>
  );
}

function Historial({ inversiones, onDeleted }) {
  const borrar = async (inv) => {
    if (!window.confirm(`¿Eliminar la aportación de ${inv.ticker} del ${fecha(inv.fecha)}?`)) return;
    try {
      await deleteInversion(inv.id);
      onDeleted();
    } catch (e) {
      window.alert(e.message);
    }
  };

  return (
    <article className="cardChart-article">
      <header className="cardChart-header">
        <p>Historial de aportaciones</p>
      </header>
      {inversiones.length === 0 ? (
        <p style={{ color: "#999" }}>Sin aportaciones todavía.</p>
      ) : (
        <ol className="topGastos-list">
          {inversiones.map((inv) => (
            <li key={inv.id} className="topGastos-item">
              <span className={`inv-badge inv-badge--sm inv-badge--${inv.tipo}`}>
                {inv.tipo === "etf" ? "ETF" : "Acción"}
              </span>
              <span className="topGastos-info">
                <span className="topGastos-concepto">
                  {inv.ticker} ·{" "}
                  {Number(inv.participaciones).toLocaleString("es-ES", { maximumFractionDigits: 6 })} part.
                </span>
                <span className="topGastos-categoria">
                  {fecha(inv.fecha)} · a {eur(inv.precio_compra)}/part.
                </span>
              </span>
              <span className="topGastos-cantidad">{eur(inv.importe)}</span>
              <button type="button" className="inv-delete" onClick={() => borrar(inv)} aria-label="Eliminar">
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function Inversiones() {
  const [inversiones, setInversiones] = useState([]);
  const [resumen, setResumen] = useState({
    totalAportado: 0,
    totalInvertido: 0,
    totalVendido: 0,
    posiciones: [],
  });
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [inv, res, tl] = await Promise.all([
        getInversiones(),
        getResumenInversiones(),
        getAportacionesMensuales(),
      ]);
      setInversiones(inv.data || []);
      setResumen(
        res.data || { totalAportado: 0, totalInvertido: 0, totalVendido: 0, posiciones: [] }
      );
      setTimeline(tl.data || []);
    } catch (error) {
      console.error("Error cargando inversiones:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="inv-page">
      <h1>Cartera de inversión</h1>
      <p className="inv-intro">
        Registra tus aportaciones en acciones y ETFs. De momento solo se
        muestra lo <b>aportado</b>: la comparación con el valor de mercado
        llegará cuando se conecte la cotización en tiempo real.
      </p>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <>
          <div className="inv-totals">
            <article className="cardChart-article inv-total">
              <p className="inv-total-label">Total aportado (neto)</p>
              <h2 className="inv-total-value">{eur(resumen.totalAportado)}</h2>
              <p className="inv-total-hint">Compras menos ventas: lo que sigue invertido ahora.</p>
            </article>

            <article className="cardChart-article inv-total inv-total--secondary">
              <p className="inv-total-label">Aportado en compras (sin ventas)</p>
              <h2 className="inv-total-value">{eur(resumen.totalInvertido)}</h2>
              <p className="inv-total-hint">
                Base de coste para el beneficio: valor actual + vendido − esto.
              </p>
            </article>

            {resumen.totalVendido > 0 && (
              <article className="cardChart-article inv-total inv-total--secondary">
                <p className="inv-total-label">Recibido al vender</p>
                <h2 className="inv-total-value">{eur(resumen.totalVendido)}</h2>
              </article>
            )}
          </div>

          <div className="inv-grid">
            <AportacionesChart data={timeline} />
            <Posiciones posiciones={resumen.posiciones} />
          </div>

          <div className="inv-grid">
            <NuevaAportacion onCreated={cargar} />
            <Historial inversiones={inversiones} onDeleted={cargar} />
          </div>
        </>
      )}
    </div>
  );
}

export default Inversiones;

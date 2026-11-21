import { useState } from "react";
import WrappedModal from "./WrappedModal";
import { getStatsWrapped } from "../../services/RegistrosService";
import "./Wrapped.css";

// El banner solo se muestra en diciembre: el "wrapped" repasa el año en
// curso (parcial), como el Wrapped real de Spotify. `?wrapped=1` en la URL
// fuerza su aparición el resto del año, para poder probarlo/depurarlo.
function isWrappedSeason() {
  if (new URLSearchParams(window.location.search).get("wrapped") === "1") return true;
  return new Date().getMonth() === 11;
}

function WrappedBanner() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [data, setData] = useState(null);

  if (!isWrappedSeason()) return null;

  const handleOpen = async () => {
    setOpen(true);
    if (status === "ready" || status === "loading") return;
    setStatus("loading");
    try {
      const resp = await getStatsWrapped();
      setData(resp.data);
      setStatus("ready");
    } catch (error) {
      console.error("No se pudo cargar el wrapped:", error);
      setStatus("error");
    }
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      <button type="button" className="wrapped-banner" onClick={handleOpen}>
        <span className="wrapped-banner__emoji">🎁</span>
        <span className="wrapped-banner__text">
          <strong>Tu resumen de {new Date().getFullYear()} ya está aquí</strong>
          <span>Descubre cómo te ha ido el año con el dinero</span>
        </span>
        <span className="wrapped-banner__arrow">→</span>
      </button>

      {open && status === "loading" && (
        <div className="wrapped-overlay wrapped-overlay--status">
          <div className="wrapped-spinner" aria-label="Cargando" />
        </div>
      )}

      {open && status === "error" && (
        <div className="wrapped-overlay wrapped-overlay--status">
          <p>No se pudo cargar tu resumen del año. Inténtalo de nuevo más tarde.</p>
          <button type="button" className="wrapped-slide__cta" onClick={handleClose}>
            Cerrar
          </button>
        </div>
      )}

      {open && status === "ready" && data && (
        <WrappedModal data={data} onClose={handleClose} />
      )}
    </>
  );
}

export default WrappedBanner;

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import BotChat from "./BotChat";
import "./widget.css";

// Botón flotante (abajo a la derecha) que abre el chat de Agustín como
// desplegable desde cualquier pestaña de la app, sin salir de la página.
function BotWidget() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const widgetRef = useRef(null);

  // En la página dedicada del bot no mostramos el widget para no duplicar el chat.
  const isBotPage = location.pathname === "/bot";

  useEffect(() => {
    if (isBotPage) setOpen(false);
  }, [isBotPage]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (isBotPage) return null;

  return (
    <div className="bot-widget" ref={widgetRef}>
      {open && (
        <div className="bot-widget-panel">
          <BotChat onClose={() => setOpen(false)} />
        </div>
      )}

      <button
        type="button"
        className="bot-widget-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar chat con Agustín" : "Abrir chat con Agustín"}
        aria-expanded={open}
      >
        {open ? "✕" : "🕵️"}
      </button>
    </div>
  );
}

export default BotWidget;

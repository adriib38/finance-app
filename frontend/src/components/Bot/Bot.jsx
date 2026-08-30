import { useState, useRef, useEffect, useCallback } from "react";
import { askBot } from "../../services/AiService";
import "./style.css";

const SUGERENCIAS = [
  "¿Cuánto he gastado este mes?",
  "¿Cuál es mi balance de 2026?",
  "Top 5 categorías de gasto del año",
  "¿En qué categoría gasto más?",
];

let _id = 0;
const nextId = () => (_id += 1);

function ConsultasSQL({ consultas }) {
  const [open, setOpen] = useState(false);
  if (!consultas || consultas.length === 0) return null;

  return (
    <div className="bot-consultas">
      <button
        type="button"
        className="bot-consultas-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "▾" : "▸"} {consultas.length} consulta{consultas.length > 1 ? "s" : ""} SQL
      </button>
      {open && (
        <ul className="bot-consultas-list">
          {consultas.map((c, i) => (
            <li key={i}>
              <code>{c.sql || "(sin SQL)"}</code>
              <span className={c.error ? "bot-consulta-err" : "bot-consulta-ok"}>
                {c.error
                  ? `error: ${c.error}`
                  : `${c.filas} fila${c.filas === 1 ? "" : "s"}${
                      c.truncada ? " · truncada" : ""
                    }`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bot() {
  const [messages, setMessages] = useState([
    {
      id: nextId(),
      role: "bot",
      text:
        "¡Hola! Soy CashBot, tu asistente financiero. Pregúntame sobre tus gastos, ingresos, categorías o balances y consultaré tus datos por ti.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const enviar = useCallback(
    async (texto) => {
      const pregunta = (texto ?? input).trim();
      if (!pregunta || loading) return;

      setInput("");
      setMessages((m) => [...m, { id: nextId(), role: "user", text: pregunta }]);
      setLoading(true);

      try {
        const { data } = await askBot(pregunta);
        setMessages((m) => [
          ...m,
          {
            id: nextId(),
            role: "bot",
            text: data.respuesta || "(sin respuesta)",
            consultas: data.consultas,
          },
        ]);
      } catch (e) {
        const msg =
          e.status === 503
            ? "El bot no está configurado en el servidor (falta la API key de OpenAI)."
            : e.message || "No he podido responder. Inténtalo de nuevo.";
        setMessages((m) => [...m, { id: nextId(), role: "error", text: msg }]);
      } finally {
        setLoading(false);
        if (inputRef.current) inputRef.current.focus();
      }
    },
    [input, loading]
  );

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="bot-page">
      <div className="bot-window">
        <header className="bot-header">
          <span className="bot-avatar" aria-hidden="true">
            🕵️
          </span>
          <div className="bot-header-info">
            <strong>Agustin</strong>
            <span className="bot-status">● gpt-4o-mini</span>
          </div>
        </header>

        <div className="bot-messages" ref={scrollRef}>
          {messages.map((m) => (
            <div key={m.id} className={`bot-row bot-row--${m.role}`}>
              {m.role !== "user" && (
                <span className="bot-avatar bot-avatar--sm" aria-hidden="true">
                  🕵️
                </span>
              )}
              <div className={`bot-bubble bot-bubble--${m.role}`}>
                <p className="bot-text">{m.text}</p>
                {m.role === "bot" && <ConsultasSQL consultas={m.consultas} />}
              </div>
            </div>
          ))}

          {loading && (
            <div className="bot-row bot-row--bot">
              <span className="bot-avatar bot-avatar--sm" aria-hidden="true">
                🕵️
              </span>
              <div className="bot-bubble bot-bubble--bot">
                <span className="bot-typing">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && !loading && (
          <div className="bot-sugerencias">
            {SUGERENCIAS.map((s) => (
              <button
                key={s}
                type="button"
                className="bot-chip"
                onClick={() => enviar(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="bot-input">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Pregúntame sobre tus finanzas…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
          />
          <button
            type="button"
            className="bot-send"
            onClick={() => enviar()}
            disabled={loading || !input.trim()}
            aria-label="Enviar"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

export default Bot;

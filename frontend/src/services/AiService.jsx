import { API_BASE_URL } from "../env";

// Pregunta al bot IA. Devuelve { status, data } donde data es
// { respuesta, consultas, finish_reason, iteraciones, truncado_por_iteraciones }.
export const askBot = async (pregunta) => {
  const resp = await fetch(`${API_BASE_URL}/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ pregunta }),
  });

  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    const err = new Error((data && data.message) || "Error al consultar el bot");
    err.status = resp.status;
    throw err;
  }
  return { status: resp.status, data };
};

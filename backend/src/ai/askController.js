const { getClient, MODEL } = require("./openaiClient");
const { buildSystemPrompt } = require("./systemPrompt");
const { runSelect } = require("./queryTool");

const MAX_ITERATIONS = 6; // vueltas del bucle (llamada API + ejecución de tools)
const MAX_PREGUNTA = 2000;

// Definición de la tool para OpenAI Chat Completions (function calling).
const TOOL = {
  type: "function",
  function: {
    name: "consultar_bd",
    description:
      "Ejecuta una consulta SQL de SOLO LECTURA (SELECT) sobre la base de datos de finanzas y devuelve las filas como JSON. " +
      "Úsala para obtener cualquier dato antes de responder al usuario. " +
      "Solo se admiten sentencias SELECT/WITH; cualquier otra cosa (INSERT, UPDATE, DELETE, DDL, SET, ...) se rechaza. " +
      "Dialecto MariaDB. Una sola sentencia, sin ';' final.",
    parameters: {
      type: "object",
      properties: {
        sql: { type: "string", description: "La consulta SELECT a ejecutar." },
      },
      required: ["sql"],
      additionalProperties: false,
    },
  },
};

async function ejecutarConsulta(tc, consultas) {
  let sql;
  try {
    sql = JSON.parse(tc.function.arguments || "{}").sql;
  } catch {
    consultas.push({ error: "argumentos JSON no válidos" });
    return { role: "tool", tool_call_id: tc.id, content: "Error: argumentos JSON no válidos" };
  }
  try {
    const { rows, truncated } = await runSelect(sql);
    consultas.push({ sql, filas: rows.length, truncada: truncated });
    return {
      role: "tool",
      tool_call_id: tc.id,
      content: JSON.stringify({ rows, truncated }),
    };
  } catch (e) {
    consultas.push({ sql, error: e.message });
    return {
      role: "tool",
      tool_call_id: tc.id,
      content: `Error ejecutando la consulta: ${e.message}`,
    };
  }
}

async function ask(req, res) {
  const pregunta = String((req.body && req.body.pregunta) || "").trim();

  if (!pregunta) {
    return res.status(400).json({ message: "Falta 'pregunta' en el body" });
  }
  if (pregunta.length > MAX_PREGUNTA) {
    return res
      .status(400)
      .json({ message: `La pregunta no puede superar ${MAX_PREGUNTA} caracteres` });
  }

  let client;
  try {
    client = getClient();
  } catch (e) {
    return res
      .status(503)
      .json({ message: "El bot no está configurado (falta OPENAI_API_KEY)" });
  }

  const messages = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: pregunta },
  ];
  const consultas = [];

  try {
    let choice;
    let iteraciones = 0;

    for (; iteraciones < MAX_ITERATIONS; iteraciones++) {
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: [TOOL],
        tool_choice: "auto",
      });

      choice = completion.choices[0];
      const msg = choice.message;

      messages.push({
        role: "assistant",
        content: msg.content ?? null,
        ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
      });

      if (msg.refusal) {
        return res.status(200).json({
          respuesta: msg.refusal,
          consultas,
          finish_reason: "refusal",
        });
      }
      if (choice.finish_reason === "content_filter") {
        return res.status(200).json({
          respuesta: "No puedo ayudarte con esa petición.",
          consultas,
          finish_reason: "content_filter",
        });
      }

      const toolCalls = (msg.tool_calls || []).filter(
        (tc) => tc.type === "function" && tc.function.name === TOOL.function.name
      );
      const otras = (msg.tool_calls || []).filter((tc) => !toolCalls.includes(tc));
      for (const tc of otras) {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: "Herramienta no disponible",
        });
      }

      if (toolCalls.length === 0) break;

      for (const tc of toolCalls) {
        messages.push(await ejecutarConsulta(tc, consultas));
      }
    }

    const respuesta = (choice.message.content || "").trim();
    return res.status(200).json({
      respuesta: respuesta || "(el bot no devolvió texto)",
      consultas,
      finish_reason: choice.finish_reason,
      iteraciones: iteraciones + 1,
      truncado_por_iteraciones: iteraciones >= MAX_ITERATIONS,
    });
  } catch (err) {
    console.error("Error en /ai/ask:", err && err.message ? err.message : err);
    return res
      .status(502)
      .json({ message: "Error al consultar el bot", detail: err && err.message });
  }
}

module.exports = { ask };

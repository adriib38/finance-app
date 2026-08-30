# Finance App — Plan de renovación v2

Documento de trabajo. Recoge las features previstas para la v2. Cada una se
desarrollará más adelante en su propia rama/PR. El orden de la lista **no** es
necesariamente el orden de implementación (ver [Roadmap sugerido](#roadmap-sugerido)).

## Estado

| Bloque | Estado |
|---|---|
| Prerequisitos de datos (migraciones, `registros.updated_at`, stats con rango) | ✅ Implementado |
| Feature 6 — Normalizar categorías | ✅ Implementado |
| Feature 1 — Suscripciones recurrentes | ⏳ Pendiente |
| Feature 2 — Resumen "Wrapped" mensual | ⏳ Pendiente |
| Feature 3 — Modo oscuro | ⏳ Pendiente |
| Feature 4 — Filtro de fechas en la home | ✅ Implementado |
| Feature 5 — Dockerizar la app | ⏳ Pendiente |
| Feature 7 — Bot IA (OpenAI + tool `consultar_bd`) | ✅ Implementado (backend + chat `/bot`) |

> **Tras hacer pull hay que reiniciar el backend**: aplica las migraciones solo
> y siembra las categorías base. Las columnas nuevas tienen `DEFAULT`, así que
> un backend antiguo contra la BD ya migrada no se rompe.

## Contexto actual (resumen técnico)

- **Backend**: Node + Express, MySQL/MariaDB (`mysql2` pool). App de **un solo
  usuario** (`admin`, sembrado en cada arranque por `seedAdmin.js`).
- **Tabla `registros`**: `id, concepto, observaciones, categoria, tipo
  ('gasto'|'ingreso'), cantidad, user, created_at`. **No hay columna de fecha
  propia**: todo se ordena/filtra por `created_at` (timestamp de inserción).
- **Stats** (`statsRegistrosService.js`): calcula agregados **globales** del
  usuario, sin rango de fechas.
- **Frontend**: CRA (`react-scripts`), MUI v5, `@mui/x-charts` v7. Mezcla de
  estilos inline, `styled-components` y CSS plano (`App.css`, `index.css`).
  Sin sistema de theming ni tokens de color.
- **Docker**: existe `backend/Dockerfile` (básico, `node:16-alpine`,
  `WORKDIR /`). El frontend no tiene Dockerfile ni hay `docker-compose`.

---

## Feature 1 — Suscripciones recurrentes

Gestionar suscripciones (Netflix 10 €/mes, dominio 12 €/año, etc.) que **generan
automáticamente un `registro` de gasto** en su fecha de renovación, con el
concepto = nombre de la suscripción.

### Modelo de datos

Nueva tabla `subscriptions`:

| campo          | tipo                        | notas |
|----------------|-----------------------------|-------|
| `id`           | VARCHAR(36) PK              | uuid |
| `nombre`       | VARCHAR(255)                | usado como `concepto` del registro generado |
| `cantidad`     | DECIMAL(12,2)               | importe por cargo |
| `categoria`    | VARCHAR(100)                | categoría del registro generado (default "Suscripciones") |
| `periodicidad` | ENUM('mensual','anual')     | |
| `dia_cargo`    | TINYINT                     | día del mes (mensual). Default 1 |
| `mes_cargo`    | TINYINT NULL                | mes del cargo (solo anual) |
| `fecha_inicio` | DATE                        | primer cargo a considerar |
| `fecha_fin`    | DATE NULL                   | null = indefinida |
| `activa`       | BOOLEAN DEFAULT 1           | pausar sin borrar |
| `ultimo_cargo` | DATE NULL                   | fecha del último registro generado (para backfill idempotente) |
| `user`         | VARCHAR(36) FK users        | |
| `created_at`   | TIMESTAMP                   | |

Añadir a `registros` una columna para trazar el origen:

- `subscription_id VARCHAR(36) NULL` (FK a `subscriptions`, `ON DELETE SET NULL`).
  Permite distinguir "gasto automático" de "gasto manual" y evitar duplicados.

> **Decisión tomada**: no hay fecha editable en los registros (solo `created_at`
> / `updated_at` automáticos). Los cargos de suscripción se crean con
> `created_at` = momento de generación; el runner se ejecuta a diario, así que
> el desfase es como mucho de unas horas. Si se necesita backfill de días
> pasados con fecha exacta, se revalorará entonces una columna de fecha propia.

### Generación de cargos

El servidor no corre 24/7 de forma garantizada, así que **no** basta un cron.
Estrategia **backfill idempotente**:

1. Función `runSubscriptionCharges(userUuid)` que, para cada suscripción activa,
   calcula todas las fechas de cargo entre `MAX(ultimo_cargo, fecha_inicio)` y
   `hoy`, y crea un `registro` por cada una que falte.
2. Se dispara:
   - en el arranque del backend (después de `seedAdmin`),
   - opcionalmente vía `node-cron` diario a las 00:05 si el proceso sigue vivo,
   - (fallback) al cargar la home / primer request autenticado del día.
3. Idempotencia garantizada por `ultimo_cargo` + comprobación de
   `subscription_id` + fecha ya existente.

### API

```
GET    /api/v1/subscriptions            lista
POST   /api/v1/subscriptions            crea
PUT    /api/v1/subscriptions/:id        edita (importe, pausa, etc.)
DELETE /api/v1/subscriptions/:id        borra (los registros ya generados se conservan)
POST   /api/v1/subscriptions/run        fuerza el backfill (debug / manual)
```

### Frontend

- Nueva página `/subscriptions` (enlace en el menú de usuario).
- Lista de suscripciones con importe, periodicidad, próximo cargo, toggle activa.
- Formulario alta/edición (reutilizar estilos de `CrearRegistro`).
- En la lista de registros, marcar visualmente los generados por suscripción
  (icono / badge, `RegisterTypeDot` como referencia).

---

## Feature 2 — Resumen mensual "Wrapped"

Vista tipo *Spotify Wrapped*: resumen visual y animado de los datos del **mes
anterior**.

### Entrada

- Banner pequeño en la home (`Inicio.jsx`), encima del dashboard: "Resumen
  Julio 2026 →".
- **Solo se muestra el mes inmediatamente anterior.** En agosto se ve julio; al
  entrar en septiembre, el banner pasa a septiembre→agosto y el de julio deja de
  ofrecerse.
- Opcional: marcar en `localStorage` si ya se ha visto (`wrapped-seen-2026-07`)
  para atenuar el banner una vez consumido.

### Contenido del resumen (slides)

Secuencia de "cards" a pantalla (casi) completa, navegables (swipe / flechas /
auto-avance):

1. Portada — "Tu Julio 2026".
2. Total gastado vs total ingresado (número grande animado, count-up).
3. Balance del mes (ahorro / déficit) y comparación con el mes anterior (%).
4. Categoría estrella de gasto + importe.
5. Día de mayor gasto.
6. Nº de registros / media diaria de gasto.
7. Suscripciones activas ese mes y su coste total (enlaza con Feature 1).
8. Cierre — frase resumen + botón "Ver dashboard".

### API

```
GET /api/v1/stats/monthly?year=2026&month=7
```

Devuelve el objeto con todas las métricas de los slides ya calculadas en el
backend (una sola llamada). Reusar/extender `statsRegistrosService` con filtro
por rango de fechas.

### Frontend

- Componente `MonthlyWrapped` (ruta `/wrapped/:year/:month` o modal a pantalla
  completa).
- Animaciones: bastan CSS transitions + un count-up sencillo; si se quiere más,
  evaluar `framer-motion` (añade dependencia).
- Reutilizar la paleta de `@mui/x-charts` ya usada en `Dashboard`.

> **Decisión pendiente**: ¿modal sobre la home o ruta propia? Recomendado ruta
> propia para poder compartir/recargar.

---

## Feature 3 — Modo oscuro

### Enfoque

1. Definir **tokens de color** como CSS custom properties en `:root` y
   `:root[data-theme="dark"]` (`index.css`). Migrar `App.css` / estilos inline
   más visibles a esas variables.
2. `ThemeContext` (React) con estado `light | dark | system`, persistido en
   `localStorage`, que además crea un **MUI theme** (`createTheme({ palette:
   { mode } })`) y envuelve la app en `ThemeProvider` + `CssBaseline`.
3. Respetar `prefers-color-scheme` cuando el modo es `system`.
4. Toggle en el menú de usuario (`MenuUser.jsx`).

### Puntos de fricción

- Muchos estilos inline con colores hardcodeados (`Dashboard.jsx`,
  `Inicio.jsx`) → hay que sustituirlos por variables o `sx` del theme.
- Colores de las gráficas (`chartConfig.colors`, `BarChartMeses`) deben tener
  variante para fondo oscuro.

---

## Feature 4 — Filtro de fechas en la home ✅

Filtra KPIs y gráficos de la home por periodo.

### Implementado

- **`context/HomeFilterContext.jsx`** — estado del filtro: modo `mes` (por
  defecto) / `anio` / `custom`, y `range` = `{ from, to }` (ISO). Envuelve el
  contenido de la home en `Inicio.jsx`.
- **`components/HomeDateFilter.jsx`** — barra sobre los KPIs: `ToggleButtonGroup`
  "Mes actual" / "Año actual" + dos `<TextField type="date">` (Desde / Hasta);
  editar una fecha pasa a modo `custom`. Muestra el rango activo en texto.
- **`utils/dateRange.js`** — helpers en hora local (`monthRange`, `yearRange`,
  `monthLabel`).
- **KPIs** (`ResumenCards` en `Inicio.jsx`): refetch de
  `/stats/resume?from&to` al cambiar `range`.
- **Quesitos** (`Dashboard.jsx`): fetch de
  `/stats/cantidadCategorias{Gastos,Ingresos}?from&to`; muestra "Sin
  gastos/ingresos en el periodo" cuando toca.
- **`BarChartMeses`** y **`BalanceChart`**: consumen la serie mensual agregada
  del endpoint `/stats/timeline` (ver abajo). Sin cálculo por registro en
  cliente, sin selector de año.
- **La home ya no carga `/misregistros`**: `Inicio` dejó de envolver el
  dashboard en `RegistrosContextProvider`; todo sale de `/stats/*` agregado.
  Se retiró `cantidadCategorias*` de `RegistrosContext`.

Backend: `/stats/resume` y `/stats/cantidadCategorias*` aceptan `?from=&to=`
(validan ISO) y filtran por `DATE(created_at)` vía el helper `rangoFechas` de
`statsRegistrosService`.

### Gráfico de balance mensual (línea)

- **Backend nuevo**: `GET /api/v1/stats/timeline?from&to` →
  `[{ periodo: "2026-01", ingresos, gastos, balance }]`. Un `GROUP BY
  DATE_FORMAT(created_at,'%Y-%m')`; si llega el rango completo rellena los meses
  vacíos con 0 y calcula `balance = ingresos - gastos` en el servidor (el
  frontend solo pinta). `statsRegistrosService.getTimeline`.
- **Frontend**: `shared/CardChart/BalanceChart.jsx` — `LineChart` con área y
  `ChartsReferenceLine y={0}`. `BarChartMeses` reusa la misma serie.

### Nota

- El filtrado usa `created_at` (no hay fecha editable — decisión tomada).
- "Mes actual" → las gráficas de meses muestran solo ese mes (el backend
  devuelve un único periodo). Si se quiere ver siempre el año de contexto,
  pasar `yearRange()` a `/stats/timeline` en vez de `range`.

---

## Feature 6 — Normalizar categorías (tabla maestra)

Hoy `registros.categoria` es texto libre (`<input type="text">` en
`CrearRegistro.jsx`). Eso produce duplicados como `"Compra"` / `"compr"` /
`"compra"`, que ensucian los `GROUP BY categoria` de las stats y las gráficas.

### Modelo de datos

Nueva tabla maestra `categorias`:

| campo        | tipo                     | notas |
|--------------|--------------------------|-------|
| `id`         | VARCHAR(36) PK           | uuid |
| `nombre`     | VARCHAR(100) NOT NULL    | etiqueta visible, editable |
| `tipo`       | ENUM('gasto','ingreso')  | una categoría pertenece a un tipo (o `'ambos'` si se prefiere permitir compartir) |
| `color`     | VARCHAR(7) NULL          | hex, para las gráficas (reemplaza `chartConfig.colors` fijo) |
| `activa`     | BOOLEAN DEFAULT 1        | ocultar sin borrar |
| `orden`      | SMALLINT DEFAULT 0       | orden en los selectores |
| `user`       | VARCHAR(36) FK users     | |
| `created_at` | TIMESTAMP                | |

`UNIQUE (user, tipo, nombre)` para impedir duplicados exactos.

`registros` pasa a referenciar la maestra:

- Añadir `categoria_id VARCHAR(36) NULL` (FK `categorias`, `ON DELETE SET NULL`).
- Mantener `registros.categoria` (texto) de momento como copia denormalizada
  para no romper stats/listado durante la transición; o migrar del todo y
  actualizar los `GROUP BY` para unir por `categoria_id`.

### Migración de datos existentes

Script de migración:

1. `SELECT DISTINCT LOWER(TRIM(categoria)), tipo FROM registros` → crea una fila
   en `categorias` por cada valor único (capitalizando el nombre).
2. Actualiza `registros.categoria_id` haciendo match por nombre normalizado.
3. Deja un informe de los valores "sospechosos de ser el mismo" (distancia de
   edición pequeña, p.ej. `compra`/`compr`) para que el usuario los fusione a
   mano desde el front.

### API

```
GET    /api/v1/categorias?tipo=gasto      lista (filtrable por tipo)
POST   /api/v1/categorias                 crea
PUT    /api/v1/categorias/:id             renombra / cambia color / activa
DELETE /api/v1/categorias/:id             borra (registros quedan con categoria_id NULL)
POST   /api/v1/categorias/:id/merge       fusiona otra categoría en esta
                                          (reasigna registros, borra la absorbida)
```

### Frontend

- **Selector en vez de input libre**: en `CrearRegistro.jsx` (y en la edición
  de registros) sustituir `<input type="text" name="categoria">` por un
  `<Select>` / autocomplete de MUI alimentado por `GET /categorias?tipo=...`.
  El tipo (gasto/ingreso) filtra las opciones disponibles.
  - Permitir "crear categoría nueva" desde el propio autocomplete (Autocomplete
    con `freeSolo` + confirmación), para no obligar a ir a otra pantalla.
- **Página de gestión** `/categorias` (enlace en el menú de usuario):
  - listar por tipo, renombrar inline, cambiar color, activar/desactivar,
    **fusionar** dos categorías (resuelve los `"Compra"`/`"compr"` ya
    existentes), reordenar.
- Las gráficas (`Dashboard.jsx`, `BarChartMeses`) usan el `color` de la
  categoría en lugar de la paleta fija `chartConfig.colors`.

### Interacción con otras features

- **Feature 1 (suscripciones)**: el campo `categoria` de una suscripción pasa a
  ser `categoria_id` (FK a la maestra).
- **Feature 4 (filtro de fechas)** y **Feature 2 (Wrapped)**: los agregados por
  categoría se hacen por `categoria_id`, sin duplicados.
- **Feature 3 (modo oscuro)**: el `color` por categoría debe tener contraste
  suficiente en ambos temas (o guardar par claro/oscuro).

> **Recomendado hacerla pronto** (antes de Feature 1/2/4), porque cambia el
> esquema de `registros` y todas las stats por categoría.

---

## Feature 5 — Dockerizar la app

Objetivo: `docker compose up` levanta DB + backend + frontend.

### Piezas

1. **`backend/Dockerfile`** — reescribir:
   - `node:20-alpine`, `WORKDIR /app`, `COPY package*.json`, `npm ci`,
     `COPY . .`, `EXPOSE 4000`, `CMD ["npm","start"]`.
   - `.dockerignore` ya existe, revisar que excluye `node_modules`, `.env`.
2. **`frontend/Dockerfile`** — nuevo, multi-stage:
   - stage build: `npm ci && npm run build`.
   - stage serve: servir `build/` (nginx, o el `server.js` que ya existe).
   - Ojo: `react-scripts` inyecta las env `REACT_APP_*` **en build time** →
     `API_BASE_URL` debe resolverse en build o servirse como config runtime
     (`env.js` / `window.__ENV`).
3. **`docker-compose.yml`** en la raíz:
   - `db`: `mariadb:10.6`, volumen persistente, `MYSQL_*` envs, healthcheck,
     init con `backend/schema.sql` (montado en
     `/docker-entrypoint-initdb.d/`).
   - `backend`: build `./backend`, `depends_on: db (healthy)`, env desde
     `.env` / compose, puerto `4000`.
   - `frontend`: build `./frontend`, puerto `3006` (o `80`), `depends_on:
     backend`.
4. **CORS**: `app.js` tiene `allowedOrigins` hardcodeado a
   `http://localhost:3006`. Parametrizar con `process.env.CORS_ORIGIN`.
5. **Config**: unificar variables en un `.env` raíz + `.env.example`
   versionado. Documentar en README.
6. Actualizar `memory/local-dev-setup.md` cuando el flujo Docker sustituya al
   manual.

### Pendiente

- ¿`server.js` del frontend usa `PORT` fijo 3001 y sirve `dist/` (Vite), pero
  el build real es CRA → `build/`? Revisar y alinear antes de dockerizar.

---

## Feature 7 — Bot IA sobre tus datos (MVP)

**Estado: implementado** (backend + chat `/bot`).

Un chat al que preguntar en lenguaje natural sobre los datos financieros. Usa la
**API de OpenAI** (Chat Completions + function calling) con **una herramienta
normal** (`consultar_bd`) que ejecuta **SELECT de solo lectura** contra la BD.
Es un *workflow con tool use*.

> Decisión: **opción A — tool normal de la API** (no MCP). El contrato que ve el
> modelo (una tool `consultar_bd(sql)`) es idéntico si más adelante se mueve a
> un servidor MCP, así que empezar así no cierra puertas.

### Flujo de una pregunta

1. `POST /api/v1/ai/ask { pregunta }` (🔒).
2. Backend llama a `chat.completions.create` con `tools: [consultar_bd]` y un
   system prompt con el **esquema de la BD** + reglas del dominio.
3. El modelo devuelve `tool_calls` → `{ sql: "SELECT ..." }`.
4. Backend **valida que es un SELECT**, lo ejecuta con el pool de solo lectura,
   devuelve las filas como mensaje `role: "tool"` (puede encadenar varias).
5. El modelo redacta la respuesta con esos datos.
6. Backend responde `{ respuesta, consultas: [{ sql, filas | error }], finish_reason, iteraciones }`.

Bucle manual: hasta que `message.tool_calls` esté vacío, acumulando los mensajes
`assistant` (con `tool_calls`) y `tool` en el array; tope `MAX_ITERATIONS = 6`.

### Seguridad de la tool `consultar_bd` (solo SELECT)

Defensa en capas:

1. **Usuario MySQL de solo lectura** — `GRANT SELECT ON finance.* TO finance_ro`.
   Pool nuevo con `DB_RO_USER` / `DB_RO_PASSWORD`; si faltan, cae al usuario
   principal con un `console.warn`. Es la garantía real. ✅
2. **`multipleStatements: false`** en ese pool. ✅
3. **Validación de la SQL** (`src/ai/queryTool.js`): tras quitar literales y
   comentarios — una sola sentencia, empieza por `SELECT` / `WITH`, sin `;`
   internos, lista negra de operaciones de escritura/DDL/`SET`/`OUTFILE`, sin
   `information_schema` / `mysql` / etc., y sin `users` + `password` juntos.
   (MVP: regex; robusto: AST con `node-sql-parser`.) ✅
4. **`LIMIT 500` forzado** si no lo trae + **timeout de 5 s** por consulta. ✅
5. **Ocultar columnas sensibles**: `users.password` bloqueada en la validación. ✅
6. (Futuro multi-usuario) forzar `WHERE user = ?` con el uuid del token.

### Contexto para el modelo (system prompt)

- Esquema de `registros`, `categorias`, `users` con tipos (de `schema.sql`).
- Reglas: `tipo` es `'gasto'|'ingreso'`; `cantidad` es `DECIMAL(12,2)` (llega
  como string); balance = ingresos − gastos; las fechas van sobre `created_at`.
- La fecha de hoy.
- Restricción explícita: "solo puedes leer con `consultar_bd`, que solo admite
  SELECT".

### Backend — archivos (✅ implementado)

```
src/ai/
  openaiClient.js     # cliente OpenAI perezoso + MODEL
  systemPrompt.js     # esquema + reglas + fecha de hoy
  dbReadOnly.js       # pool de solo lectura (DB_RO_USER || DB_USER)
  queryTool.js        # validateSelect() + runSelect()
  askController.js    # POST /ai/ask: bucle de tool use (Chat Completions)
src/v1/routes/ai.js   # .post("/ask", verifyToken, ask)
```

- Dep nueva: `openai` (v7).
- `.env`: `OPENAI_API_KEY` (si falta → el endpoint responde `503`, el resto de
  la API va igual), `DB_RO_USER` / `DB_RO_PASSWORD` (recomendadas),
  `AI_MODEL` (opcional).
- Montado en `app.js` en `/api/v1/ai` antes de `registros`.
- Documentado en `backend/README.md`.

### Modelo y coste

- Por defecto **`gpt-4o-mini`** (barato y de sobra para text-to-SQL sobre este
  esquema). Configurable con `AI_MODEL` (p. ej. `gpt-4o`).
- Cada pregunta = 1–3 llamadas a la API.

### Frontend (✅ implementado)

- `services/AiService.jsx` → `askBot(pregunta)` (POST `/ai/ask`, `credentials: include`).
- `components/Bot/Bot.jsx` + `style.css` — chat estilo mensajería con avatar 🕵️
  ("CashBot"): burbujas usuario/bot, indicador de "escribiendo…", chips de
  sugerencias iniciales, y por cada respuesta un desplegable **"N consultas
  SQL"** con el SQL ejecutado y nº de filas (transparencia). Estado local, sin
  contexto ni historial persistido.
- Ruta `/bot` (`ProtectedRoute`) en `App.jsx` + enlace "🕵️ Bot" en `HeaderApp`.
- Errores: `503` → mensaje "el bot no está configurado"; resto → burbuja de error.

### Pasos del MVP

1. ~~Backend: pool de solo lectura + tool `consultar_bd` + `POST /ai/ask`.~~ ✅
2. ~~Usuario `finance_ro` en la BD + `OPENAI_API_KEY` en `.env`.~~ ✅
3. ~~Frontend: chat.~~ ✅
4. Probar end-to-end en la UI (consume API de OpenAI de verdad).

### Riesgos asumidos en el MVP

- **Prompt injection por datos** (un `concepto` con "ignora tus instrucciones…"):
  puede desviar la *respuesta*, pero con usuario RO + validación SELECT no puede
  escribir ni salir de los datos del usuario.
- Coste por pregunta.
- El modelo puede inventar una columna → el error SQL vuelve como mensaje `tool`
  y reintenta.
- Precisión en agregados monetarios (DECIMAL como string) — recordado en el
  system prompt.
- Sin rate-limit todavía (solo el tope `MAX_ITERATIONS`).

### Evolución posible (fuera del MVP)

- Historial de conversación multi-turno; streaming de la respuesta.
- Rate-limit por usuario.
- Mover `consultar_bd` a un **servidor MCP local (stdio)** + puente en el
  backend, sin tocar prompt ni UI.

---

## Cambios transversales / prerequisitos

| Prerequisito | Beneficia a | Estado |
|---|---|---|
| `registros.updated_at` (timestamp automático) + `created_at` visibles en `/list` | — | ✅ |
| Tabla maestra `categorias` + `registros.categoria_id` + migración/fusión de valores existentes | Feature 6 (es la feature), y limpia los agregados de 1, 2, 4 | ✅ |
| `statsRegistrosService` con filtro por rango de fechas (sobre `created_at`) | Feature 2, Feature 4 | ✅ |
| Tokens de color CSS + MUI ThemeProvider | Feature 3, Feature 2 (slides) | ⏳ |
| Parametrizar CORS y config por env | Feature 5 | ⏳ |
| Script de migraciones de BD | Feature 1, Feature 4, Feature 6 | ✅ |

### Lo implementado (prerequisitos + Feature 6)

**Infra de migraciones** — `backend/src/migrate.js` + `backend/src/migrations/`.
Runner mínimo que aplica en orden ficheros `.sql` y `.js` (un `.js` exporta
`up(conn)`), registra lo aplicado en `schema_migrations` y corre solo al
arrancar (`main.js`) o con `npm run migrate`. Migraciones actuales: `001`
baseline, `002`+`005` (columna `fecha`, luego descartada), `003` tabla
`categorias` + `registros.categoria_id`, `004` (JS) siembra categorías desde los
registros existentes y los enlaza, `006` sustituye `fecha` por
`registros.updated_at` (timestamp automático `ON UPDATE`).

**Fechas del registro** — un registro solo tiene `created_at` (creación) y
`updated_at` (última modificación), **ambas automáticas**, sin campo de fecha
editable. `getRegistrosFromUser` devuelve las dos; `ListaRegistros` las muestra
como columnas **Creación** y **Actualización** (esta última resaltada si difiere
de la creación) y ordena por creación desc.

**Stats con rango** — `getStats` y `getCantidadCategoriasTipo` aceptan
`{ from, to }`; el controller lee `?from=&to=` (valida ISO) y filtra por
`DATE(created_at)`. Falta conectar la UI (Feature 4). Los servicios del
frontend ya serializan el rango.

**Feature 6 — categorías**
- Backend: `models/Categoria.js`, `controllers/categoriasController.js`,
  `v1/routes/categorias.js` montado en `/api/v1/categorias`. CRUD +
  `POST /:id/merge` (reasigna registros y borra la absorbida). `seedCategorias.js`
  siembra un set base idempotente para el admin en cada arranque.
- `registros` guarda `categoria_id` **y** `categoria` (texto sincronizado): al
  renombrar/fusionar una categoría se actualiza el texto de sus registros; al
  borrarla, `categoria_id` queda NULL y el texto se conserva.
- **Crear registro exige `categoria_id`** (categoría existente de la tabla
  maestra); el backend rechaza texto libre y valida que la categoría sea del
  mismo `tipo` que el registro.
- Stats por categoría agrupan por `categoria_id` con `LEFT JOIN categorias` y
  devuelven el `color` (los valores de texto libre heredados sin enlazar salen
  con id `txt:<nombre>` y color `null`).
- Frontend: `CategoriasContext` + `CategoriasService`, página `/categorias`
  (añadir, renombrar, color, activar/ocultar, eliminar, fusionar) enlazada desde
  la barra de navegación (`HeaderApp`) y el menú de usuario. En `CrearRegistro`
  la categoría es un `<select>` nativo que **solo** lista categorías activas del
  tipo elegido. En `ListaRegistros` la columna es `singleSelect` y reasigna el
  `categoria_id` al editar. Las gráficas usan el color de cada categoría
  (`value` se castea a `Number`).
- Colores por defecto: `backend/src/utils/palette.js`.

**Pendiente / mejoras**
- Informe de "posibles duplicados" (distancia de edición) en la pantalla de
  gestión — ahora la fusión es manual sin sugerencias.
- Reordenar categorías por drag (el campo `orden` existe pero la UI no lo edita).
- Colores con par claro/oscuro para Feature 3.

## Roadmap sugerido

1. ~~**Prerequisitos de datos**: script de migraciones + `registros.updated_at` +
   `statsRegistrosService` con rango.~~ ✅
2. ~~**Feature 6** (normalizar categorías).~~ ✅
3. ~~**Feature 4** (filtro de fechas).~~ ✅
4. **Feature 7** (bot IA) — MVP con tool normal; reusa `schema.sql` y el pool.
5. **Feature 1** (suscripciones) — reusa `categoria_id` y añade el runner de cargos.
6. **Feature 3** (modo oscuro) — tokens de color, base para lo visual.
7. **Feature 2** (Wrapped) — encima de stats-con-rango + tokens de color.
8. **Feature 5** (Docker) — se puede adelantar en paralelo en cualquier momento.

## Preguntas abiertas

- Suscripciones: ¿editar el importe afecta solo a cargos futuros (sí) — se
  confirma? ¿Y borrar una suscripción conserva los registros ya generados (sí)?
- Wrapped: ¿modal o ruta propia? ¿se puede volver a ver un mes ya pasado desde
  algún historial, o solo el mes anterior una vez?
- Modo oscuro: ¿incluir opción `system` o solo `light`/`dark`?
- Docker: ¿frontend servido con nginx o con el `server.js` de Node existente?
- Categorías: ¿una categoría es exclusiva de un tipo (`gasto` **o** `ingreso`) o
  se permite compartir (`ambos`)? ¿Se mantiene `registros.categoria` como texto
  denormalizado durante la transición o se migra del todo de golpe?
- Bot IA: modelo por defecto `gpt-4o-mini` (cambiable con `AI_MODEL`). Validación
  de SQL con regex en el MVP; ¿pasar a `node-sql-parser`? ¿Historial de
  conversación o cada pregunta aislada (ahora aislada)?

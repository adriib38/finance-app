# Finance App — Backend

API REST en **Node.js + Express** con base de datos **MySQL / MariaDB**.
Aplicación de **un solo usuario** (cuenta `admin`): no hay registro ni baja de
cuentas.

---

## Stack

| | |
|---|---|
| Runtime | Node.js |
| Framework | Express 4 |
| BD | MySQL / MariaDB, acceso con `mysql2` (pool) |
| Auth | JWT en cookie `httpOnly` (`jsonwebtoken`) + `bcryptjs` |
| Otros | `cors`, `cookie-parser`, `morgan`, `dotenv`, `uuid` |

> `swagger-jsdoc` / `swagger-ui-express` están en `dependencies` pero **no están
> montados** actualmente (no hay ruta de Swagger en `app.js`).

---

## Puesta en marcha

### Requisitos

- Node.js
- Una BD MariaDB/MySQL accesible. Para desarrollo:
  ```bash
  docker run -d --name finance-db \
    -e MYSQL_ROOT_PASSWORD=finance -e MYSQL_DATABASE=finance \
    -e MYSQL_USER=finance -e MYSQL_PASSWORD=finance \
    -p 3306:3306 mariadb:10.6
  ```

### Variables de entorno (`backend/.env`, no versionado)

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto `3000`) |
| `DB_HOST` | Host de la BD |
| `DB_USER` | Usuario de la BD |
| `DB_PASSWORD` | Contraseña de la BD |
| `DB_DATABASE` | Nombre de la base de datos |
| `JWT_SECRET` | Secreto para firmar los JWT |
| `SALT_ROUNDS` | Rondas de `bcrypt` (por defecto `10`) |
| `ADMIN_USERNAME` | Usuario de la única cuenta (por defecto `admin`) |
| `ADMIN_PASSWORD` | Contraseña de la única cuenta (**obligatoria**) |

### Arranque

```bash
npm install
npm start          # arranca en PORT
npm run migrate    # aplica migraciones sin arrancar el servidor
```

Al arrancar (`src/main.js`) el servidor, **en este orden**:

1. **Migraciones** — aplica las pendientes de `src/migrations/`.
2. **`seedAdmin`** — crea/sincroniza la cuenta `admin` con `ADMIN_USERNAME` /
   `ADMIN_PASSWORD`, reasigna a `admin` los registros de cualquier otra cuenta y
   borra las demás cuentas.
3. **`seedCategorias`** — inserta un conjunto base de categorías para `admin`
   (idempotente).
4. Escucha en `PORT`.

Si algo falla en el arranque, el proceso sale con código `1`.

---

## Estructura

```
src/
├── main.js                     # entrypoint: migraciones → seed → listen
├── app.js                      # Express: CORS, middlewares, montaje de rutas, handlers de error
├── database.js                 # pool mysql2
├── migrate.js                  # runner de migraciones
├── seedAdmin.js                # cuenta única
├── seedCategorias.js           # categorías base
├── migrations/                 # 001_*.sql, 004_*.js, ... (ordenadas por nombre)
├── scripts/
│   └── seedTestData.js         # genera registros ficticios (dev)
├── v1/routes/
│   ├── auth.js                 # /api/v1  (signin, signout, user)
│   ├── categorias.js           # /api/v1/categorias
│   ├── registros.js            # /api/v1  (registros)
│   └── stats.js                # /api/v1/stats
├── controllers/
│   ├── authController.js
│   ├── registrosController.js
│   ├── categoriasController.js
│   ├── statsRegistrosController.js
│   └── middlewares/verifyJWT.js
├── models/
│   ├── User.js
│   ├── Registro.js
│   └── Categoria.js
├── services/
│   └── statsRegistrosService.js
└── utils/
    ├── validators.js
    └── palette.js
```

---

## Base de datos

Esquema completo en [`schema.sql`](./schema.sql). La **fuente de verdad** son
las migraciones; `schema.sql` es una foto del estado resultante (útil para
inicializar una BD desde cero).

### Tablas

- **`users`** — `uuid` (PK), `username` (único), `password` (hash bcrypt), `created_at`.
- **`categorias`** — `id` (PK), `nombre`, `tipo` (`gasto`|`ingreso`), `color`
  (hex), `activa`, `orden`, `user` (FK → `users.uuid`), `created_at`.
  Único: `(user, tipo, nombre)`.
- **`registros`** — `id` (PK), `concepto`, `observaciones`, `categoria` (texto
  denormalizado), `categoria_id` (FK → `categorias.id`, `ON DELETE SET NULL`),
  `tipo`, `cantidad` (`DECIMAL(12,2)`), `user` (FK → `users.uuid`),
  `created_at`, `updated_at` (automático `ON UPDATE CURRENT_TIMESTAMP`).
- **`schema_migrations`** — `name` (PK), `applied_at`. Control de migraciones.

> `registros.categoria` (texto) se mantiene **sincronizado** con
> `categorias.nombre`: al renombrar o fusionar una categoría se actualiza el
> texto de sus registros; al borrarla, `categoria_id` pasa a `NULL` y el texto
> se conserva.

### Migraciones

- `src/migrate.js` aplica en orden alfabético los ficheros de `src/migrations/`:
  - `*.sql` — se ejecuta tal cual (soporta múltiples sentencias).
  - `*.js` — exporta `async function up(conn)` (conexión `mysql2/promise` con
    `multipleStatements`).
- Cada fichero aplicado se registra en `schema_migrations` y no se repite.
- Se ejecuta en cada arranque y con `npm run migrate`.

### Datos de prueba (dev)

```bash
node src/scripts/seedTestData.js 250          # 250 registros ficticios repartidos por 2026
node src/scripts/seedTestData.js 250 --reset  # borra los ficticios previos y regenera
```
Los ficticios llevan `observaciones` con prefijo `[seed]`.

---

## Autenticación

- `POST /api/v1/signin` devuelve una cookie **`access_token`** (JWT):
  `httpOnly`, `secure: true`, `sameSite: strict`, expira en **1 hora**.
- El middleware **`verifyToken`** protege las rutas marcadas con 🔒: lee
  `req.cookies.access_token`, verifica con `JWT_SECRET` y expone `req.userUuid`.
  - Sin cookie → **403** `{ "message": "No token provided" }`
  - Token inválido/expirado → **401** `{ "message": "Unauthorized", "err": … }`
- `POST /api/v1/signout` sobrescribe la cookie para invalidarla en cliente.

### CORS

`app.js` sólo permite el origen **`http://localhost:3006`** y `credentials: true`.
Las peticiones **sin cabecera `Origin`** (p. ej. `curl`, Postman) se permiten.

---

## Endpoints

Base: `http://<host>:<PORT>`. Prefijo de la API: `/api/v1`.
🔒 = requiere cookie `access_token`. Todas las respuestas son JSON.

### Salud

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` / `*` | `/status` | — | `200 { "message": "Okay :)" }` |

---

### Auth — `/api/v1`

#### `POST /api/v1/signin`
Inicia sesión y setea la cookie `access_token`.

- **Body**: `{ "username": string, "password": string }`
  (el `username` se normaliza: minúsculas, sin espacios)
- **Respuestas**:
  - `200` → `{ "user": { uuid, username, password, created_at } }` + `Set-Cookie: access_token`
  - `400` → faltan campos o no pasan validación (`username` 3–20, `password` 8–128)
  - `404` → `{ "message": "User not found" }`
  - `401` → `{ "message": "Invalid password" }`
  - `500` → error de BD

#### `POST /api/v1/signout`
- **Respuestas**: `200` → `{ "message": "User logged out successfully" }` (expira la cookie)

#### `GET /api/v1/user` 🔒
Datos de la cuenta autenticada.

- **Respuestas**:
  - `200` → `{ "user": { username, created_at } }`
  - `404` → `{ "message": "User not found" }`
  - `401` / `403` → sin token o token inválido
  - `500` → error de BD

---

### Categorías — `/api/v1/categorias` 🔒

Objeto **categoría**: `{ id, nombre, tipo, color, activa, orden, created_at }`.

#### `GET /api/v1/categorias`
- **Query** (opcional): `tipo=gasto` | `tipo=ingreso`
- **Respuestas**: `200` → `Categoria[]` (ordenadas por `tipo`, `orden`, `nombre`)

#### `POST /api/v1/categorias`
- **Body**: `{ "nombre": string, "tipo": "gasto"|"ingreso", "color"?: "#rrggbb" }`
  (si no se pasa `color`, se asigna uno de la paleta)
- **Respuestas**:
  - `201` → `Categoria`
  - `400` → `nombre` vacío / `tipo` inválido / `color` no es hex `#rrggbb`
  - `409` → `{ "message": "Ya existe una categoría con ese nombre y tipo" }`

#### `PUT /api/v1/categorias/:id`
Actualización parcial.

- **Body**: cualquiera de `{ "nombre"?: string, "color"?: "#rrggbb"|null, "activa"?: boolean, "orden"?: number }`
- **Efecto lateral**: si cambia `nombre`, se actualiza `registros.categoria` de sus registros.
- **Respuestas**: `200` → `Categoria` · `400` · `404` categoría no encontrada · `409` duplicado

#### `DELETE /api/v1/categorias/:id`
- **Respuestas**:
  - `200` → `{ "message": "Categoría eliminada" }`
  - `404` → no encontrada
- Los registros que la usaban quedan con `categoria_id = NULL` (conservan el texto).

#### `POST /api/v1/categorias/:id/merge`
Fusiona otra categoría dentro de `:id`: reasigna sus registros y la borra.

- **Body**: `{ "sourceId": string }` (categoría a absorber; `:id` es el destino)
- **Respuestas**:
  - `200` → `Categoria` (destino)
  - `400` → `sourceId` ausente, misma categoría, tipo distinto o categoría inexistente

---

### Registros — `/api/v1` 🔒

Objeto **registro** (en `/misregistros`): `{ id, concepto, observaciones, tipo, cantidad, categoria, categoria_id, created_at, updated_at }`.

#### `GET /api/v1/misregistros`
Registros del usuario autenticado.

- **Respuestas**: `200` → `Registro[]`

#### `POST /api/v1/`
Crea un registro. **La categoría debe existir en la tabla maestra.**

- **Body**: `{ "concepto": string, "observaciones": string, "categoria_id": string, "tipo": "gasto"|"ingreso", "cantidad": number }`
- **Respuestas**:
  - `201` → `{ "message": "Created succesfull", "newRegistro": { … } }`
  - `400` → faltan campos, `categoria_id` no existe, o su `tipo` no coincide con el del registro
- `created_at` = `updated_at` = ahora. No hay fecha editable.

#### `PUT /api/v1/:id`
Actualización parcial. Sólo el propietario.

- **Body**: cualquiera de `{ "concepto"?, "observaciones"?, "categoria_id"? | "categoria"?, "tipo"?, "cantidad"? }`
  - Con `categoria_id` se re-enlaza a la maestra y se sincroniza el texto.
  - Con `categoria` (texto) se guarda el texto y `categoria_id` pasa a `NULL`.
- **Respuestas**:
  - `200` → `{ "message": "Updated succesfull", "newRegistro": { … } }`
  - `400` → sin campos para actualizar / `categoria_id` no existe
  - `403` → el registro no es del usuario
  - `404` → `{ "message": "Registro not found" }`
- `updated_at` se actualiza solo.

#### `DELETE /api/v1/:id`
Sólo el propietario.

- **Respuestas**:
  - `200` → `{ "message": "Registro deleted successfully" }`
  - `403` → no es del usuario · `404` → no existe

#### `GET /api/v1/` · `GET /api/v1/:id` · `GET /api/v1/c/:categoria`

| Ruta | Descripción | Respuesta |
|---|---|---|
| `GET /api/v1/` | Todos los registros | `200` `Registro[]` |
| `GET /api/v1/:id` | Un registro por id (incluye `user`) | `200` registro; **id inexistente → `200` con cuerpo vacío** (no 404) |
| `GET /api/v1/c/:categoria` | Registros cuyo texto `categoria` coincide | `200` `Registro[]` |

> ⚠️ **Nota de alcance**: estas tres rutas **no filtran por usuario** ni
> comprueban propiedad (`SELECT *` global). En una app de un solo usuario no es
> un problema práctico, pero conviene tenerlo en cuenta si se abre a multi-usuario.
> El frontend usa `/misregistros`.
>
> Como `registros` está montado en `/api/v1` con `GET /:id`, **cualquier
> `GET /api/v1/<algo>` no reconocido cae en `getRegistroById`** y devuelve `200`
> con cuerpo vacío en lugar de `404`.

---

### Stats — `/api/v1/stats` 🔒

Todas aceptan un **rango de fechas opcional** por query string:
`?from=YYYY-MM-DD&to=YYYY-MM-DD` (se validan con regex ISO; se filtra por
`DATE(created_at)`). Sin rango → sobre todos los registros del usuario.

#### `GET /api/v1/stats/resume`
Resumen numérico.

```json
{
  "Número de registros": 250,
  "Número de gastos": "190",
  "Número de ingresos": "60",
  "Gastos (€)": "34332.74",
  "Ingresos (€)": "28463.21",
  "Categoría moda gastos": "Alquiler",
  "Categoría moda ingresos": "Nómina"
}
```

#### `GET /api/v1/stats/cantidadCategoriasGastos`
#### `GET /api/v1/stats/cantidadCategoriasIngresos`
Suma por categoría (gastos / ingresos respectivamente), ordenada desc.

```json
[
  { "id": "f8adf6c8-…", "value": "23019.14", "label": "Alquiler", "color": "#F29E4C" },
  { "id": "txt:LegacyNoEnlazada", "value": "12.00", "label": "LegacyNoEnlazada", "color": null }
]
```
- `id` es el uuid de la categoría maestra, o `txt:<nombre>` para valores de
  texto heredados sin enlazar (`color` → `null`).

#### `GET /api/v1/stats/timeline`
Serie mensual: ingresos, gastos y **balance = ingresos − gastos** por mes.

```json
[
  { "periodo": "2026-01", "ingresos": 1871.23, "gastos": 3172.59, "balance": -1301.36 },
  { "periodo": "2026-02", "ingresos":  541.56, "gastos": 3765.45, "balance": -3223.89 }
]
```
- `GROUP BY DATE_FORMAT(created_at, '%Y-%m')`.
- Si se pasan **`from` y `to`**, rellena con `0` los meses del rango sin datos.
- Todos los importes ya vienen como números redondeados a 2 decimales.

---

## Errores globales

| Situación | Respuesta |
|---|---|
| Ruta que no casa con ningún patrón (p. ej. `GET /foo`, `POST /api/v1/foo`) | `404` → `{ "error": "Endpoint not Found", "endpoint": "<url>" }` |
| `GET /api/v1/<algo>` no reconocido | cae en `getRegistroById` → `200` cuerpo vacío (ver nota en Registros) |
| Error no capturado | `500` → `{ "error": "Internal Server Error", "message": "<msg>" }` |

Los controladores devuelven además errores específicos (`400/401/403/404/409/500`)
con forma `{ "message": … }` (a veces `{ "status": "ERROR", "data": … }` en
`PUT /registros`).

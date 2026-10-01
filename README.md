# Finance App

App personal de gestión de finanzas (gastos e ingresos): registra movimientos por
categorías, visualiza estadísticas (resumen, por categoría, evolución mensual) y
pregúntale a un bot con IA sobre tus propios datos, en lenguaje natural.

Es una app de **un solo usuario** (pensada para uso personal, sin registro
público de cuentas) construida como proyecto para aprender/practicar un stack
full-stack típico: React + Node/Express + MySQL.

## ✨ Funcionalidades

- **Registros**: alta, edición y borrado de gastos/ingresos con concepto,
  categoría, cantidad y observaciones.
- **Categorías**: personalizables (nombre, color, tipo gasto/ingreso), con
  fusión de categorías duplicadas.
- **Estadísticas**: resumen numérico, gasto/ingreso por categoría y timeline
  mensual con balance, filtrables por rango de fechas.
- **Bot IA**: responde preguntas en lenguaje natural sobre tus movimientos
  (usa la API de OpenAI + una tool de solo lectura contra la BD).
- **Auth**: sesión con JWT en cookie `httpOnly`, cuenta única definida por
  variables de entorno (sin registro/alta de usuarios).

## 🧱 Stack

| | |
|---|---|
| Frontend | React 18 (CRA) + MUI v5 + `@mui/x-charts` |
| Backend | Node.js + Express 4 |
| Base de datos | MySQL / MariaDB (`mysql2`) |
| Auth | JWT + `bcryptjs` |
| Bot IA | API de OpenAI (function calling) |

## 📂 Estructura

```
backend/            API REST (Express) — ver backend/README.md para el detalle completo
  Dockerfile           imagen del backend
frontend/           SPA (React)
docker-compose.yml   backend + base de datos MariaDB, listos con un solo comando
scripts/
  start-app.sh          arranque conjunto para desarrollo local (sin Docker) — entorno normal
  start-test.sh         ídem, pero contra el entorno de pruebas aislado (ver más abajo)
```

## 🚀 Levantar el proyecto en local

### 1. Clona el repo

```bash
git clone https://github.com/adriib38/finance-app.git
cd finance-app
```

### 2. Backend + base de datos (Docker, recomendado)

Requiere **Docker** y **Docker Compose**. Es la forma más sencilla: levanta la
API y una MariaDB ya conectadas entre sí, aplica migraciones y siembra la
cuenta `admin` automáticamente.

```bash
cp .env.example .env    # rellena JWT_SECRET y ADMIN_PASSWORD como mínimo
docker compose up -d --build
```

Esto deja el backend escuchando en `http://localhost:4000` (o el `PORT` que
pongas en `.env`) y una MariaDB persistida en un volumen Docker. Comandos
útiles:

```bash
docker compose logs -f backend   # ver logs (migraciones, seed, requests)
docker compose down              # parar todo (los datos persisten)
docker compose down -v           # parar y borrar también los datos de la BD
```

`OPENAI_API_KEY` es opcional en el `.env`: si no la rellenas, el endpoint del
bot IA responde `503` y el resto de la API funciona igual.

<details>
<summary>Alternativa sin Docker (Node + MySQL/MariaDB propios)</summary>

```bash
# Base de datos
docker run -d --name finance-db \
  -e MYSQL_ROOT_PASSWORD=finance -e MYSQL_DATABASE=finance \
  -e MYSQL_USER=finance -e MYSQL_PASSWORD=finance \
  -p 3306:3306 mariadb:10.6

# Backend
cd backend
cp .env.example .env   # rellena los valores (ver backend/README.md)
npm install
npm start               # aplica migraciones, siembra la cuenta admin y arranca en $PORT
```

</details>

### 3. Frontend

El frontend no está dockerizado todavía; se levanta con Node. Necesita
`frontend/src/env.js` (no versionado) apuntando al backend:

```js
// frontend/src/env.js
export const API_BASE_URL = "http://localhost:4000/api/v1";
```

```bash
cd frontend
npm install
PORT=3006 BROWSER=none npm start
```

> ⚠️ El backend solo permite CORS desde `http://localhost:3006` por defecto
> (ampliable con `ALLOWED_ORIGINS`), así que el frontend debe correr en ese
> puerto exacto en local salvo que cambies esa variable.

`API_BASE_URL` también se puede fijar con la variable `REACT_APP_API_BASE_URL`
al arrancar, sin tocar `env.js` — así es como funciona el entorno de pruebas
(ver más abajo).

### Alternativa: script único

`scripts/start-app.sh` arranca la BD (si el contenedor `finance-db` ya
existe, es decir, con el flujo manual sin `docker compose`), el frontend en
segundo plano y el backend en primer plano, y abre el navegador
automáticamente.

```bash
./scripts/start-app.sh
```

Toda la referencia de variables de entorno, endpoints, esquema de BD y
migraciones está documentada en **[backend/README.md](./backend/README.md)**.

## 🧪 Entorno de pruebas (aislado de tus datos reales)

Si ya tienes la app levantada con datos de verdad (el flujo de arriba, lo que
este repo llama "producción" aunque sea solo tu máquina), **no reutilices esa
base de datos para desarrollar**: una migración mal escrita, un `DELETE` de
más al probar, o un seed de datos ficticios acabarían mezclados con tus
movimientos reales. La solución es un segundo contenedor de BD, totalmente
separado, con sus propios puerto, credenciales y volumen.

| | Normal / producción | Pruebas |
|---|---|---|
| Contenedor BD | `finance-db` | `finance-db-test` |
| Puerto BD | `3306` | `3307` |
| Puerto backend | `4000` | `4001` |
| Puerto frontend | `3006` | `3007` |
| Backend usa | `backend/.env` | `backend/.env.test` |
| Arranque | `scripts/start-app.sh` | `scripts/start-test.sh` |

### 1. Crear el contenedor de BD de pruebas (una sola vez)

```bash
docker run -d --name finance-db-test \
  -e MYSQL_ROOT_PASSWORD=finance_test -e MYSQL_DATABASE=finance_test \
  -e MYSQL_USER=finance_test -e MYSQL_PASSWORD=finance_test \
  -p 3307:3306 -v finance-db-test-data:/var/lib/mysql mariadb:10.6
```

### 2. Configurar el backend de pruebas

```bash
cd backend
cp .env.test.example .env.test   # ya viene apuntando a finance-db-test/3307/4001
```

### 3. Arrancar todo junto

```bash
./scripts/start-test.sh
```

Arranca (o reanuda si ya existe) `finance-db-test`, el backend en el puerto
`4001` (aplica migraciones y siembra la cuenta admin igual que en
producción, pero contra la BD de pruebas) y el frontend en el `3007` apuntando
a ese backend. Entra con `admin` / la contraseña que pusieras en
`ADMIN_PASSWORD` dentro de `.env.test`.

### 4. Rellenar con datos ficticios (opcional)

```bash
cd backend
npm run seed:demo-octubre   # ~25 registros realistas, fijos, solo octubre 2026
npm run seed:random -- 250  # 250 registros aleatorios repartidos por 2026 (volumen)
```

Ambos se niegan a ejecutarse si `DB_DATABASE` no contiene `"test"`, como
salvaguarda extra para no poder rellenar producción con datos falsos por
error. Detalle de cada uno en
[backend/README.md § Datos de prueba](./backend/README.md#datos-de-prueba-dev).

Puedes destruir y recrear `finance-db-test` cuando quieras sin ningún riesgo
(`docker rm -f finance-db-test && docker volume rm finance-db-test-data`,
luego vuelve al paso 1).

## 🤝 Cómo colaborar

¡Se aceptan PRs! El flujo habitual:

1. Haz un **fork** del repo (o crea una rama si ya tienes acceso de escritura).
2. Crea una rama descriptiva desde `main`, por ejemplo `feature/nombre-corto`
   o `fix/nombre-corto`.
3. Antes de abrir el PR, comprueba que:
   - el backend arranca sin errores (`npm start` en `backend/`, o
     `docker compose up --build`);
   - el frontend compila (`npm start` en `frontend/`);
   - si tocas el esquema de BD, añades una migración nueva en
     `backend/src/migrations/` (no edites migraciones ya aplicadas).
4. Abre el PR contra `main` describiendo qué cambia y por qué.

Para empezar a colaborar:
- Abre un **issue** en GitHub para reportar bugs o proponer features antes de
  ponerte a picar código, así se puede discutir el enfoque.

## 📚 Más documentación

- [backend/README.md](./backend/README.md) — variables de entorno, endpoints
  de la API, esquema de base de datos, migraciones y colección de Postman.

## 📄 Licencia

[MIT](./LICENSE) — © 2026 Adrián Benítez.

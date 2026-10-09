# Finance App — Frontend

SPA en **React 18** (Create React App) + MUI v5.

## Requisitos

- Node.js
- Un backend corriendo (ver [`../backend/README.md`](../backend/README.md)).
- `src/env.js` (no versionado, gitignored) apuntando a la URL de ese backend:

  ```js
  // frontend/src/env.js
  export const API_BASE_URL = "http://localhost:4000/api/v1";
  ```

  `API_BASE_URL` también se puede fijar con la variable de entorno
  `REACT_APP_API_BASE_URL` al arrancar (p. ej. para apuntar a otro backend
  sin tocar el fichero); si no está definida, se usa el valor hardcodeado en
  `env.js`.

## Arranque

```bash
npm install
PORT=3006 BROWSER=none npm start
```

> ⚠️ El backend por defecto solo permite CORS desde `http://localhost:3006`
> (ver `ALLOWED_ORIGINS` en el backend para añadir más orígenes), así que en
> local el frontend debe correr en ese puerto exacto para hablar con un
> backend que use la configuración por defecto.

### Entorno de pruebas

`npm run start:test` arranca en el puerto **3007** con
`REACT_APP_API_BASE_URL=http://localhost:4001/api/v1` ya fijado — pensado
para hablar con el backend de pruebas (`npm run start:test` en `backend/`).
Detalle completo del entorno de pruebas (BD separada, scripts de arranque
conjunto) en el [README.md de la raíz](../README.md#-entorno-de-pruebas-aislado-de-tus-datos-reales).

```bash
npm run start:test
```

## Tests unitarios

Tests con Jest (vía `react-scripts test`, incluido en Create React App) para
la lógica pura: validaciones de formularios (`src/utils.js`,
`src/shared/ValidateRows.jsx`) y helpers de rango/formato de fechas
(`src/utils/dateRange.js`). Viven en carpetas `__tests__/` junto al código
que cubren.

```bash
npm test             # modo watch interactivo
CI=true npm test     # una sola pasada, sin watch (el que usa CI)
```

## Build de producción

```bash
npm run build
```

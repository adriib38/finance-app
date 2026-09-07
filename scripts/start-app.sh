#!/usr/bin/env bash
# Levanta backend + frontend de finance-app.
# Esta terminal queda mostrando los logs en vivo del BACKEND.
# El frontend corre en segundo plano; su log va a frontend.log.

set -uo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
FRONTEND_LOG="$APP_DIR/scripts/frontend.log"
FRONTEND_PORT=3006

# Cargar nvm/node (el lanzador de escritorio no hereda el PATH del shell interactivo)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  \. "$NVM_DIR/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: no se encontró node en el PATH. Revisa la instalación de nvm/node." >&2
  read -rp "Pulsa Enter para cerrar..." _
  exit 1
fi

FRONTEND_PID=""
cleanup() {
  echo ""
  echo "Cerrando frontend (PID ${FRONTEND_PID:-?})..."
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "=== finance-app ==="
echo "Backend dir : $BACKEND_DIR"
echo "Frontend dir: $FRONTEND_DIR (log en $FRONTEND_LOG)"
echo ""

if command -v docker >/dev/null 2>&1 && docker inspect finance-db >/dev/null 2>&1; then
  if [ "$(docker inspect -f '{{.State.Running}}' finance-db)" != "true" ]; then
    echo ">> Arrancando contenedor de base de datos (finance-db)..."
    docker start finance-db >/dev/null
    sleep 3
  fi
fi

echo ">> Iniciando frontend en segundo plano (puerto $FRONTEND_PORT)..."
(
  cd "$FRONTEND_DIR" || exit 1
  PORT="$FRONTEND_PORT" BROWSER=none npm start
) >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo ">> Frontend PID $FRONTEND_PID, esperando a que arranque..."
(
  # Espera a que el frontend responda y abre el navegador
  for _ in $(seq 1 60); do
    if curl -s -o /dev/null "http://localhost:$FRONTEND_PORT"; then
      xdg-open "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1
      break
    fi
    sleep 1
  done
) &

echo ">> Iniciando backend (logs en vivo abajo). Ctrl+C para detener todo."
echo "-----------------------------------------------------------------"
cd "$BACKEND_DIR" || exit 1
npm start

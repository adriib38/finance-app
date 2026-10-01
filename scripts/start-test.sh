#!/usr/bin/env bash
# Levanta el ENTORNO DE PRUEBAS de finance-app: contenedor finance-db-test
# (puerto 3307, datos ficticios) + backend (puerto 4001) + frontend (puerto
# 3007). No toca finance-db ni los puertos 3306/3006/4000 de producción.
# Esta terminal queda mostrando los logs en vivo del BACKEND de pruebas.
# El frontend corre en segundo plano; su log va a frontend-test.log.

set -uo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
FRONTEND_LOG="$APP_DIR/scripts/frontend-test.log"
FRONTEND_PORT=3007
DB_CONTAINER=finance-db-test

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

if ! command -v docker >/dev/null 2>&1 || ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "ERROR: no existe el contenedor '$DB_CONTAINER'. Créalo primero, p.ej.:" >&2
  echo "  docker run -d --name finance-db-test -e MYSQL_ROOT_PASSWORD=finance_test \\" >&2
  echo "    -e MYSQL_DATABASE=finance_test -e MYSQL_USER=finance_test -e MYSQL_PASSWORD=finance_test \\" >&2
  echo "    -p 3307:3306 -v finance-db-test-data:/var/lib/mysql mariadb:10.6" >&2
  read -rp "Pulsa Enter para cerrar..." _
  exit 1
fi

if [ ! -f "$BACKEND_DIR/.env.test" ]; then
  echo "ERROR: falta $BACKEND_DIR/.env.test" >&2
  read -rp "Pulsa Enter para cerrar..." _
  exit 1
fi

FRONTEND_PID=""
cleanup() {
  echo ""
  echo "Cerrando frontend de pruebas (PID ${FRONTEND_PID:-?})..."
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "=== finance-app (ENTORNO DE PRUEBAS) ==="
echo "DB          : contenedor $DB_CONTAINER (puerto 3307)"
echo "Backend dir : $BACKEND_DIR (puerto 4001)"
echo "Frontend dir: $FRONTEND_DIR (puerto $FRONTEND_PORT, log en $FRONTEND_LOG)"
echo ""

if [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER")" != "true" ]; then
  echo ">> Arrancando contenedor de base de datos de pruebas ($DB_CONTAINER)..."
  docker start "$DB_CONTAINER" >/dev/null
  sleep 3
fi

echo ">> Iniciando frontend de pruebas en segundo plano (puerto $FRONTEND_PORT)..."
(
  cd "$FRONTEND_DIR" || exit 1
  npm run start:test
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

echo ">> Iniciando backend de pruebas (logs en vivo abajo). Ctrl+C para detener todo."
echo "-----------------------------------------------------------------"
cd "$BACKEND_DIR" || exit 1
npm run start:test

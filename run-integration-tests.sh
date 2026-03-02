#!/bin/bash
# Gate local completo: backend + frontend unit + frontend integración + build.

set -Eeuo pipefail

BACKEND_URL="http://localhost:8000"
BACKEND_HEALTH_URL="$BACKEND_URL/api/health"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
BACKEND_START_CMD="uvicorn app.main:app --host 0.0.0.0 --port 8000"
BACKEND_PID=""

cleanup() {
  if [[ -n "$BACKEND_PID" ]]; then
    echo "Deteniendo backend iniciado por el script..."
    kill "$BACKEND_PID" || true
  fi
}
trap cleanup EXIT

echo "[1/5] Verificando backend..."
if ! curl --silent --fail "$BACKEND_HEALTH_URL" > /dev/null; then
  echo "Backend no está activo. Iniciando backend..."
  pushd "$BACKEND_DIR" > /dev/null
  source ../.venv/bin/activate
  nohup $BACKEND_START_CMD > /tmp/rb-backend.log 2>&1 &
  BACKEND_PID=$!
  popd > /dev/null

  echo "Esperando backend en $BACKEND_HEALTH_URL..."
  until curl --silent --fail "$BACKEND_HEALTH_URL" > /dev/null; do
    sleep 1
  done
  echo "Backend iniciado."
else
  echo "Backend ya estaba activo."
fi

echo "[2/5] Ejecutando tests backend (pytest)..."
pushd "$BACKEND_DIR" > /dev/null
pytest -q
popd > /dev/null

echo "[3/5] Ejecutando tests unitarios frontend..."
pushd "$FRONTEND_DIR" > /dev/null
npm run test:unit:ci

echo "[4/5] Ejecutando tests de integración frontend..."
npm run test:ci

echo "[5/5] Ejecutando build frontend de producción..."
VITE_API_URL=https://app.rodrigoborgia.com npm run build
popd > /dev/null

echo "✔ Gate local completado: tests y build OK."

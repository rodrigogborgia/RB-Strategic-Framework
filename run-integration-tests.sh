#!/bin/bash
# Gate local completo: backend + frontend unit + frontend integración + build.

set -Eeuo pipefail

BACKEND_URL="http://localhost:8000"
BACKEND_HEALTH_URL="$BACKEND_URL/api/health"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
BACKEND_START_CMD="uvicorn app.main:app --host 0.0.0.0 --port 8000"
BACKEND_PID=""

backend_is_healthy() {
  local status
  status=$(curl --silent --output /dev/null --write-out "%{http_code}" "$BACKEND_HEALTH_URL" || true)
  [[ "$status" == "200" ]]
}

cleanup() {
  if [[ -n "$BACKEND_PID" ]]; then
    echo "Deteniendo backend iniciado por el script..."
    kill "$BACKEND_PID" || true
  fi
}
trap cleanup EXIT

echo "[1/5] Verificando backend..."
if ! backend_is_healthy; then
  echo "Backend no está activo. Iniciando backend..."
  pushd "$BACKEND_DIR" > /dev/null
  source ../.venv/bin/activate
  nohup $BACKEND_START_CMD > /tmp/rb-backend.log 2>&1 &
  BACKEND_PID=$!
  popd > /dev/null

  echo "Esperando backend en $BACKEND_HEALTH_URL..."
  until backend_is_healthy; do
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

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [[ "$NODE_MAJOR" -ge 22 ]]; then
  echo "⚠️  Node $(node -v) detectado. Se recomienda Node 20.x (ver .nvmrc) para evitar warnings transitorios de jsdom/punycode."
fi

npm run test:unit:ci

echo "[4/5] Ejecutando tests de integración frontend..."
# Limpiar caché de Jest y recompilar con API_URL correcta
rm -rf frontend/coverage frontend/.jest-cache
VITE_API_URL=http://localhost:8000 npm run test:ci

echo "[5/5] Ejecutando build frontend de producción..."
VITE_API_URL=https://rodrigoborgia.com npm run build
popd > /dev/null

echo "✔ Gate local completado: tests y build OK."

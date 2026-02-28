#!/bin/bash
# Script para ejecutar tests de integración frontend y backend asegurando que el backend esté activo

BACKEND_URL="http://localhost:8000"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
BACKEND_START_CMD="uvicorn app.main:app --host 0.0.0.0 --port 8000"

# Verifica si el backend está activo
curl --silent --fail "$BACKEND_URL/docs" > /dev/null
if [ $? -ne 0 ]; then
  echo "Backend no está activo. Iniciando backend..."
  pushd "$BACKEND_DIR" > /dev/null
  source ../.venv/bin/activate
  nohup $BACKEND_START_CMD &
  BACKEND_PID=$!
  popd > /dev/null
  # Espera a que el backend esté activo
  echo "Esperando a que el backend esté disponible..."
  until curl --silent --fail "$BACKEND_URL/docs" > /dev/null; do
    sleep 1
  done
  echo "Backend iniciado."
else
  echo "Backend ya está activo."
fi

# Ejecuta tests de backend
pushd "$BACKEND_DIR" > /dev/null
pytest
BACKEND_STATUS=$?
popd > /dev/null

# Ejecuta tests de frontend
pushd "$FRONTEND_DIR" > /dev/null
npx jest --config jest.config.cjs --coverage
FRONTEND_STATUS=$?
popd > /dev/null

# Si el backend fue iniciado por el script, lo detiene
if [ ! -z "$BACKEND_PID" ]; then
  echo "Deteniendo backend iniciado por el script..."
  kill $BACKEND_PID
fi

# Resultado final
if [ $BACKEND_STATUS -eq 0 ] && [ $FRONTEND_STATUS -eq 0 ]; then
  echo "Todos los tests de integración pasaron correctamente."
  exit 0
else
  echo "Algunos tests fallaron. Revisa los logs."
  exit 1
fi

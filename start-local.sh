#!/bin/bash

# Kill any process using port 8000 (backend)
echo "Cerrando procesos en puerto 8000..."
fuser -k 8000/tcp 2>/dev/null || lsof -ti:8000 | xargs kill -9 2>/dev/null

# Start backend (FastAPI)
echo "Iniciando backend (FastAPI en puerto 8000)..."
cd backend || exit 1
nohup uvicorn app.main:app --reload --port 8000 > ../backend.log 2>&1 &
cd ..

# Start frontend (Vite)
echo "Iniciando frontend (Vite en puerto 5173)..."
cd frontend || exit 1
npm run dev

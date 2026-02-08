#!/bin/bash

PORT=5173

PID=$(lsof -ti :$PORT 2>/dev/null)

if [ -n "$PID" ]; then
  echo "Matando processo na porta $PORT (PID: $PID)..."
  kill -9 $PID
  sleep 1
fi

echo "Iniciando aplicacao em modo desenvolvimento..."
npm run dev

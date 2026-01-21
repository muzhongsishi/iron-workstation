#!/bin/bash

# Kill ports 8000 and 5173 to avoid conflicts
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "Starting Backend..."
# Run backend in background from root to support relative imports
./venv/bin/uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Starting Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "System running. Press Ctrl+C to stop."
wait

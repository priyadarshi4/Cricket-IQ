#!/bin/bash
# CricketIQ — Quick Start Script
# Usage: bash start.sh [dev|docker|ml]

set -e
BOLD="\033[1m"
GREEN="\033[32m"
ORANGE="\033[33m"
RESET="\033[0m"

echo -e "${BOLD}🏏 CricketIQ — Starting...${RESET}"

MODE=${1:-dev}

if [ "$MODE" = "docker" ]; then
  echo -e "${GREEN}▶ Starting with Docker Compose...${RESET}"
  docker-compose up --build -d
  echo -e "${GREEN}✅ All services started:${RESET}"
  echo "   Frontend  → http://localhost:3000"
  echo "   Backend   → http://localhost:5000"
  echo "   ML API    → http://localhost:8000"
  echo "   Nginx     → http://localhost:80"
  echo "   Admin     → open admin/index.html"

elif [ "$MODE" = "ml" ]; then
  echo -e "${GREEN}▶ Starting ML FastAPI service...${RESET}"
  cd ml
  pip install -r api/requirements.txt -q
  uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

elif [ "$MODE" = "dev" ]; then
  echo -e "${GREEN}▶ Starting in development mode...${RESET}"

  # Backend
  echo -e "${ORANGE}Starting Node.js backend on :5000...${RESET}"
  cd backend
  npm install --silent
  node server.js &
  BACK_PID=$!
  cd ..

  # Frontend
  echo -e "${ORANGE}Starting React frontend on :3000...${RESET}"
  cd frontend
  npm install --silent
  npm start &
  FRONT_PID=$!
  cd ..

  echo ""
  echo -e "${GREEN}✅ CricketIQ is running!${RESET}"
  echo "   Frontend  → http://localhost:3000"
  echo "   Backend   → http://localhost:5000/api"
  echo "   Health    → http://localhost:5000/api/health"
  echo "   Admin     → open admin/index.html in browser"
  echo ""
  echo "Press Ctrl+C to stop all services."

  trap "kill $BACK_PID $FRONT_PID 2>/dev/null; echo '👋 Stopped.'" INT
  wait

else
  echo "Usage: bash start.sh [dev|docker|ml]"
  exit 1
fi

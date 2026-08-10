#!/bin/sh
# PENSA container entrypoint — runs the FastAPI backend (with the embedded
# AI agent + SPA) and, when a bot token is present, the Telegram bot.
set -e

PORT="${PORT:-7860}"

echo "[pensa] starting backend on 0.0.0.0:${PORT} (SERVE_SPA on)"
uvicorn backend.server:app --host 0.0.0.0 --port "${PORT}" &
BACKEND_PID=$!

if [ -n "${TELEGRAM_BOT_TOKEN}" ]; then
  echo "[pensa] TELEGRAM_BOT_TOKEN set — starting Telegram bot"
  python bot/telegram_bot.py &
  BOT_PID=$!
else
  echo "[pensa] TELEGRAM_BOT_TOKEN unset — bot idle"
  BOT_PID=""
fi

trap 'kill "${BACKEND_PID}" ${BOT_PID:+$BOT_PID} 2>/dev/null || true' TERM INT

wait "${BACKEND_PID}"
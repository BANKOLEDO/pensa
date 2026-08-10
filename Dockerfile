# =============================================================
# PENSA — single-container deployment
# Serves the built frontend (same origin) + FastAPI backend
# (with the embedded AI agent) + optional Telegram bot polling.
#
# One public URL is enough for the whole product — no CORS, no
# separate hosts. Runs on any PORT (defaults to 7860 for Hugging
# Face Spaces); portable to Railway / Render / Fly.io.
# =============================================================

# ---- stage 1: build the frontend SPA -------------------------
FROM node:22-alpine AS web
WORKDIR /app/frontend
ENV CI=true
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY frontend/ .
ARG VITE_API_URL=""
ENV VITE_API_URL="${VITE_API_URL}"
RUN pnpm build

# ---- stage 2: python runtime (backend + AI agent + bot) ------
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY backend backend
COPY ai-agent ai-agent
COPY bot bot
COPY deployments deployments

# Built SPA (same origin, served by backend/server.py)
COPY --from=web /app/frontend/dist frontend/dist

COPY start.sh .
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

ENV PORT=7860
EXPOSE 7860

CMD ["./start.sh"]
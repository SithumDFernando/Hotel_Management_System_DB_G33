# =============================================================================
# backend/Dockerfile — SkyNest FastAPI backend
# =============================================================================
# Build:  docker build -t skynest-backend ./backend
# Config: all settings come from env vars (see backend/app/config.py);
#         docker-compose.yml supplies them. No .env file is baked in.
# =============================================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install dependencies first so this layer is cached between code changes
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
COPY tests ./tests

# Run as an unprivileged user
RUN useradd --create-home --uid 1000 skynest
USER skynest

EXPOSE 8000

# python:slim has no curl — probe the OpenAPI schema with the stdlib instead
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/openapi.json')" || exit 1

# --proxy-headers / --forwarded-allow-ips: take the client IP from nginx's
# X-Forwarded-For, so the login/signup rate limits see real clients rather
# than the nginx container (app/rate_limit.py). Only nginx on the compose
# network should reach this port in production.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]

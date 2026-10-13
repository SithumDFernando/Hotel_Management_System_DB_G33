# =============================================================================
# frontend/Dockerfile — SkyNest React SPA
# =============================================================================
# Stage 1 builds the Vite bundle; stage 2 serves it with nginx, which also
# proxies /api to the backend container (see nginx.conf). The browser therefore
# talks to a single origin and VITE_API_BASE_URL stays "/api".
# =============================================================================

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

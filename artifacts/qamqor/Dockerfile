# ──────────────────────────────────────────
# Stage 1: Build
# Build context must be the repo root so pnpm
# can resolve the @workspace/api-client-react dep.
# ──────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy every workspace package.json so pnpm can resolve the full graph
COPY artifacts/api-server/package.json  ./artifacts/api-server/
COPY artifacts/qamqor/package.json      ./artifacts/qamqor/
COPY lib/api-client-react/package.json  ./lib/api-client-react/
COPY lib/api-spec/package.json          ./lib/api-spec/
COPY lib/api-zod/package.json           ./lib/api-zod/
COPY lib/db/package.json                ./lib/db/
COPY scripts/package.json               ./scripts/

# Install all workspace deps
RUN pnpm install --no-frozen-lockfile

# Root tsconfig files (artifacts/qamqor/tsconfig.json extends ../../tsconfig.base.json)
COPY tsconfig.base.json ./
COPY tsconfig.json      ./

# Copy source only for packages we actually need
COPY lib/api-client-react ./lib/api-client-react
COPY artifacts/qamqor     ./artifacts/qamqor
# @assets alias in vite.config.ts resolves to ../../attached_assets (repo root)
COPY attached_assets      ./attached_assets

# Vite build-time env vars (injected via docker-compose build args)
ARG VITE_API_MODE=real
ARG VITE_API_BASE_URL=http://localhost:8080/v1
ENV VITE_API_MODE=$VITE_API_MODE
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm --filter @workspace/qamqor build

# ──────────────────────────────────────────
# Stage 2: Serve
# ──────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/artifacts/qamqor/dist/public /usr/share/nginx/html
COPY artifacts/qamqor/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
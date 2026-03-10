# ── Base ──
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ── Dependencies ──
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Build ──
FROM base AS builder
WORKDIR /app

ARG VITE_PRIVY_APP_ID
ARG VITE_PAYMENT_ROUTER_ADDRESS
ENV VITE_PRIVY_APP_ID=${VITE_PRIVY_APP_ID}
ENV VITE_PAYMENT_ROUTER_ADDRESS=${VITE_PAYMENT_ROUTER_ADDRESS}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Production — Nginx ──
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

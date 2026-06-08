# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json bun.lock ./
RUN npm install --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

WORKDIR /app

# Copy only production deps and built output
COPY package.json ./
RUN npm install --omit=dev --frozen-lockfile
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN groupadd --gid 1001 app && useradd --uid 1001 --gid app --shell /bin/bash app
RUN mkdir -p /app/data /app/logs && chown -R app:app /app
USER app

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "dist/server/server.js"]

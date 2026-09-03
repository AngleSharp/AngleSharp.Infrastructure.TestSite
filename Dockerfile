# syntax=docker/dockerfile:1

# --- Build stage: compile TypeScript to JavaScript ---
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies (including dev) using the lockfile for reproducibility.
COPY package.json package-lock.json ./
RUN npm ci

# Compile the sources.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Production dependencies stage ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Runtime stage ---
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
WORKDIR /app

# Run as the unprivileged user that the node image already provides.
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node public ./public

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]

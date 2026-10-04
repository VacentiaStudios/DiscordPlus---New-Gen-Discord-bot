# syntax=docker/dockerfile:1
# Build context: the repository root (see docker-compose.yml).

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @discordplus/bot build
# Self-contained folder with dist/, drizzle/ and production dependencies only.
RUN pnpm --filter @discordplus/bot deploy --prod --legacy /out

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
# Same image runs `node dist/migrate.js` and `node dist/deploy-commands.js`.
CMD ["node", "dist/index.js"]

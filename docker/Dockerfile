# syntax=docker/dockerfile:1.7

# Prisma 7.8 supports Node 24; override this ARG when the stack supports newer Node lines.
ARG NODE_VERSION=24-bookworm-slim
ARG PNPM_VERSION=11.8.0

FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV DATABASE_URL="postgresql://rag_kbs:rag_kbs_password@localhost:5432/rag_kbs"

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global "pnpm@${PNPM_VERSION}"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

FROM base AS dependencies

ENV NODE_ENV=development

RUN pnpm install --frozen-lockfile

FROM dependencies AS development

COPY . .

RUN pnpm exec prisma generate

CMD ["pnpm", "start:dev"]

FROM dependencies AS build

COPY . .

RUN pnpm exec prisma generate && pnpm build

FROM base AS production-dependencies

ENV NODE_ENV=production

RUN pnpm install --frozen-lockfile --prod

FROM node:${NODE_VERSION} AS runtime-base
ARG PNPM_VERSION

WORKDIR /app

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV PORT=3000
ENV WORKER_READY_FILE="/tmp/rag-kbs-worker.ready"

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global "pnpm@${PNPM_VERSION}"

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY docker ./docker

RUN chmod +x docker/*.sh && chown -R node:node /app

USER node

FROM runtime-base AS api-runtime

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3000') + '/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["docker/entrypoint.api.sh"]
CMD ["pnpm", "start:prod"]

FROM runtime-base AS worker-runtime

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD test -f "${WORKER_READY_FILE:-/tmp/rag-kbs-worker.ready}"

ENTRYPOINT ["docker/entrypoint.worker.sh"]
CMD ["pnpm", "worker:prod"]

FROM dependencies AS migrator

COPY . .
COPY docker ./docker

RUN chmod +x docker/*.sh && pnpm exec prisma generate

ENTRYPOINT ["docker/wait-for-services.sh"]
CMD ["pnpm", "prisma:migrate:deploy"]

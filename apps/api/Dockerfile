FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/extension/package.json apps/extension/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --filter @emplorio/api...

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /repo/packages/db/node_modules ./packages/db/node_modules
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY tsconfig.base.json ./
WORKDIR /repo/apps/api
EXPOSE 3001
# Run tsx directly via node instead of `pnpm start`. Invoking pnpm here makes
# corepack download pnpm 11 (the root packageManager pin isn't in this stage),
# which then runs `pnpm install` before the script (verify-deps-before-run) and
# fails: the workspace root manifests aren't present, so @emplorio/db can't be
# resolved and the machine crash-loops. node_modules is already baked in above.
CMD ["node", "--import", "tsx", "src/index.ts"]

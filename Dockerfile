FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@10
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 DATABASE_PATH=/app/data/veyl.sqlite
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/src/types.ts ./src/types.ts
COPY --from=build --chown=node:node /app/src/data ./src/data
COPY --from=build --chown=node:node /app/package.json ./package.json
RUN mkdir data && chown node:node data
USER node
EXPOSE 3001
CMD ["node", "server/index.ts"]

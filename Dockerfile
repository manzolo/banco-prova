FROM node:26-alpine AS build
WORKDIR /app
COPY package*.json ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY client ./client
COPY shared ./shared
COPY server ./server
COPY tests ./tests
COPY public ./public
RUN npm run build

FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8803 HOST=0.0.0.0
COPY package.json ./
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --chown=node:node ASSET_LICENSES.md ./
USER node
EXPOSE 8803
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8803/api/health || exit 1
CMD ["node", "server/index.ts"]

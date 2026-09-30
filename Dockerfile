FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/opt/playwright DATABASE_URL=sqlite:/data/regstead.db REGSTEAD_ENGINE_STORAGE=/data/engine REGSTEAD_REPORT_STORAGE=/data/reports REGSTEAD_EMAIL_SPOOL=/data/mail
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npx playwright install --with-deps chromium && chmod -R a+rX /opt/playwright
COPY --from=build /app/dist ./dist
COPY assets/portal ./assets/portal
COPY scripts/regstead-backup.mjs ./scripts/regstead-backup.mjs
RUN mkdir /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD ["node", "dist/regstead/cli.js", "ready"]
CMD ["node", "dist/regstead/cli.js", "worker"]

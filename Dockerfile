FROM node:24.22.3-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS build
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS prod-deps
RUN npm ci --omit=dev

FROM build AS migrate
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
USER node
CMD ["npx", "drizzle-kit", "migrate"]

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

# Stage 1: build the app: the browser pages (dist/client) and the server (dist/server).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: just Node and the built files. The server needs no npm packages at runtime.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
COPY --from=build /app/dist ./dist
# A named volume mounted here starts out with this ownership, so the server can save games.
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "dist/server/index.mjs"]

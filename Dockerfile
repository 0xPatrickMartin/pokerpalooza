# Stage 1: turn the source code into plain HTML, CSS and JavaScript (the dist/ folder).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: a small nginx image that only holds the built files. Node and node_modules stay behind.
FROM nginx:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Multi-stage build untuk Web Frontend Spotify Lite
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage Runner Nginx Minimal
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ../nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

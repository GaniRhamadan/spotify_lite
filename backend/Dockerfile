# Multi-stage build untuk Backend Spotify Lite
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Runner Stage (Minimal & Ringan)
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

# Install dependensi sistem untuk streaming audio (python3, ffmpeg, yt-dlp)
RUN apk add --no-cache python3 curl ffmpeg && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

COPY --from=builder /app/dist ./dist

# Folder penyimpanan audio dan sampul
RUN mkdir -p storage/audio storage/covers

EXPOSE 5000

CMD ["node", "dist/server.js"]

FROM node:22-alpine

WORKDIR /app

# Instala dependencias primero para aprovechar la cache de capas de Docker.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- "http://localhost:${PORT}/status" || exit 1

CMD ["node", "src/main.js"]

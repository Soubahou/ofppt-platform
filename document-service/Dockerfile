FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN apk add --no-cache netcat-openbsd openssl

COPY --from=builder /app/node_modules       ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY package*.json ./
COPY prisma        ./prisma
COPY src           ./src

RUN mkdir -p uploads/documents uploads/submissions \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3003

CMD ["sh", "-c", "until nc -z document-db 3306; do sleep 2; done && npx prisma db push && node prisma/seed.js && node src/app.js"]

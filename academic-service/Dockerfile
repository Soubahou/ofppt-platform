FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN apk add --no-cache netcat-openbsd openssl

COPY --chown=appuser:appgroup --from=builder /app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=builder /app/src          ./src
COPY --chown=appuser:appgroup prisma                           ./prisma
COPY --chown=appuser:appgroup package.json                     ./

USER appuser

EXPOSE 3002

CMD ["sh", "-c", "until nc -z academic-db 3306; do sleep 2; done && npx prisma migrate deploy && node prisma/seed.js && node src/app.js"]

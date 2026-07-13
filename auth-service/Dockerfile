FROM node:20-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev

COPY prisma ./prisma/

RUN npx prisma generate

COPY . .

RUN mkdir -p uploads/avatars

EXPOSE 3001

CMD ["sh", "-c", "until nc -z auth-db 3306; do sleep 2; done && npx prisma migrate deploy && node prisma/seed.js && node src/app.js"]

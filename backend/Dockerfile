# matjer backend — NestJS + Prisma (single-stage for reliable first deploy)
FROM node:20-alpine

WORKDIR /app

# Prisma needs openssl on Alpine
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 4002

# db push is idempotent; safe on every start. Seeding is run once by deploy.sh.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]

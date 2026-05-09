FROM node:24 AS builder

WORKDIR /app
COPY package*.json ./

RUN npm ci
COPY . .

RUN npm run build

FROM node:24 AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000

USER node
CMD ["node", "dist/server.js"]
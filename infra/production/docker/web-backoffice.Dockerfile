FROM node:20-alpine AS builder
WORKDIR /app

COPY web/react-backoffice/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY web/react-backoffice ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]

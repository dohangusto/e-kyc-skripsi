FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first for better caching
COPY web/react-backoffice/package*.json ./

# Install dependencies if lockfile exists
RUN if [ -f package-lock.json ]; then npm ci; else echo "No lockfile yet"; fi

# Copy source (live_update will sync during dev)
COPY web/react-backoffice ./
COPY shared/dummies /shared/dummies

ENV HOST=0.0.0.0
ENV PORT=3001
EXPOSE 3001

CMD ["sh", "-lc", "if npm run | grep -q '\\bdev\\b'; then npm run dev -- --host 0.0.0.0 --port 3001; else npm start; fi"]

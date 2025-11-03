FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first for better caching
COPY web/react-main/package*.json ./

# Install dependencies if lockfile exists (ignore if project not yet initialized)
RUN if [ -f package-lock.json ]; then npm ci; else echo "No lockfile yet"; fi

# Copy the rest of the app (Tilt live_update will also sync during dev)
COPY web/react-main ./

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Run dev server by default; fall back to start if no dev script
CMD ["sh", "-lc", "if npm run | grep -q '\\bdev\\b'; then npm run dev -- --host 0.0.0.0 --port 3000; else npm start; fi"]


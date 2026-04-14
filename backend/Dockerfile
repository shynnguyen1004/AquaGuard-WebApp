# ── AquaGuard Backend ──
# Node.js + Express API Server
FROM node:20-alpine

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source
COPY . .

EXPOSE 5001

CMD ["node", "index.js"]

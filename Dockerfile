# ── AquaGuard Frontend (Development) ──
# Vite dev server with hot-reload
FROM node:20-alpine

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./

# Install all dependencies (including devDependencies for Vite)
RUN npm ci

# Copy application source
COPY . .

EXPOSE 5173

# Run Vite dev server, bind to 0.0.0.0 so it's accessible from host
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

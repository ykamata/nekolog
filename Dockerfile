# Node.js Dockerfile for Nekolog
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules (required for Prisma and other native dependencies)
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client for MySQL
RUN npx prisma generate --schema=prisma/schema.mysql.prisma

# Copy application source
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "run", "dev"]

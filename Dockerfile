# Node.js Dockerfile for Nekolog
FROM node:22-bookworm-slim

# Set working directory
WORKDIR /app

# Install dependencies for native modules (required for Prisma and other native dependencies)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    python3 \
    make \
    g++ \
    wget \
    curl \
    default-mysql-client \
    sudo \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Allow node user to use sudo without password
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Copy package files
COPY package*.json ./

# Copy Prisma schema (needed before npm ci for postinstall)
COPY prisma ./prisma/

# Install dependencies (skip postinstall to avoid schema.prisma lookup)
RUN npm ci --ignore-scripts

# Run nuxt prepare manually
RUN npx nuxt prepare

# Generate Prisma Client for MySQL
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy application source
COPY . .

# Create .nuxt directory with proper permissions
RUN mkdir -p .nuxt && chown -R node:node /app

# Switch to node user
USER node

# Expose port
EXPOSE 3000

# Health check
#HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
#  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
#CMD ["npm", "run", "dev"]
CMD ["sleep", "infinity"]

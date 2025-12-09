#!/bin/bash

# Nekolog Production Deployment Script
# This script automates the deployment process for production environment

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo -e "${BLUE}Nekolog Production Deployment${NC}"
echo "=========================================="
echo ""

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running on production environment
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    print_info "Using .env.production file"
    export $(cat "$PROJECT_ROOT/.env.production" | grep -v '^#' | xargs)
else
    print_error ".env.production file not found!"
    echo "Please create .env.production based on .env.production.example"
    exit 1
fi

# Validate required environment variables
print_info "Validating environment variables..."
REQUIRED_VARS=("MYSQL_ROOT_PASSWORD" "MYSQL_USER" "MYSQL_PASSWORD" "JWT_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done
print_success "Environment variables validated"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "Docker and Docker Compose are available"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker."
    exit 1
fi

print_success "Docker daemon is running"

# Create backup of current deployment (if exists)
if docker ps -a | grep -q nekolog-app-prod; then
    print_info "Creating backup of current deployment..."
    BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup database
    print_info "Backing up database..."
    docker exec nekolog-mysql-prod mysqldump \
        -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
        --single-transaction \
        --quick \
        --lock-tables=false \
        nekolog > "$BACKUP_DIR/database_backup.sql"

    print_success "Database backup created: $BACKUP_DIR/database_backup.sql"
fi

# Pull latest changes from git
print_info "Pulling latest changes from git..."
cd "$PROJECT_ROOT"
git fetch origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_info "Current branch: $CURRENT_BRANCH"

# Ask for confirmation before pulling
read -p "Do you want to pull latest changes from origin/$CURRENT_BRANCH? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git pull origin "$CURRENT_BRANCH"
    print_success "Git pull completed"
else
    print_warning "Skipping git pull"
fi

# Stop current containers
print_info "Stopping current containers..."
docker-compose -f docker-compose.prod.yml down
print_success "Containers stopped"

# Build new images
print_info "Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache
print_success "Docker images built"

# Start containers
print_info "Starting containers..."
docker-compose -f docker-compose.prod.yml up -d
print_success "Containers started"

# Wait for MySQL to be ready
print_info "Waiting for MySQL to be ready..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker exec nekolog-mysql-prod mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent &> /dev/null; then
        print_success "MySQL is ready"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    print_error "MySQL failed to start within the expected time"
    echo "Check logs with: docker-compose -f docker-compose.prod.yml logs mysql"
    exit 1
fi

echo ""

# Run database migrations
print_info "Running database migrations..."
docker exec nekolog-app-prod npx prisma migrate deploy --schema=prisma/schema.mysql.prisma
print_success "Database migrations completed"

# Wait for application to be ready
print_info "Waiting for application to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:${APP_PORT:-3000}/api/health &> /dev/null; then
        print_success "Application is ready"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    print_warning "Application health check timed out, but continuing..."
fi

echo ""

# Show container status
print_info "Container status:"
docker-compose -f docker-compose.prod.yml ps

# Clean up old images
print_info "Cleaning up old Docker images..."
docker image prune -f
print_success "Old images cleaned up"

echo ""
echo "=========================================="
print_success "Deployment Complete!"
echo "=========================================="
echo ""
echo -e "${BLUE}Application is running at: http://localhost:${APP_PORT:-3000}${NC}"
echo ""
echo "Useful commands:"
echo "  View logs:           docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop containers:     docker-compose -f docker-compose.prod.yml down"
echo "  Restart containers:  docker-compose -f docker-compose.prod.yml restart"
echo "  View status:         docker-compose -f docker-compose.prod.yml ps"
echo ""

# Final health check
print_info "Running final health check..."
if curl -f http://localhost:${APP_PORT:-3000}/api/health &> /dev/null; then
    print_success "Health check passed!"
else
    print_warning "Health check failed. Please check the logs."
    echo "View logs: docker-compose -f docker-compose.prod.yml logs app"
fi

echo ""
print_info "Deployment completed at: $(date)"

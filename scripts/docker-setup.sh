#!/bin/bash

# Nekolog Docker Development Environment Setup Script
# This script automates the setup of the Docker-based development environment

set -e  # Exit on error

echo "=========================================="
echo "Nekolog Docker Environment Setup"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN} Docker and Docker Compose are installed${NC}"
echo ""

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker daemon is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN} Docker daemon is running${NC}"
echo ""

# Stop and remove existing containers if they exist
echo "Stopping any existing containers..."
docker-compose down &> /dev/null || true
echo -e "${GREEN} Cleaned up existing containers${NC}"
echo ""

# Build and start containers
echo "Building Docker containers..."
docker-compose build --no-cache

echo ""
echo "Starting Docker containers..."
docker-compose up -d

echo ""
echo "Waiting for MySQL to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -proot --silent &> /dev/null; then
        echo -e "${GREEN} MySQL is ready${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}Error: MySQL failed to start within the expected time${NC}"
    echo "Check logs with: docker-compose logs mysql"
    exit 1
fi

echo ""
echo "Waiting for application to be ready..."
sleep 10

# Check if user wants to seed the database
echo ""
read -p "Do you want to seed the database with test data? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    docker-compose exec -T app npm run db:seed
    echo -e "${GREEN} Database seeded successfully${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Application is running at: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  View logs:           npm run docker:logs"
echo "  Stop containers:     npm run docker:down"
echo "  Restart containers:  npm run docker:up"
echo "  Open Prisma Studio:  npm run docker:studio"
echo "  MySQL shell:         npm run docker:shell:mysql"
echo "  App shell:           npm run docker:shell:app"
echo ""
echo "For more information, see README.docker.md"
echo "=========================================="

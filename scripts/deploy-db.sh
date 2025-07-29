#!/bin/bash

# Database deployment script for production MySQL setup

set -e

echo "🚀 Starting database deployment for production..."

# Check if we're in production environment
if [ "$NODE_ENV" != "production" ]; then
  echo "❌ This script should only be run in production environment"
  exit 1
fi

# Check if MySQL connection is available
echo "🔍 Checking MySQL connection..."
if ! mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
  echo "❌ Cannot connect to MySQL database"
  exit 1
fi

echo "✅ MySQL connection successful"

# Copy production schema
echo "📋 Using production MySQL schema..."
cp prisma/schema.mysql.prisma prisma/schema.prisma

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Deploy migrations
echo "📦 Deploying database migrations..."
npx prisma migrate deploy

# Restore development schema
echo "🔄 Restoring development schema..."
git checkout prisma/schema.prisma

echo "✅ Database deployment completed successfully!"

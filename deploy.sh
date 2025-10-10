#!/bin/bash

# User Management System Deployment Script
# For DigitalOcean Droplet

set -e

echo "🚀 Starting deployment of User Management System..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create project directory
PROJECT_DIR="/opt/user-management"
echo "📁 Creating project directory..."
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Copy project files
echo "📋 Copying project files..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# Create environment file from example
if [ ! -f .env ]; then
    echo "⚙️ Creating environment file..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your Azure credentials before starting the services!"
    echo "   Required: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID"
fi

# Set proper permissions
echo "🔐 Setting permissions..."
chmod +x deploy.sh
chmod 600 .env

# Build and start services
echo "🔨 Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Show access information
echo "✅ Deployment completed!"
echo ""
echo "🌐 Access Information:"
echo "   Frontend: http://143.110.148.157:3000"
echo "   Backend API: http://143.110.148.157:5000"
echo "   Database: localhost:5432"
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""
echo "📝 Logs:"
echo "   View logs: docker-compose logs -f"
echo "   View specific service: docker-compose logs -f [service_name]"
echo ""
echo "🛠️ Management Commands:"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Update services: docker-compose pull && docker-compose up -d"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Configure your Azure App Registration"
echo "   2. Update the .env file with your credentials"
echo "   3. Restart services after updating .env: docker-compose restart"

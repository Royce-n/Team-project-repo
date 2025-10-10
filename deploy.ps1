# User Management System Deployment Script for Windows
# For DigitalOcean Droplet

Write-Host "🚀 Starting deployment of User Management System..." -ForegroundColor Green

# Check if Docker is installed
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is installed
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Create environment file from example if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "⚙️ Creating environment file..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "⚠️  Please edit .env file with your Azure credentials before starting the services!" -ForegroundColor Yellow
    Write-Host "   Required: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID" -ForegroundColor Yellow
}

# Build and start services
Write-Host "🔨 Building and starting services..." -ForegroundColor Blue
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service health
Write-Host "🏥 Checking service health..." -ForegroundColor Blue
docker-compose ps

# Show access information
Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access Information:" -ForegroundColor Cyan
Write-Host "   Frontend: http://143.110.148.157:3000" -ForegroundColor White
Write-Host "   Backend API: http://143.110.148.157:5000" -ForegroundColor White
Write-Host "   Database: localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose ps
Write-Host ""
Write-Host "📝 Logs:" -ForegroundColor Cyan
Write-Host "   View logs: docker-compose logs -f" -ForegroundColor White
Write-Host "   View specific service: docker-compose logs -f [service_name]" -ForegroundColor White
Write-Host ""
Write-Host "🛠️ Management Commands:" -ForegroundColor Cyan
Write-Host "   Stop services: docker-compose down" -ForegroundColor White
Write-Host "   Restart services: docker-compose restart" -ForegroundColor White
Write-Host "   Update services: docker-compose pull && docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Don't forget to:" -ForegroundColor Yellow
Write-Host "   1. Configure your Azure App Registration" -ForegroundColor White
Write-Host "   2. Update the .env file with your credentials" -ForegroundColor White
Write-Host "   3. Restart services after updating .env: docker-compose restart" -ForegroundColor White

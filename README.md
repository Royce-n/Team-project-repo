# User Management System

A modern web-based user management system built with React, Node.js, and PostgreSQL, featuring Office365 authentication and role-based access control. **Live at: https://aurora.jguliz.com**

## Live Application

**Production URL:** https://aurora.jguliz.com  
**Authentication:** Office365 integration  
**Security:** HTTPS with Let's Encrypt SSL  

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Azure App Registration (for Office365 authentication)
- Domain name (for HTTPS)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Team-project-repo
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your Azure credentials
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - **Production:** https://aurora.jguliz.com
   - **Local Development:** http://localhost:3000
   - **Backend API:** http://localhost:5000
   - **Database:** localhost:5432

## Architecture

### Frontend (React)
- **Framework:** React 18 with Tailwind CSS
- **Authentication:** Azure MSAL for Office365 integration
- **State Management:** React Query for API state
- **UI Components:** Custom components with responsive design
- **Deployment:** Nginx reverse proxy with SSL

### Backend (Node.js)
- **Framework:** Express.js with JWT authentication
- **Database:** PostgreSQL with connection pooling
- **Security:** Helmet, CORS, rate limiting
- **API:** RESTful API with comprehensive error handling
- **Health Checks:** Docker health monitoring

### Database (PostgreSQL)
- **Users table:** User accounts with role assignments
- **Roles table:** Role definitions with permissions
- **Relationships:** Many-to-many user-role relationships
- **SSL:** Disabled for Docker internal communication

### Infrastructure
- **Containerization:** Docker with multi-container setup
- **Reverse Proxy:** Nginx with SSL termination
- **SSL Certificate:** Let's Encrypt automatic renewal
- **Domain:** Custom domain with DNS configuration

## Features

### Authentication & Authorization
- **Office365 Integration:** Seamless login with Microsoft accounts
- **JWT Tokens:** Secure session management
- **Role-Based Access Control:** Granular permission system
- **User Deactivation:** Soft delete with reactivation capability
- **HTTPS Required:** Secure authentication flow

### User Management
- **CRUD Operations:** Create, read, update, delete users
- **User Profiles:** Comprehensive user information management
- **Role Assignment:** Assign and modify user roles
- **Status Management:** Activate/deactivate user accounts

### Admin Features
- **Role Management:** Create and manage custom roles
- **Permission Control:** Define role-specific permissions
- **User Overview:** Dashboard with user statistics
- **Audit Trail:** Track user actions and changes

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- Azure MSAL
- React Query
- Axios

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT
- Helmet
- CORS

### Infrastructure
- Docker & Docker Compose
- Nginx (reverse proxy)
- Let's Encrypt SSL
- DigitalOcean Droplet

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/deactivate` - Deactivate user
- `PATCH /api/users/:id/reactivate` - Reactivate user

### Roles
- `GET /api/roles` - Get all roles
- `GET /api/roles/:id` - Get role by ID
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role

## Security Features

- **HTTPS:** SSL/TLS encryption with Let's Encrypt
- **JWT Authentication:** Secure token-based authentication
- **Rate Limiting:** API request throttling (100 requests/15 minutes)
- **CORS Protection:** Cross-origin request security
- **Input Validation:** Comprehensive data validation
- **SQL Injection Prevention:** Parameterized queries
- **XSS Protection:** Content Security Policy headers
- **Domain Security:** Custom domain with proper DNS

## Domain Configuration

### DNS Setup
- **Domain:** aurora.jguliz.com
- **Type:** A record
- **Value:** 143.110.148.157
- **SSL:** Let's Encrypt certificate

### Azure App Registration
- **Redirect URI:** https://aurora.jguliz.com
- **Front-channel logout:** https://aurora.jguliz.com
- **API Permissions:** Microsoft Graph (User.Read, User.ReadBasic.All)

## Team Members

- **Josh Gulizia** - Full-stack development, deployment, and DevOps
- **Royce Nguyen** - [Role/Contributions]
- **Alan Escamilla** - [Role/Contributions]
- **Phuong Ho** - [Role/Contributions]

## Documentation

- [User Management Guide](UserManagement.md)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Screenshots](docs/screenshots/)

## Docker Commands

### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild specific service
docker-compose up --build -d [service-name]
```

### Production Deployment
```bash
# Deploy to production
./deploy.sh

# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service-name]
```

## Deployment

### DigitalOcean Droplet Setup
1. **Create droplet** with Docker pre-installed
2. **Configure domain** DNS to point to droplet IP
3. **Clone repository** on the droplet
4. **Set up environment variables**
5. **Run deployment script:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

### SSL Certificate Setup
```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot certonly --standalone -d aurora.jguliz.com

# Configure nginx with SSL
docker-compose up nginx --build -d
```

### Environment Variables
```bash
# Azure Configuration
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Database
DATABASE_URL=postgresql://postgres:SD2025COOLGROUP@postgres:5432/user_management?sslmode=disable

# JWT
JWT_SECRET=SD2025COOLGROUP_JWT_SECRET_KEY_$(date +%s)
```

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Health Checks
```bash
# Check backend health
curl https://aurora.jguliz.com/api/health

# Check frontend
curl https://aurora.jguliz.com
```

## Monitoring

- **Health Checks:** Docker health check endpoints
- **Logging:** Structured logging with Winston
- **SSL Monitoring:** Let's Encrypt certificate renewal
- **Domain Monitoring:** DNS and SSL certificate status

## Development Setup

### Local Development
1. **Install dependencies:**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd frontend && npm install
   ```

2. **Start development servers:**
   ```bash
   # Backend (port 5000)
   cd backend && npm run dev
   
   # Frontend (port 3000)
   cd frontend && npm start
   ```

3. **Set up database:**
   ```bash
   # Start PostgreSQL
   docker-compose up postgres -d
   
   # Run migrations
   npm run migrate
   ```

## Troubleshooting

### Common Issues
1. **Port conflicts:** Check if ports 80, 443, 3000, 5000, 5432 are available
2. **Database connection:** Verify PostgreSQL is running and accessible
3. **Azure authentication:** Check client ID and redirect URIs match domain
4. **CORS errors:** Verify frontend URL is in CORS configuration
5. **SSL issues:** Check Let's Encrypt certificate status
6. **DNS issues:** Verify domain points to correct IP address

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm start

# View container logs
docker-compose logs -f [service-name]

# Check SSL certificate
certbot certificates
```

## Future Enhancements

- [ ] Google Authentication integration
- [ ] Advanced role permissions
- [ ] User activity logging
- [ ] Email notifications
- [ ] Mobile app support
- [ ] Advanced reporting
- [ ] Multi-tenant support
- [ ] API rate limiting per user
- [ ] Database backup automation

## License

This project is licensed under the MIT License - see the [COPYRIGHT.md](COPYRIGHT.md) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
- **Live Demo:** https://aurora.jguliz.com

---
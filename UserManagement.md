# User Management System

## Project Overview
A comprehensive web-based user management system built with React, Node.js, and PostgreSQL, featuring Office365 authentication and role-based access control. The system is containerized with Docker and deployed on a DigitalOcean droplet.

## Architecture
- **Frontend**: React 18 with Tailwind CSS, Azure MSAL for authentication
- **Backend**: Node.js/Express with JWT authentication
- **Database**: PostgreSQL with comprehensive user and role management
- **Authentication**: Office365 integration via Microsoft Graph API
- **Deployment**: Docker containers on DigitalOcean droplet (143.110.148.157)

## Features

### Authentication
- Office365 single sign-on integration
- JWT-based session management
- Secure token handling and validation

### User Management
- Complete CRUD operations for user accounts
- User attributes: name, email, role, status
- Bulk user operations and filtering
- Search and pagination support

### Role-Based Access Control (RBAC)
- Three default roles: BasicUser, Manager, Admin
- Granular permission system
- Role assignment and management
- Permission-based feature access

### User Deactivation
- Soft deactivation (status-based)
- Deactivated users blocked from login
- Admin-controlled reactivation
- Audit trail for status changes

### User Interface
- Modern, responsive React frontend
- Intuitive dashboard with statistics
- Role-based navigation and features
- Mobile-friendly design

## Technical Implementation

### Backend API
- RESTful API design with Express.js
- PostgreSQL database with optimized queries
- JWT authentication middleware
- Input validation and error handling
- Rate limiting and security headers

### Frontend Application
- React with hooks and context
- React Query for data management
- Form handling with React Hook Form
- Responsive design with Tailwind CSS
- Azure MSAL for Office365 integration

### Database Schema
```sql
-- Users table with Office365 integration
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    azure_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'basicuser',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table for RBAC
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Docker Configuration
- Multi-container setup with Docker Compose
- Separate containers for frontend, backend, and database
- Nginx reverse proxy for frontend
- Health checks and proper networking
- Production-ready configuration

## Deployment

### Prerequisites
- DigitalOcean droplet with Docker installed
- Azure App Registration configured
- Domain or IP address accessible

### Quick Start
1. Clone the repository
2. Copy `env.example` to `.env`
3. Configure Azure credentials in `.env`
4. Run deployment script:
   ```bash
   # Linux/Mac
   ./deploy.sh
   
   # Windows
   .\deploy.ps1
   ```

### Environment Variables
```env
# Azure Configuration
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id

# Database
DATABASE_URL=postgresql://postgres:postgres_password@postgres:5432/user_management

# Security
JWT_SECRET=your_jwt_secret_key
```

### Access URLs
- **Frontend**: http://143.110.148.157:3000
- **Backend API**: http://143.110.148.157:5000
- **Database**: localhost:5432

## API Endpoints

### Authentication
- `POST /api/auth/office365` - Office365 login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users` - List users (with pagination/filtering)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `PATCH /api/users/:id/deactivate` - Deactivate user (Admin only)
- `PATCH /api/users/:id/reactivate` - Reactivate user (Admin only)

### Roles
- `GET /api/roles` - List roles (Admin only)
- `GET /api/roles/:id` - Get role by ID (Admin only)
- `POST /api/roles` - Create role (Admin only)
- `PUT /api/roles/:id` - Update role (Admin only)
- `DELETE /api/roles/:id` - Delete role (Admin only)

## Security Features
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Security headers (Helmet.js)
- SQL injection prevention
- XSS protection

## Team Members
- Royce Nguyen
- Josh Gulizia  
- Alan Escamilla
- Phuong Ho

## Development Setup

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Database
```bash
# Using Docker
docker-compose up postgres

# Or local PostgreSQL
createdb user_management
psql user_management < database/init.sql
```

## Testing
- Backend: Jest with Supertest
- Frontend: React Testing Library
- API: Comprehensive endpoint testing
- Authentication: Token validation tests

## Monitoring and Logs
- Docker health checks
- Application logging
- Error tracking and reporting
- Performance monitoring

## Future Enhancements
- Google authentication integration
- Advanced audit logging
- Email notifications
- Bulk user operations
- Advanced reporting and analytics
- Mobile application
- API rate limiting per user
- Two-factor authentication

## Troubleshooting

### Common Issues
1. **Azure Authentication Fails**
   - Verify Azure App Registration configuration
   - Check redirect URIs match deployment URL
   - Ensure client secret is correct

2. **Database Connection Issues**
   - Verify PostgreSQL container is running
   - Check database credentials in .env
   - Ensure network connectivity between containers

3. **Frontend Not Loading**
   - Check if backend API is accessible
   - Verify CORS configuration
   - Check browser console for errors

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## License
MIT License - See COPYRIGHT.md for details

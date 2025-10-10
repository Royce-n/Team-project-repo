# User Management System

A comprehensive web-based user management system with Office365 authentication, built with React, Node.js, and PostgreSQL, deployed on DigitalOcean using Docker.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Azure App Registration configured
- DigitalOcean droplet (or local development)

### Deployment
1. Clone the repository
2. Copy environment variables:
   ```bash
   cp env.example .env
   ```
3. Configure Azure credentials in `.env`
4. Deploy:
   ```bash
   # Linux/Mac
   ./deploy.sh
   
   # Windows
   .\deploy.ps1
   ```

### Access
- **Frontend**: http://143.110.148.157:3000
- **Backend API**: http://143.110.148.157:5000

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Node.js API   │    │   PostgreSQL    │
│   (Port 3000)   │◄──►│   (Port 5000)   │◄──►│   (Port 5432)   │
│   - MSAL Auth   │    │   - JWT Auth    │    │   - User Data   │
│   - Tailwind UI │    │   - Express.js  │    │   - Role Data   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✨ Features

- **Office365 Authentication** - Single sign-on with Microsoft accounts
- **User Management** - Complete CRUD operations for user accounts
- **Role-Based Access Control** - Three-tier permission system
- **User Deactivation** - Soft deactivation with admin controls
- **Responsive UI** - Modern, mobile-friendly interface
- **Docker Deployment** - Containerized for easy deployment

## 🛠️ Tech Stack

- **Frontend**: React 18, Tailwind CSS, Azure MSAL
- **Backend**: Node.js, Express.js, JWT
- **Database**: PostgreSQL
- **Authentication**: Office365 via Microsoft Graph API
- **Deployment**: Docker, Docker Compose, Nginx

## 📋 API Endpoints

### Authentication
- `POST /api/auth/office365` - Office365 login
- `GET /api/auth/profile` - Get user profile

### Users (Admin/Manager)
- `GET /api/users` - List users with pagination
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/deactivate` - Deactivate user

### Roles (Admin only)
- `GET /api/roles` - List roles
- `POST /api/roles` - Create role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role

## 🔐 Security

- JWT token authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting (100 req/15min)
- CORS protection
- Security headers
- SQL injection prevention

## 👥 Team Members

- Royce Nguyen
- Josh Gulizia
- Alan Escamilla
- Phuong Ho

## 📚 Documentation

See [UserManagement.md](UserManagement.md) for detailed documentation including:
- Complete feature overview
- API documentation
- Deployment instructions
- Troubleshooting guide
- Development setup

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## 🔧 Development

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

## 📄 License

MIT License - See [COPYRIGHT.md](COPYRIGHT.md) for details

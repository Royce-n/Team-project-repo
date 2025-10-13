# Local Development Setup

This guide will help you set up the project for local development without Docker.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v12 or higher) - The main database
3. **npm** or **yarn**

## Database Setup

The project connects to the main PostgreSQL database. No local database setup required!

**Database Details:**

- **Host**: 143.110.148.157
- **Port**: 5432
- **Database**: user_management
- **Username**: postgres
- **Password**: SD2025COOLGROUP

**Add test users** (for development):

```bash
psql -h 143.110.148.157 -U postgres -d user_management -c "
INSERT INTO users (email, name, role, status, azure_id) VALUES
('admin@test.com', 'Admin User', 'admin', 'active', 'test-admin'),
('manager@test.com', 'Manager User', 'manager', 'active', 'test-manager'),
('user@test.com', 'Basic User', 'basicuser', 'active', 'test-user')
ON CONFLICT (email) DO NOTHING;"
```

## Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The backend will be available at `http://localhost:5000`

## Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

## Test Credentials

After adding the test users, you can login with these credentials:

- **Admin User**: `admin@test.com` / `password123` (Full access)
- **Manager User**: `manager@test.com` / `password123` (User management access)
- **Basic User**: `user@test.com` / `password123` (Limited access)

## Configuration

The project uses local configuration files for development:

- **Backend**: `backend/config.local.js` - Contains database and server configuration
- **Frontend**: `frontend/src/config.local.js` - Contains API URL and Azure configuration

## Troubleshooting

### Database Connection Issues

- Ensure you have internet connectivity to reach the main database
- Check that the database `user_management` exists with the correct credentials
- Verify the connection string in `backend/config.local.js` (uses main database credentials)
- Test connection: `psql -h 143.110.148.157 -U postgres -d user_management`

### Port Already in Use

- Backend runs on port 5000 by default
- Frontend runs on port 3000 by default
- Change ports in the respective config files if needed

### CORS Issues

- The backend is configured to allow requests from `http://localhost:3000`
- If you change the frontend port, update the CORS configuration in `backend/server.js`

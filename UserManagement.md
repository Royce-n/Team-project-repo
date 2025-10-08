# User Management Project — Project Description

## Overview
This project is a web-based user management system that uses Office365 (Microsoft Entra / Azure AD) for authentication. It supports role-based access control, user CRUD by administrators, user deactivation/reactivation, and audit logging.

## Tech stack
- Backend: Django (or Flask) — choose one
- Database: PostgreSQL
- Authentication: Microsoft Entra (Office365) / Microsoft Graph (msal)
- Hosting: Azure App Service
- CI: GitHub Actions

## Features (planned/implemented)
- Authentication with Office365
- Admin CRUD for users (name, email, role, status)
- Roles: basicuser (default), admin, manager
- RBAC enforcement in backend
- User deactivation / reactivation
- UI: Admin dashboard + user list/detail/edit
- Tests: unit tests + integration tests

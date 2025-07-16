# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

settings:
  dangerouslySkipPermissions: true

## Project Overview

Web Matcha is a modern dating application built with React, Express.js, and PostgreSQL. The architecture is a full-stack monorepo with separate frontend and backend services containerized with Docker.

## Functional Objective

Matcha is a dating application where users can:
- Register and log in with email verification
- Complete their profile (photos, gender, sexual preferences, tags, biography)
- Browse and search other users based on filters (age, location, fame rating, interests)
- View who has liked or visited them
- Like other users and connect if the like is mutual
- Chat in real-time with matched users
- Receive real-time notifications (likes, messages, views, unlikes)
- Block, report, or disconnect from other users

## Technical Constraints
- Programming Language: [To be defined, e.g., Node.js + Express]
- Frontend: [To be defined, e.g., React, Bootstrap]
- DB: PostgreSQL (manual SQL queries)
- Chat: WebSocket or long-polling
- Auth: Custom + Email verification + Password reset
- Server: [Apache / Nginx / Node built-in]
- No ORM, no full-stack frameworks
- Forms and inputs must be validated (no JS/HTML injection)
- Passwords must be hashed
- Minimum 500 user profiles in DB
- Responsive design required
- Must work on latest Firefox and Chrome
- No security vulnerabilities allowed

## Development Commands

### Starting the Application
```bash
# Full application with Docker (recommended)
docker-compose up

# Start development with script
./start-dev.sh

# Individual services
docker-compose up backend
docker-compose up frontend
docker-compose up postgres
```

### Backend Development (backend/)
```bash
# Development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Production start
npm run start

# Run built application
npm run start:dev

# Database management
npm run clean:db              # Clean database
npm run clean:complete        # Complete database cleanup
npm run fix:sequences         # Fix database sequences

# Profile generation scripts
npm run seed:500              # Generate 500 test profiles
npm run generate:realistic    # Generate realistic profiles
npm run generate:ai           # Generate AI profiles
npm run reset:profiles        # Clean and regenerate profiles

# Testing
npm run test
npm run test:watch
```

### Frontend Development (frontend/)
```bash
# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Application Architecture

### Backend (Express.js + TypeScript)
- **Entry Point**: `backend/src/index.ts` - Main server configuration with security middleware (helmet, CORS, sanitization)
- **Database**: PostgreSQL with connection pooling via `backend/src/config/database.ts`
- **Authentication**: JWT-based auth with email verification flow
- **Routes**: 
  - `/api/auth/*` - Authentication endpoints
  - `/api/profile/*` - Profile management 
  - `/api/photos/*` - Photo upload/management
- **Models**: TypeScript interfaces in `backend/src/models/` (User, Profile, Photo)
- **Middleware**: Authentication, error handling, input sanitization, validation
- **Scripts**: Database management and profile generation utilities

### Frontend (React + TypeScript + Vite)
- **Entry Point**: `frontend/src/App.tsx` - Main routing and authentication flow
- **Routing**: Protected routes with profile completion checks
- **State Management**: React Context for authentication (`AuthContext`)
- **UI Framework**: TailwindCSS with Radix UI components
- **Key Features**:
  - Authentication flow with email verification
  - Profile completion system with photo upload
  - User dashboard and browsing functionality
  - Responsive design with gradient backgrounds

### Database Schema
PostgreSQL with the following key tables:
- `users` - Core user authentication data
- `profiles` - Extended profile information (biography, age, location, interests)
- `photos` - Profile photos stored as base64 with metadata
- Additional tables for likes, matches, notifications, visits, blocks, reports

### Docker Configuration
- **postgres**: PostgreSQL 15 on port 5433 with health checks
- **backend**: Express.js API on port 3001 with volume mounting for hot reload
- **frontend**: React dev server on port 5173 with Vite
- **adminer**: Database administration interface on port 8080

## Development Workflow

### Profile System
The application has a two-stage user setup:
1. **Registration**: Basic user account creation with email verification
2. **Profile Completion**: Required before accessing main features (biography, photos, location, interests)

### Photo Management
Photos are stored as base64 data in the database with metadata. The system supports:
- Multiple photos per user with one designated as profile picture
- Advanced photo upload component with preview
- Image processing and validation

### Security Features
- Helmet.js for HTTP security headers
- CORS configuration for multiple frontend origins
- Input sanitization middleware
- JWT token authentication
- bcrypt password hashing
- Email verification system

## Testing & Database

Access database via Adminer at http://localhost:8080:
- Server: postgres
- User: matcha_user
- Password: matcha_password
- Database: matcha_db

The application includes extensive database scripts for generating test data and managing database state during development.

## Key Components to Understand

- `frontend/src/hooks/useProfileCompletion.ts` - Profile completion logic
- `frontend/src/contexts/AuthContext.tsx` - Authentication state management
- `backend/src/middleware/auth.ts` - JWT authentication middleware
- `backend/src/routes/` - API endpoint definitions
- `frontend/src/pages/ProfileCompletionPage.tsx` - Multi-step profile setup
- `backend/src/scripts/` - Database management utilities
# JiffyJobs

A community-based micro-job platform that connects people who need help with tasks to helpers in their neighborhood.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running Locally](#running-locally)
- [Building for Production](#building-for-production)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

## Overview

JiffyJobs is a full-stack web application that enables users to post small tasks, bid on tasks, and connect with helpers in their local community. The platform includes features for task management, payments, real-time chat, reviews, and admin moderation.

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **PostgreSQL** database
- **Prisma** ORM
- **Socket.IO** for real-time communication
- **Stripe** for payment processing
- **JWT** for authentication

### Frontend
- **React** 18 with **TypeScript**
- **Vite** build tool
- **Material-UI (MUI)** for UI components
- **React Router** for navigation
- **Axios** for API calls
- **Socket.IO Client** for real-time updates
- **React Leaflet** for maps

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **PostgreSQL** (v15 or higher)
- **Docker** (optional, for running PostgreSQL via Docker Compose)

## Installation

**Quick local setup:** see **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** for copy-paste steps (Docker Postgres, migrations, optional env vars).

### 1. Clone the Repository

```bash
git clone https://github.com/priyank-neu/JiffyJobs.git
cd JiffyJobs
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Edit .env — see backend/.env.example
# Required for a minimal local run: DATABASE_URL (and defaults in .env.example)
# Optional: RESEND_API_KEY (emails), STRIPE_* (payments), AWS_* (uploads) — see LOCAL_SETUP.md
```

### 3. Database Setup

```bash
# Using Docker Compose (recommended for development)
cd ..
docker-compose up -d

# Or use your own PostgreSQL instance
# Update DATABASE_URL in backend/.env

# Apply migrations (from backend/)
npx dotenv -e .env -- prisma migrate deploy

# Or: npm run prisma:generate && npm run prisma:migrate  (migrate dev — creates DB if needed)

# If you see migration drift on an old DB: prisma migrate reset (dev only — wipes data)

# (Optional) Seed skills
npm run seed-skills
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Edit .env file
# Required variables:
# - VITE_API_URL (e.g., http://localhost:5001/api)
```

## Running Locally

### Start Backend

```bash
cd backend

# Development mode (with hot reload)
npm run dev

# The backend will run on http://localhost:5001
```

### Start Frontend

```bash
cd frontend

# Development mode
npm run dev

# The frontend will run on http://localhost:5173
```

## Building for Production

### Backend

```bash
cd backend

# Build TypeScript
npm run build

# Start production server
npm start
```

### Frontend

```bash
cd frontend

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in UI mode
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## Deployment

### Backend Deployment (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm ci && npm run build && npx prisma migrate deploy`
4. Set start command: `npm start`
5. Add environment variables in Render dashboard
6. Deploy

### Frontend Deployment (Vercel)

1. Import project from GitHub in Vercel
2. Set root directory to `frontend`
3. Add environment variables:
   - `VITE_API_URL`: Your backend API URL
4. Deploy

See deployment guides in the repository for detailed instructions.

## Project Structure

```
JiffyJobs/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utility functions
│   │   └── __tests__/       # Test files
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Database migrations
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   └── __tests__/       # Test files
│   └── package.json
├── .github/
│   └── workflows/           # CI/CD workflows
└── README.md
```

## Environment Variables

### Backend (`.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/jiffyjobs
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@jiffyjobs.com
COOKIE_SECRET=your-cookie-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
PLATFORM_FEE_PERCENTAGE=5.0
AUTO_RELEASE_HOURS=48
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:5001/api
VITE_STRIPE_PUBLIC_KEY=your-stripe-publishable-key
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

## License

ISC

## Repository

https://github.com/priyank-neu/JiffyJobs

# Glass Order Management System

A modern web application for managing glass manufacturing orders with AI-powered voice assistance.

## Features

- **Order Management**: Create, track, and manage glass orders
- **Customer Management**: Maintain customer database and relationships
- **Voice Assistant (LISA)**: AI-powered voice interface for hands-free operation
- **Real-time Reports**: Analytics and reporting dashboard
- **Email Notifications**: Automated order status updates
- **PDF Generation**: Generate order reports and invoices

## Tech Stack

### Backend
- **NestJS** - Node.js framework
- **Prisma** - Database ORM
- **PostgreSQL** - Database (Supabase)
- **Socket.IO** - WebSocket communication
- **Groq API** - AI language model

### Frontend
- **React** - Frontend framework
- **TypeScript** - Type safety
- **Material-UI** - UI components
- **Vite** - Build tool
- **Socket.IO Client** - Real-time communication

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm package manager

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd OrderOverView
```

2. Install dependencies
```bash
pnpm install
```

3. Configure environment variables
```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your configuration

# Frontend  
cp apps/frontend/.env.example apps/frontend/.env
# Edit apps/frontend/.env with your configuration
```

4. Run database migrations
```bash
cd apps/backend
pnpm prisma migrate dev
pnpm prisma generate
```

5. Start development servers
```bash
# Start backend (from root)
pnpm dev:backend

# Start frontend (from root) 
pnpm dev:frontend
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://..."
GROQ_API_KEY="gsk_..."
OPENAI_API_KEY="sk-..."
MAILERSEND_API_TOKEN="mlsn_..."
CLIENT_URL="http://localhost:5173"
```

### Frontend (.env)
```env
VITE_API_URL="http://localhost:3001"
VITE_WEBSOCKET_URL="ws://localhost:3001"
VITE_ENABLE_VOICE="true"
VITE_ELEVENLABS_API_KEY="..."
```

## Scripts

```bash
# Development
pnpm dev:backend    # Start backend development server
pnpm dev:frontend   # Start frontend development server
pnpm dev           # Start both servers

# Build
pnpm build:backend  # Build backend for production
pnpm build:frontend # Build frontend for production
pnpm build         # Build both applications

# Database
pnpm db:migrate    # Run database migrations
pnpm db:generate   # Generate Prisma client
pnpm db:seed       # Seed database with sample data
```

## API Endpoints

- `GET /api/orders` - List all orders
- `POST /api/orders` - Create new order
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create new customer
- `GET /api/reports` - Get analytics data
- `WebSocket /voice` - Voice assistant connection

## Voice Assistant (LISA)

The application includes LISA (Language Intelligence Support Assistant), an AI-powered voice interface that allows users to:

- Create orders by voice
- Search and retrieve order information
- Navigate the application
- Get real-time assistance

To enable voice features, ensure `VITE_ENABLE_VOICE=true` in your frontend environment.

## Deployment

### Backend (Render)
The backend is configured for deployment on Render with automatic builds from the main branch.

### Frontend (Vercel)
The frontend is configured for deployment on Vercel with automatic builds and optimizations.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure code quality
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

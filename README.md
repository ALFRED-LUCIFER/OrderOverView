# Glass Order Management System

A comprehensive full-stack monorepo application for managing glass orders in the manufacturing industry.

## 🚀 Tech Stack

### Frontend
- **Vite + React + TypeScript** - Modern development experience
- **Material UI** - Beautiful, accessible components
- **TanStack Query** - Powerful data synchronization
- **React Hook Form** - Performant forms with easy validation
- **React Router** - Client-side routing

### Backend
- **NestJS + TypeScript** - Scalable Node.js framework
- **Prisma ORM** - Type-safe database access
- **Swagger** - API documentation
- **PostgreSQL** - Robust relational database

### Infrastructure
- **Supabase PostgreSQL** - Cloud database with PostGIS support
- **Monorepo structure** - Organized codebase with workspaces

## 📋 Requirements List

### Core Features
1. **Customer Management**
   - ✅ Create, read, update, delete customers
   - ✅ Store worldwide customer data (name, email, phone, address, country, city, company)
   - ✅ Search and filter customers
   - ✅ View customer order history

2. **Order Management**
   - ✅ Create, read, update, delete orders
   - ✅ Glass type selection (Float, Tempered, Laminated, Insulated, Low-E, etc.)
   - ✅ Glass class options (Single Glass, IG Class, Double Glazed, etc.)
   - ✅ Detailed specifications (dimensions, thickness, quantity)
   - ✅ Pricing management (unit price, total price, currency)
   - ✅ Order status tracking (Pending, Confirmed, In Production, etc.)
   - ✅ Priority levels (Low, Medium, High, Urgent)
   - ✅ Additional options (tempering, laminating, edge work, coating)
   - ✅ Order number generation
   - ✅ Required date tracking

3. **Dashboard & Analytics**
   - ✅ Key metrics overview
   - ✅ Recent orders display
   - ✅ Order status distribution
   - ✅ Revenue tracking

### Voice Recognition Integration (To Be Implemented)
4. **n8n Voice Integration**
   - 🔄 Voice-to-text conversion
   - 🔄 Natural language order processing
   - 🔄 Automated order creation from voice commands
   - 🔄 Customer lookup by voice
   - 🔄 Order status updates via voice

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm 8+
- PostgreSQL database (Supabase recommended)
- Git

### 1. Clone and Install Dependencies

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd OrderOverView

# Install dependencies for all workspaces
npm install
npm run install:all
\`\`\`

### 2. Database Setup

#### Option A: Supabase (Recommended)
1. Create a new project at [supabase.com](https://supabase.com)
2. Get your connection string from Project Settings > Database
3. Copy the connection string

#### Option B: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a new database
3. Format connection string: `postgresql://username:password@localhost:5432/database_name`

### 3. Backend Configuration

\`\`\`bash
# Navigate to backend
cd apps/backend

# Update environment variables
cp .env.example .env
# Edit .env and update DATABASE_URL with your connection string

# Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:push

# Optional: Open Prisma Studio to view database
npm run prisma:studio
\`\`\`

### 4. Run the Application

\`\`\`bash
# From root directory - runs both frontend and backend
npm run dev

# Or run separately:
# Backend (http://localhost:3001)
npm run dev:backend

# Frontend (http://localhost:5173)
npm run dev:frontend
\`\`\`

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **API Documentation**: http://localhost:3001/api/docs

## 📁 Project Structure

\`\`\`
OrderOverView/
├── package.json                 # Root package with workspace config
├── apps/
│   ├── frontend/               # React application
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── pages/          # Page components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # API services
│   │   │   ├── types/          # TypeScript type definitions
│   │   │   └── utils/          # Utility functions
│   │   └── package.json
│   └── backend/                # NestJS application
│       ├── src/
│       │   ├── customers/      # Customer module
│       │   ├── orders/         # Orders module
│       │   ├── prisma/         # Database service
│       │   ├── app.module.ts   # Main app module
│       │   └── main.ts         # Application entry point
│       ├── prisma/
│       │   └── schema.prisma   # Database schema
│       └── package.json
└── packages/
    └── shared/                 # Shared utilities (future)
\`\`\`

## 🔄 Development Workflow

### Adding New Features

1. **Database Changes**:
   \`\`\`bash
   # Update schema in apps/backend/prisma/schema.prisma
   # Generate and apply changes
   cd apps/backend
   npm run prisma:generate
   npm run prisma:push
   \`\`\`

2. **Backend Development**:
   - Add/modify controllers in \`src/*/\*.controller.ts\`
   - Add/modify services in \`src/*/\*.service.ts\`
   - Add/modify DTOs in \`src/*/dto/\*.dto.ts\`

3. **Frontend Development**:
   - Add/modify pages in \`src/pages/\`
   - Add/modify components in \`src/components/\`
   - Update API hooks in \`src/hooks/useApi.ts\`

### API Testing
- Use the Swagger UI at http://localhost:3001/api/docs
- Test endpoints directly from the documentation interface

## 🎯 Next Steps: Voice Integration

### n8n Setup Plan

1. **Install n8n**:
   \`\`\`bash
   npm install n8n -g
   # Or use Docker
   docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
   \`\`\`

2. **Create Voice Workflow**:
   - Voice input node (Speech-to-Text)
   - Natural Language Processing node
   - Customer lookup node
   - Order creation node
   - Response generation node

3. **Integration Points**:
   - **Voice Commands**: "Create order for John Doe, IG class, 1200x800x6mm, quantity 5"
   - **Customer Lookup**: "Find customer with email john@example.com"
   - **Order Status**: "Update order ORD-20250616-001 to confirmed"
   - **Pricing**: "Calculate price for tempered glass 1500x1000x8mm"

### Voice Command Examples

- **Create Order**: 
  - "Create order for ABC Company, IG class glass, 1200 by 800 by 6 millimeters, quantity 10"
  
- **Update Status**: 
  - "Update order number ORD-20250616-001 status to in production"
  
- **Customer Inquiry**: 
  - "Show me all orders for John Smith"
  
- **Quick Quote**: 
  - "Quote for single glass, 1000 by 1000 by 4 millimeters, quantity 5"

## 🌍 Global Customer Support

The system supports customers worldwide with:
- International address formats
- Multiple currency support (USD default, extensible)
- Country and city tracking
- Phone number formats for different regions
- Multi-language company names

## 📊 Business Logic

### Order Processing Flow
1. Customer places/voice creates order
2. System generates unique order number
3. Order enters PENDING status
4. Manual/automatic confirmation moves to CONFIRMED
5. Production tracking through IN_PRODUCTION → QUALITY_CHECK
6. Delivery management with READY_FOR_DELIVERY → DELIVERED

### Pricing Structure
- Unit price per glass piece
- Automatic total calculation (unit price × quantity)
- Additional costs for special processing (tempering, laminating)
- Currency support for international customers

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify DATABASE_URL in .env
   - Ensure database is running
   - Check network connectivity

2. **Frontend API Errors**:
   - Verify backend is running on port 3001
   - Check CORS configuration
   - Inspect browser network tab

3. **Prisma Issues**:
   - Run \`npm run prisma:generate\` after schema changes
   - Use \`npm run prisma:push\` to sync with database
   - Check Prisma Studio for data visualization

## 📝 License

This project is proprietary software for glass manufacturing order management.

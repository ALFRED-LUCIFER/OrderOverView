# Glass Order Management System - Deployment Guide

## 🚀 Vercel Deployment Setup

This project is configured for automatic deployment to Vercel using GitHub Actions.

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Configure secrets in GitHub and Vercel

### 🔧 Setup Instructions

#### 1. Create Vercel Projects

**Frontend Project:**
```bash
# Navigate to apps/frontend
cd apps/frontend

# Deploy to Vercel (first time)
npx vercel --prod

# Note the project ID and org ID from the output
```

**Backend Project:**
```bash
# Navigate to apps/backend
cd apps/backend

# Deploy to Vercel (first time)
npx vercel --prod

# Note the project ID and org ID from the output
```

#### 2. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_organization_id
VERCEL_PROJECT_ID=frontend_project_id
VERCEL_BACKEND_PROJECT_ID=backend_project_id
```

**To get your Vercel token:**
1. Go to [Vercel Settings → Tokens](https://vercel.com/account/tokens)
2. Create a new token
3. Copy the token value

#### 3. Configure Environment Variables

**Frontend (.env):**
```env
VITE_API_URL=https://your-backend-url.vercel.app
VITE_WEBSOCKET_URL=wss://your-backend-url.vercel.app
VITE_ENABLE_VOICE=true
```

**Backend Environment Variables (in Vercel Dashboard):**
```env
NODE_ENV=production
DATABASE_URL=your_database_connection_string
GROQ_API_KEY=your_groq_api_key
```

#### 4. Update Frontend Configuration

Update `apps/frontend/vercel.json` with your actual backend URL:
```json
{
  "env": {
    "VITE_API_URL": "https://your-actual-backend-url.vercel.app",
    "VITE_WEBSOCKET_URL": "wss://your-actual-backend-url.vercel.app",
    "VITE_ENABLE_VOICE": "true"
  }
}
```

#### 5. Update Backend CORS

Update `apps/backend/src/main.ts` CORS configuration:
```typescript
app.enableCors({
  origin: [
    'http://localhost:5173', 
    'https://localhost:5173',
    'https://your-actual-frontend-url.vercel.app',
    /https:\/\/.*\.vercel\.app$/
  ],
  // ... rest of config
});
```

### 🔄 Automatic Deployment

Once configured, deployments happen automatically:

- **Push to main/master**: Triggers production deployment
- **Pull requests**: Triggers preview deployments
- **Both frontend and backend** deploy simultaneously

### 📁 Project Structure

```
/
├── .github/workflows/deploy.yml  # GitHub Actions workflow
├── .gitignore                    # Git ignore file
├── apps/
│   ├── frontend/
│   │   ├── vercel.json          # Frontend Vercel config
│   │   └── ...
│   └── backend/
│       ├── vercel.json          # Backend Vercel config
│       └── ...
```

### 🧪 Local Development

```bash
# Install dependencies
pnpm install

# Start backend
cd apps/backend
pnpm run start:dev

# Start frontend (in another terminal)
cd apps/frontend
pnpm run dev
```

### 🐛 Troubleshooting

**Build Failures:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

**CORS Errors:**
- Update backend CORS origins with your Vercel URLs
- Check that frontend is using correct backend URL

**Database Issues:**
- Ensure DATABASE_URL is set in Vercel environment
- For SQLite in production, consider migrating to PostgreSQL

**Voice Service Issues:**
- Verify GROQ_API_KEY is set in backend environment
- Check WebSocket connections work over HTTPS/WSS

### 📊 Monitoring

Monitor your deployments:
- **Vercel Dashboard**: Real-time logs and metrics
- **GitHub Actions**: Build and deployment status
- **Vercel Analytics**: Performance insights

### 🔐 Security Notes

- Environment variables are encrypted in Vercel
- Swagger docs are disabled in production
- CORS is configured for specific domains
- Database credentials should use connection pooling

---

## 🎉 Success!

Your Glass Order Management System with LISA Voice Assistant is now deployed to Vercel with automatic CI/CD! 

**Frontend URL**: `https://your-frontend-url.vercel.app`  
**Backend URL**: `https://your-backend-url.vercel.app`  
**API Docs**: Available only in development mode

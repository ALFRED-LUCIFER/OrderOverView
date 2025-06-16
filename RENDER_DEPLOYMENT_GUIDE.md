# 🚀 Render Deployment Guide

## ✅ Quick Fix for Your Current Error

The error you're seeing is due to incorrect build command syntax. Here's the fix:

### **Corrected Build Command:**
```bash
cd apps/backend && pnpm render:build
```

### **Corrected Start Command:**
```bash
cd apps/backend && pnpm render:start
```

---

## 🔧 Complete Render Setup

### **Step 1: Update Your Render Service Settings**

1. **Go to your Render dashboard**
2. **Select your backend service**
3. **Go to Settings**
4. **Update these fields:**

```
Build Command: cd apps/backend && pnpm render:build
Start Command: cd apps/backend && pnpm render:start
Root Directory: (leave empty - use repository root)
```

### **Step 2: Environment Variables**

Set these in Render dashboard under Environment:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres.gaawxrnvbsnzynqxdwwd:Servize2424a@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
GROQ_API_KEY=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
OPENAI_API_KEY=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
ENABLE_VOICE_FEATURES=true
VOICE_SESSION_TIMEOUT=300000
ENABLE_CONTINUOUS_LISTENING=true
VOICE_ACTIVITY_THRESHOLD=0.3
SILENCE_TIMEOUT_MS=1500
MAX_CONVERSATION_LENGTH=30
INTERRUPT_THRESHOLD=0.5
AI_RESPONSE_STYLE=conversational_telephonic
ENABLE_FILLER_WORDS=true
ENABLE_THINKING_SOUNDS=true
PDF_STORAGE_PATH=./temp/pdfs
PDF_CLEANUP_INTERVAL=3600000
CLIENT_URL=https://your-frontend-url.onrender.com
```

### **Step 3: Deploy**

1. **Save the settings**
2. **Trigger a new deployment**
3. **Watch the build logs**

---

## 🔍 What Was Fixed

### **Problem:**
```bash
# ❌ This was causing the error:
buildCommand=cd apps/backend && NODE_OPTIONS=\"--max-old-space-size=2048\" pnpm install && pnpm prisma:generate && pnpm build
```

### **Issues:**
1. **Wrong script name**: `pnpm prisma:generate` → Should be `pnpm db:generate`
2. **Complex quoting**: Escaped quotes causing parse errors
3. **Unnecessary NODE_OPTIONS**: Not needed for standard build

### **Solution:**
```bash
# ✅ Simple, clean command:
cd apps/backend && pnpm render:build
```

**The new `render:build` script handles everything:**
```json
"render:build": "pnpm install && pnpm db:generate && pnpm build"
```

---

## 📋 Alternative Deployment Methods

### **Option 1: Manual Commands (if script doesn't work)**
```bash
Build Command: cd apps/backend && pnpm install && pnpm db:generate && pnpm build
Start Command: cd apps/backend && node dist/main
```

### **Option 2: Using render.yaml (Infrastructure as Code)**
1. **Copy the `render.yaml` file to your repository root**
2. **Update the CLIENT_URL with your frontend URL**
3. **Connect Render to your GitHub repository**
4. **Render will automatically use the yaml configuration**

---

## 🎯 Expected Build Process

```bash
1. cd apps/backend          # Navigate to backend directory
2. pnpm install             # Install dependencies
3. pnpm db:generate         # Generate Prisma client
4. pnpm build              # Build NestJS application
5. node dist/main          # Start the application
```

---

## 🔧 Troubleshooting

### **If build still fails:**

1. **Check Node.js version**: Set to `18.x` or `20.x`
2. **Verify package.json**: Ensure `render:build` script exists
3. **Check logs**: Look for specific error messages
4. **Database connection**: Verify DATABASE_URL is correct

### **Common Issues:**

**Memory Issues:**
```bash
# Add to environment variables if needed:
NODE_OPTIONS=--max-old-space-size=2048
```

**Package Manager:**
```bash
# If pnpm isn't available, fallback to npm:
Build Command: cd apps/backend && npm install && npm run db:generate && npm run build
Start Command: cd apps/backend && npm run start:prod
```

---

## ✅ Success Indicators

When deployment succeeds, you should see:
```
🚀 Application is running on: https://your-app.onrender.com
📡 WebSocket available at: wss://your-app.onrender.com
```

Your API will be available at:
- **Base URL**: `https://your-app.onrender.com`
- **Health Check**: `https://your-app.onrender.com/api/voice/health`
- **All routes**: `https://your-app.onrender.com/api/*`

---

**Ready to deploy! Try the corrected build command and it should work.** 🚀

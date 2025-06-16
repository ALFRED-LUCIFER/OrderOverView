# Render Configuration for Glass Order Backend

## Service Settings

**Service Type**: Web Service
**Environment**: Node.js
**Build Command**: `cd apps/backend && pnpm render:build`
**Start Command**: `cd apps/backend && pnpm render:start`
**Root Directory**: `/` (repository root)

## Environment Variables

Add these in Render dashboard:

```
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

## Corrected Commands

**Build Command (Fixed)**: 
```bash
cd apps/backend && pnpm render:build
```

**Start Command**: 
```bash
cd apps/backend && pnpm render:start
```

## Node.js Version
- Set to: `18.x` or `20.x`

## Auto-Deploy
- Enable auto-deploy from your main branch

#!/bin/bash

# Vercel Deployment Setup Script
# Run this script to set up initial Vercel deployments

echo "🚀 Setting up Vercel deployment for Glass Order Management System"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
else
    echo "✅ Vercel CLI found"
fi

echo ""
echo "📋 Setup Instructions:"
echo ""
echo "1. Make sure you're logged into Vercel:"
echo "   vercel login"
echo ""
echo "2. Deploy frontend (first time):"
echo "   cd apps/frontend && vercel --prod"
echo ""
echo "3. Deploy backend (first time):"
echo "   cd apps/backend && vercel --prod"
echo ""
echo "4. Note down the project IDs from the deployment output"
echo ""
echo "5. Add GitHub secrets:"
echo "   - VERCEL_TOKEN (from vercel.com/account/tokens)"
echo "   - VERCEL_ORG_ID (from deployment output)"
echo "   - VERCEL_PROJECT_ID (frontend project ID)"
echo "   - VERCEL_BACKEND_PROJECT_ID (backend project ID)"
echo ""
echo "6. Update environment variables in Vercel dashboard"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""

read -p "Do you want to start the deployment process? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔑 Logging into Vercel..."
    vercel login
    
    echo ""
    echo "📦 Deploying frontend..."
    cd apps/frontend
    vercel --prod
    
    echo ""
    echo "📦 Deploying backend..."
    cd ../backend
    vercel --prod
    
    echo ""
    echo "✅ Initial deployment complete!"
    echo "🔧 Don't forget to:"
    echo "   1. Add GitHub secrets"
    echo "   2. Update environment variables"
    echo "   3. Update CORS origins in backend"
    echo "   4. Update API URLs in frontend config"
else
    echo "ℹ️  Run this script again when you're ready to deploy"
fi

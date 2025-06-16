#!/usr/bin/env node

// Check Vercel environment variables by testing the built frontend
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Frontend Environment Configuration...\n');

// Check if dist folder exists (built frontend)
const distPath = path.join(__dirname, 'apps', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
    console.log('✅ Frontend build found');
    
    // Look for environment variables in built files
    const indexFile = path.join(distPath, 'index.html');
    if (fs.existsSync(indexFile)) {
        const content = fs.readFileSync(indexFile, 'utf8');
        console.log('📄 Checking index.html for asset references...');
        
        // Find JS bundle
        const jsMatch = content.match(/\/assets\/index-[a-zA-Z0-9]+\.js/);
        if (jsMatch) {
            const jsFile = path.join(distPath, jsMatch[0]);
            if (fs.existsSync(jsFile)) {
                const jsContent = fs.readFileSync(jsFile, 'utf8');
                
                console.log('\n🔍 Searching for environment variables in bundle...');
                
                if (jsContent.includes('orderoverview-dkro.onrender.com')) {
                    console.log('✅ Found Render backend URL in bundle');
                    
                    // Check for WebSocket URL
                    if (jsContent.includes('wss://orderoverview-dkro.onrender.com')) {
                        console.log('✅ Found correct WebSocket URL');
                    } else {
                        console.log('❌ WebSocket URL not found or incorrect');
                    }
                    
                    // Check for voice enable flag
                    if (jsContent.includes('VITE_ENABLE_VOICE')) {
                        console.log('✅ Voice interface enabled');
                    } else {
                        console.log('⚠️  Voice interface flag not found');
                    }
                    
                } else {
                    console.log('❌ Render backend URL not found in bundle');
                    
                    // Check for old URLs
                    if (jsContent.includes('localhost:3001')) {
                        console.log('❌ Found localhost URLs - environment not updated');
                    }
                    if (jsContent.includes('your-backend-url.vercel.app')) {
                        console.log('❌ Found placeholder URLs - vercel.json not updated');
                    }
                }
            }
        }
    }
} else {
    console.log('⚠️  No frontend build found. Building...');
    
    // Trigger a build to check current configuration
    const { execSync } = require('child_process');
    try {
        execSync('cd apps/frontend && pnpm run build', { stdio: 'inherit' });
        console.log('✅ Build completed. Re-run this script to check configuration.');
    } catch (error) {
        console.error('❌ Build failed:', error.message);
    }
}

console.log('\n🔗 Testing API endpoints...');

// Test API endpoint
const https = require('https');
const url = require('url');

function testEndpoint(endpoint, description) {
    return new Promise((resolve) => {
        const options = url.parse(endpoint);
        options.timeout = 5000;
        
        const req = https.get(options, (res) => {
            console.log(`✅ ${description}: ${res.statusCode}`);
            resolve(true);
        });
        
        req.on('error', (error) => {
            console.log(`❌ ${description}: ${error.message}`);
            resolve(false);
        });
        
        req.on('timeout', () => {
            console.log(`⏰ ${description}: Timeout`);
            req.destroy();
            resolve(false);
        });
    });
}

async function runTests() {
    await testEndpoint('https://orderoverview-dkro.onrender.com/api/docs', 'Backend API Docs');
    await testEndpoint('https://orderoverview-dkro.onrender.com/api/customers', 'Customers API');
    await testEndpoint('https://order-over-view-frontend.vercel.app', 'Frontend Vercel');
    
    console.log('\n✅ Environment check complete!');
}

runTests();

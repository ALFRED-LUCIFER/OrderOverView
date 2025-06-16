#!/usr/bin/env node

// Simple deployment monitor
const fetch = require('node-fetch');

const VERCEL_URL = 'https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app';
let lastBundleHash = 'Dz8OqLSi'; // Current hash
let checkCount = 0;

console.log('🔄 Monitoring for new Vercel deployment...\n');
console.log(`Current bundle: index-${lastBundleHash}.js`);
console.log('Checking every 15 seconds for changes...\n');

async function checkForNewDeployment() {
    try {
        checkCount++;
        const response = await fetch(VERCEL_URL);
        const html = await response.text();
        
        const bundleMatch = html.match(/\/assets\/index-([^\.]+)\.js/);
        const currentHash = bundleMatch ? bundleMatch[1] : 'unknown';
        
        console.log(`Check ${checkCount}: Bundle hash is ${currentHash}`);
        
        if (currentHash !== lastBundleHash && currentHash !== 'unknown') {
            console.log('\n🎉 NEW DEPLOYMENT DETECTED!');
            console.log(`   Previous: index-${lastBundleHash}.js`);
            console.log(`   Current:  index-${currentHash}.js`);
            console.log('\n✅ The new fix should now be live!');
            console.log('\n📋 Test the site now:');
            console.log(`   1. Visit: ${VERCEL_URL}`);
            console.log(`   2. Open browser console (F12)`);
            console.log(`   3. Look for: "🌐 Detected Vercel deployment, using production backend"`);
            console.log(`   4. Look for: "🔌 Connecting to WebSocket: wss://orderoverview-dkro.onrender.com"`);
            console.log(`   5. Try the LISA voice interface`);
            console.log('\n🎯 Expected: No more "X4: xhr poll error" messages!');
            
            process.exit(0);
        }
        
    } catch (error) {
        console.log(`❌ Error checking deployment: ${error.message}`);
    }
}

// Check immediately, then every 15 seconds
checkForNewDeployment();
const interval = setInterval(checkForNewDeployment, 15000);

// Timeout after 10 minutes
setTimeout(() => {
    console.log('\n⏰ Monitoring timeout after 10 minutes');
    console.log('Check Vercel dashboard for deployment status');
    clearInterval(interval);
    process.exit(1);
}, 600000);

console.log('Press Ctrl+C to stop monitoring\n');

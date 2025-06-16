#!/usr/bin/env node

// Monitor Vercel deployment and test WebSocket fix
const fetch = require('node-fetch');
const io = require('socket.io-client');

const VERCEL_URL = 'https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app';
const BACKEND_URL = 'wss://orderoverview-dkro.onrender.com';

console.log('🔄 Monitoring Vercel Deployment and Testing Fix...\n');

let lastDeploymentHash = null;
let testCount = 0;

async function checkDeploymentStatus() {
    try {
        const response = await fetch(VERCEL_URL);
        const html = await response.text();
        
        // Extract deployment hash from HTML (usually in meta tags or script URLs)
        const hashMatch = html.match(/\/assets\/index-([^\.]+)\.js/) || 
                         html.match(/"buildId":"([^"]+)"/) ||
                         html.match(/version["']\s*:\s*["']([^"']+)["']/);
        
        const currentHash = hashMatch ? hashMatch[1] : 'unknown';
        
        if (lastDeploymentHash === null) {
            lastDeploymentHash = currentHash;
            console.log(`📦 Current deployment hash: ${currentHash}`);
            console.log('🔍 Monitoring for changes...\n');
            return false; // First check
        }
        
        if (currentHash !== lastDeploymentHash) {
            console.log(`🎉 NEW DEPLOYMENT DETECTED!`);
            console.log(`   Previous: ${lastDeploymentHash}`);
            console.log(`   Current:  ${currentHash}\n`);
            lastDeploymentHash = currentHash;
            return true; // New deployment
        }
        
        return false; // No change
    } catch (error) {
        console.log(`❌ Error checking deployment: ${error.message}`);
        return false;
    }
}

async function testWebSocketConnection() {
    console.log(`🧪 Test ${++testCount}: WebSocket Connection`);
    console.log('=====================================');
    
    return new Promise((resolve) => {
        const socket = io(BACKEND_URL, {
            timeout: 8000,
            transports: ['websocket', 'polling'],
            extraHeaders: {
                'Origin': VERCEL_URL
            }
        });
        
        let connected = false;
        
        const timeout = setTimeout(() => {
            if (!connected) {
                console.log('❌ Connection timeout');
                socket.disconnect();
                resolve(false);
            }
        }, 8000);
        
        socket.on('connect', () => {
            connected = true;
            console.log(`✅ Connected successfully!`);
            console.log(`   Socket ID: ${socket.id}`);
            console.log(`   Transport: ${socket.io.engine.transport.name}`);
            
            clearTimeout(timeout);
            socket.disconnect();
            resolve(true);
        });
        
        socket.on('connect_error', (error) => {
            console.log(`❌ Connection error: ${error.message}`);
            clearTimeout(timeout);
            socket.disconnect();
            resolve(false);
        });
    });
}

async function monitor() {
    console.log('⏰ Starting monitoring (checking every 30 seconds)...\n');
    
    let deploymentDetected = false;
    let successfulTest = false;
    
    const checkInterval = setInterval(async () => {
        const newDeployment = await checkDeploymentStatus();
        
        if (newDeployment || !deploymentDetected) {
            deploymentDetected = true;
            
            // Wait a bit for deployment to be fully ready
            if (newDeployment) {
                console.log('⏳ Waiting 30 seconds for deployment to stabilize...\n');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
            
            // Test WebSocket connection
            const testResult = await testWebSocketConnection();
            
            if (testResult) {
                successfulTest = true;
                console.log('\n🎉 SUCCESS! WebSocket connection is working!');
                console.log('\n📋 You can now test the live site:');
                console.log(`   ${VERCEL_URL}`);
                console.log('\n✅ The fix has been successfully deployed and verified.');
                
                clearInterval(checkInterval);
                process.exit(0);
            } else {
                console.log('\n⚠️  WebSocket test failed. Will continue monitoring...\n');
            }
        } else {
            console.log(`⏳ Checking deployment... (${new Date().toLocaleTimeString()})`);
        }
    }, 30000); // Check every 30 seconds
    
    // Initial check
    await checkDeploymentStatus();
    
    // Timeout after 10 minutes
    setTimeout(() => {
        console.log('\n⏰ Monitoring timeout after 10 minutes');
        if (!successfulTest) {
            console.log('❌ WebSocket fix may not be working properly');
            console.log('Manual testing recommended');
        }
        clearInterval(checkInterval);
        process.exit(1);
    }, 600000); // 10 minutes
}

monitor().catch(console.error);

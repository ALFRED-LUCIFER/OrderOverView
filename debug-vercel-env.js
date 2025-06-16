const puppeteer = require('puppeteer');

async function checkVercelEnvironment() {
    console.log('🔍 Checking Vercel Frontend Environment Variables...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true 
    });
    
    try {
        const page = await browser.newPage();
        
        // Capture console logs
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('VITE_') || text.includes('WebSocket') || text.includes('wss://') || text.includes('ws://')) {
                console.log(`📝 Console: ${text}`);
            }
        });
        
        // Navigate to the Vercel site
        console.log('🌐 Navigating to Vercel site...');
        await page.goto('https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app', {
            waitUntil: 'networkidle0'
        });
        
        await page.waitForTimeout(3000);
        
        // Check environment variables
        console.log('🔍 Checking environment variables...');
        const envCheck = await page.evaluate(() => {
            console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
            console.log('VITE_WEBSOCKET_URL:', import.meta.env.VITE_WEBSOCKET_URL);
            console.log('VITE_ENABLE_VOICE:', import.meta.env.VITE_ENABLE_VOICE);
            
            return {
                apiUrl: import.meta.env.VITE_API_URL,
                websocketUrl: import.meta.env.VITE_WEBSOCKET_URL,
                voiceEnabled: import.meta.env.VITE_ENABLE_VOICE,
                mode: import.meta.env.MODE,
                prod: import.meta.env.PROD
            };
        });
        
        console.log('\n📊 Environment Variables Found:');
        console.log(`  API URL: ${envCheck.apiUrl || 'NOT SET'}`);
        console.log(`  WebSocket URL: ${envCheck.websocketUrl || 'NOT SET'}`);
        console.log(`  Voice Enabled: ${envCheck.voiceEnabled || 'NOT SET'}`);
        console.log(`  Mode: ${envCheck.mode || 'NOT SET'}`);
        console.log(`  Production: ${envCheck.prod || 'NOT SET'}`);
        
        // Test actual WebSocket connection attempt
        console.log('\n🔌 Testing WebSocket connection in browser...');
        
        const connectionTest = await page.evaluate(() => {
            return new Promise((resolve) => {
                try {
                    // Load Socket.IO
                    const script = document.createElement('script');
                    script.src = 'https://cdn.socket.io/4.7.0/socket.io.min.js';
                    script.onload = () => {
                        try {
                            // Use the same URL the frontend would use
                            const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';
                            console.log('🔗 Attempting connection to:', wsUrl);
                            
                            const socket = io(wsUrl, {
                                timeout: 10000,
                                transports: ['websocket', 'polling']
                            });
                            
                            let connected = false;
                            
                            socket.on('connect', () => {
                                connected = true;
                                console.log('✅ Connected successfully!', socket.id);
                                resolve({ 
                                    success: true, 
                                    url: wsUrl,
                                    socketId: socket.id,
                                    transport: socket.io.engine.transport.name
                                });
                                socket.disconnect();
                            });
                            
                            socket.on('connect_error', (error) => {
                                console.log('❌ Connection error:', error.message);
                                resolve({ 
                                    success: false, 
                                    url: wsUrl,
                                    error: error.message 
                                });
                            });
                            
                            setTimeout(() => {
                                if (!connected) {
                                    console.log('⏰ Connection timeout');
                                    resolve({ 
                                        success: false, 
                                        url: wsUrl,
                                        error: 'timeout' 
                                    });
                                    socket.disconnect();
                                }
                            }, 10000);
                            
                        } catch (error) {
                            resolve({ 
                                success: false, 
                                error: error.message 
                            });
                        }
                    };
                    script.onerror = () => {
                        resolve({ 
                            success: false, 
                            error: 'Failed to load Socket.IO' 
                        });
                    };
                    document.head.appendChild(script);
                } catch (error) {
                    resolve({ 
                        success: false, 
                        error: error.message 
                    });
                }
            });
        });
        
        console.log('\n🧪 WebSocket Test Results:');
        console.log(`  Target URL: ${connectionTest.url || 'unknown'}`);
        console.log(`  Success: ${connectionTest.success ? '✅' : '❌'}`);
        if (connectionTest.success) {
            console.log(`  Socket ID: ${connectionTest.socketId}`);
            console.log(`  Transport: ${connectionTest.transport}`);
        } else {
            console.log(`  Error: ${connectionTest.error}`);
        }
        
        if (!envCheck.websocketUrl || envCheck.websocketUrl === 'undefined') {
            console.log('\n🚨 ISSUE FOUND: WebSocket URL is not set!');
            console.log('The frontend is falling back to localhost:3001');
            console.log('\n💡 SOLUTION:');
            console.log('1. Set VITE_WEBSOCKET_URL in Vercel environment variables');
            console.log('2. Redeploy the frontend');
        } else if (envCheck.websocketUrl !== 'wss://orderoverview-dkro.onrender.com') {
            console.log('\n🚨 ISSUE FOUND: Wrong WebSocket URL!');
            console.log(`Current: ${envCheck.websocketUrl}`);
            console.log('Expected: wss://orderoverview-dkro.onrender.com');
        } else {
            console.log('\n✅ Environment variables look correct');
            console.log('The issue might be with CORS or the backend');
        }
        
        // Keep browser open for inspection
        console.log('\n🔍 Browser will stay open for manual inspection...');
        console.log('Check the Network tab for WebSocket connection attempts');
        console.log('Press Ctrl+C to close when done.');
        
        await new Promise(() => {}); // Keep alive
        
    } catch (error) {
        console.error('❌ Test Error:', error);
    } finally {
        // Don't close browser for manual inspection
        // await browser.close();
    }
}

checkVercelEnvironment().catch(console.error);

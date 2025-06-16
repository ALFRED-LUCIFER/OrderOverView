const puppeteer = require('puppeteer');

async function testActualFrontendConnection() {
    console.log('🔍 Testing Actual Frontend WebSocket Connection...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true 
    });
    
    try {
        const page = await browser.newPage();
        
        // Capture all console logs
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            logs.push(text);
            console.log(`[BROWSER] ${text}`);
        });
        
        // Capture network requests
        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            if (url.includes('socket.io') || url.includes('websocket') || url.includes('3001') || url.includes('orderoverview')) {
                console.log(`🌐 Network Request: ${request.method()} ${url}`);
            }
            request.continue();
        });
        
        page.on('response', response => {
            const url = response.url();
            if (url.includes('socket.io') || url.includes('websocket') || url.includes('3001') || url.includes('orderoverview')) {
                console.log(`📡 Network Response: ${response.status()} ${url}`);
            }
        });
        
        // Navigate to the Vercel site
        console.log('🌐 Loading Vercel site...');
        await page.goto('https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app', {
            waitUntil: 'networkidle0'
        });
        
        await page.waitForTimeout(3000);
        
        // Check environment variables in the browser
        const envVars = await page.evaluate(() => {
            try {
                return {
                    apiUrl: import.meta.env.VITE_API_URL,
                    websocketUrl: import.meta.env.VITE_WEBSOCKET_URL,
                    voiceEnabled: import.meta.env.VITE_ENABLE_VOICE,
                    mode: import.meta.env.MODE,
                    prod: import.meta.env.PROD
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log('\n📊 Environment Variables in Browser:');
        console.log(`  API URL: ${envVars.apiUrl || 'NOT SET'}`);
        console.log(`  WebSocket URL: ${envVars.websocketUrl || 'NOT SET'}`);
        console.log(`  Voice Enabled: ${envVars.voiceEnabled || 'NOT SET'}`);
        console.log(`  Mode: ${envVars.mode || 'NOT SET'}`);
        console.log(`  Production: ${envVars.prod || 'NOT SET'}`);
        
        if (envVars.error) {
            console.log(`  Error: ${envVars.error}`);
        }
        
        // Try to trigger a WebSocket connection and see what URL it uses
        console.log('\n🔌 Testing WebSocket connection in browser...');
        
        const connectionResult = await page.evaluate(() => {
            return new Promise((resolve) => {
                try {
                    // Simulate what the VoiceInterface component does
                    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 
                                  (window.location.hostname.includes('vercel.app') ? 'wss://orderoverview-dkro.onrender.com' : 'ws://localhost:3001');
                    
                    console.log('🔗 VoiceInterface would connect to:', wsUrl);
                    
                    // Load Socket.IO and test connection
                    const script = document.createElement('script');
                    script.src = 'https://cdn.socket.io/4.7.0/socket.io.min.js';
                    script.onload = () => {
                        try {
                            console.log('📦 Socket.IO loaded, testing connection...');
                            const socket = io(wsUrl, {
                                timeout: 10000,
                                transports: ['websocket', 'polling']
                            });
                            
                            let connected = false;
                            
                            socket.on('connect', () => {
                                connected = true;
                                console.log('✅ Test connection successful!');
                                resolve({
                                    success: true,
                                    url: wsUrl,
                                    socketId: socket.id,
                                    transport: socket.io.engine.transport.name
                                });
                                socket.disconnect();
                            });
                            
                            socket.on('connect_error', (error) => {
                                console.log('❌ Test connection failed:', error.message);
                                resolve({
                                    success: false,
                                    url: wsUrl,
                                    error: error.message,
                                    type: error.type
                                });
                            });
                            
                            setTimeout(() => {
                                if (!connected) {
                                    console.log('⏰ Test connection timeout');
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
        
        console.log('\n🧪 Browser Connection Test Results:');
        console.log(`  Target URL: ${connectionResult.url || 'unknown'}`);
        console.log(`  Success: ${connectionResult.success ? '✅' : '❌'}`);
        if (connectionResult.success) {
            console.log(`  Socket ID: ${connectionResult.socketId}`);
            console.log(`  Transport: ${connectionResult.transport}`);
        } else {
            console.log(`  Error: ${connectionResult.error}`);
            if (connectionResult.type) {
                console.log(`  Error Type: ${connectionResult.type}`);
            }
        }
        
        // Wait a bit more to see if there are any other connection attempts
        console.log('\n⏳ Waiting for any additional connection attempts...');
        await page.waitForTimeout(10000);
        
        console.log('\n📋 Summary of all logs:');
        logs.forEach((log, i) => {
            if (log.includes('WebSocket') || log.includes('socket') || log.includes('LISA') || log.includes('3001') || log.includes('orderoverview')) {
                console.log(`  ${i + 1}. ${log}`);
            }
        });
        
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser will stay open for manual inspection...');
        console.log('Check the Network tab and Console for WebSocket connection attempts');
        console.log('Press Ctrl+C to close when done.');
        
        await new Promise(() => {}); // Keep alive
        
    } catch (error) {
        console.error('❌ Test Error:', error);
    } finally {
        // Don't close browser automatically
        // await browser.close();
    }
}

testActualFrontendConnection().catch(console.error);

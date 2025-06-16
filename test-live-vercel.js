const puppeteer = require('puppeteer');

async function testLiveVercelSite() {
    console.log('🚀 Testing Live Vercel Site WebSocket Connection...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    try {
        const page = await browser.newPage();
        
        // Capture console logs and errors
        const logs = [];
        const errors = [];
        
        page.on('console', msg => {
            const text = msg.text();
            logs.push(`[${msg.type()}] ${text}`);
            console.log(`📝 Console: ${text}`);
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
            console.log(`❌ Page Error: ${error.message}`);
        });
        
        // Navigate to the Vercel site
        console.log('🌐 Navigating to Vercel site...');
        await page.goto('https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app', {
            waitUntil: 'networkidle0'
        });
        
        // Wait for page to load and check for WebSocket connections
        await page.waitForTimeout(5000);
        
        // Check network requests
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        
        // Look for WebSocket connections in the page
        const websocketCode = `
            // Check if Socket.IO is available
            if (typeof io !== 'undefined') {
                console.log('✅ Socket.IO library found');
                
                // Try to connect
                const socket = io('wss://orderoverview-dkro.onrender.com', {
                    transports: ['websocket', 'polling']
                });
                
                socket.on('connect', () => {
                    console.log('✅ WebSocket Connected:', socket.id);
                    console.log('✅ Transport:', socket.io.engine.transport.name);
                });
                
                socket.on('connect_error', (error) => {
                    console.log('❌ WebSocket Connection Error:', error);
                });
                
                socket.on('disconnect', (reason) => {
                    console.log('🔌 WebSocket Disconnected:', reason);
                });
                
                // Test LISA specifically
                socket.emit('join-voice-session', { agentId: 'LISA' });
                
                socket.on('voice-session-ready', (data) => {
                    console.log('✅ LISA Voice Session Ready:', data);
                });
                
                return 'WebSocket test initiated';
            } else {
                console.log('❌ Socket.IO library not found');
                return 'Socket.IO not available';
            }
        `;
        
        console.log('\n🔧 Injecting WebSocket test code...');
        const result = await page.evaluate(websocketCode);
        console.log(`📊 Test Result: ${result}`);
        
        // Wait for WebSocket events
        await page.waitForTimeout(10000);
        
        console.log('\n📋 Summary:');
        console.log(`📝 Total Console Messages: ${logs.length}`);
        console.log(`❌ Total Errors: ${errors.length}`);
        
        if (errors.length > 0) {
            console.log('\n🚨 Errors Found:');
            errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error}`);
            });
        }
        
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser will stay open for manual inspection...');
        console.log('Press Ctrl+C to close when done.');
        
        // Keep the process alive
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Test Error:', error);
    } finally {
        // Don't close browser automatically for manual inspection
        // await browser.close();
    }
}

testLiveVercelSite().catch(console.error);

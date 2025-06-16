#!/usr/bin/env node

// Comprehensive inspection of the live Vercel frontend
const puppeteer = require('puppeteer');

console.log('🔍 Inspecting Live Vercel Frontend for Issues...\n');

async function inspectVercelSite() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for CI
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1200, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Collect all console messages
    const consoleMessages = [];
    const networkErrors = [];
    const jsErrors = [];
    
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text, timestamp: new Date().toISOString() });
      
      // Log important messages immediately
      if (text.includes('WebSocket') || text.includes('socket') || text.includes('LISA') || text.includes('Error') || text.includes('Failed')) {
        console.log(`[${type.toUpperCase()}] ${text}`);
      }
    });
    
    // Capture JavaScript errors
    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.log(`[JS ERROR] ${error.message}`);
    });
    
    // Monitor network requests
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
        console.log(`[NETWORK ERROR] ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('📱 Loading Vercel frontend...');
    
    // Navigate to the site
    await page.goto('https://order-over-view-frontend.vercel.app', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Page loaded successfully\n');
    
    // Check for basic React app
    console.log('🔍 Checking React app initialization...');
    const reactRoot = await page.$('#root');
    if (reactRoot) {
      console.log('✅ React root element found');
    } else {
      console.log('❌ React root element not found');
    }
    
    // Check for Material-UI components
    console.log('🔍 Checking for Material-UI components...');
    const muiElements = await page.$$('[class*="Mui"], [class*="MuiBox"], [class*="MuiContainer"]');
    if (muiElements.length > 0) {
      console.log(`✅ Found ${muiElements.length} Material-UI components`);
    } else {
      console.log('❌ No Material-UI components found');
    }
    
    // Check for voice interface
    console.log('🔍 Checking for LISA voice interface...');
    await page.waitForTimeout(3000); // Wait for components to load
    
    const voiceButton = await page.$('button:contains("LISA"), [aria-label*="voice"], [data-testid*="voice"]');
    const voiceInterface = await page.$('.voice-interface, [class*="voice"], [class*="Voice"]');
    
    if (voiceButton || voiceInterface) {
      console.log('✅ Voice interface elements found');
    } else {
      console.log('⚠️  Voice interface not immediately visible');
    }
    
    // Check environment variables in window object
    console.log('🔍 Checking environment variables...');
    const envVars = await page.evaluate(() => {
      return {
        apiUrl: import.meta?.env?.VITE_API_URL || 'Not found',
        websocketUrl: import.meta?.env?.VITE_WEBSOCKET_URL || 'Not found',
        voiceEnabled: import.meta?.env?.VITE_ENABLE_VOICE || 'Not found'
      };
    });
    
    console.log('Environment Variables:');
    console.log(`  API URL: ${envVars.apiUrl}`);
    console.log(`  WebSocket URL: ${envVars.websocketUrl}`);
    console.log(`  Voice Enabled: ${envVars.voiceEnabled}`);
    
    // Test WebSocket connection from browser
    console.log('\n🔌 Testing WebSocket connection from browser...');
    const websocketTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          const script = document.createElement('script');
          script.src = 'https://cdn.socket.io/4.7.0/socket.io.min.js';
          script.onload = () => {
            try {
              const socket = io('wss://orderoverview-dkro.onrender.com', {
                timeout: 5000,
                transports: ['websocket', 'polling']
              });
              
              let connected = false;
              
              socket.on('connect', () => {
                connected = true;
                resolve({ success: true, message: 'WebSocket connected', socketId: socket.id });
                socket.disconnect();
              });
              
              socket.on('connect_error', (error) => {
                resolve({ success: false, message: `Connection error: ${error.message}` });
              });
              
              setTimeout(() => {
                if (!connected) {
                  resolve({ success: false, message: 'Connection timeout' });
                  socket.disconnect();
                }
              }, 5000);
              
            } catch (error) {
              resolve({ success: false, message: `Socket.IO error: ${error.message}` });
            }
          };
          script.onerror = () => {
            resolve({ success: false, message: 'Failed to load Socket.IO library' });
          };
          document.head.appendChild(script);
        } catch (error) {
          resolve({ success: false, message: `Script error: ${error.message}` });
        }
      });
    });
    
    if (websocketTest.success) {
      console.log(`✅ WebSocket test: ${websocketTest.message}`);
      console.log(`   Socket ID: ${websocketTest.socketId || 'N/A'}`);
    } else {
      console.log(`❌ WebSocket test: ${websocketTest.message}`);
    }
    
    // Check for specific error patterns
    console.log('\n🔍 Analyzing collected errors...');
    
    const websocketErrors = consoleMessages.filter(msg => 
      msg.text.includes('WebSocket') || msg.text.includes('socket.io') || msg.text.includes('ERR_CONNECTION')
    );
    
    const reduceErrors = consoleMessages.filter(msg => 
      msg.text.includes('reduce is not a function')
    );
    
    const apiErrors = consoleMessages.filter(msg => 
      msg.text.includes('api') && msg.type === 'error'
    );
    
    if (websocketErrors.length > 0) {
      console.log(`❌ Found ${websocketErrors.length} WebSocket-related errors:`);
      websocketErrors.forEach(err => console.log(`   - ${err.text}`));
    } else {
      console.log('✅ No WebSocket errors found');
    }
    
    if (reduceErrors.length > 0) {
      console.log(`❌ Found ${reduceErrors.length} reduce function errors:`);
      reduceErrors.forEach(err => console.log(`   - ${err.text}`));
    } else {
      console.log('✅ No reduce function errors found');
    }
    
    if (apiErrors.length > 0) {
      console.log(`❌ Found ${apiErrors.length} API-related errors:`);
      apiErrors.forEach(err => console.log(`   - ${err.text}`));
    } else {
      console.log('✅ No API errors found');
    }
    
    if (jsErrors.length > 0) {
      console.log(`❌ Found ${jsErrors.length} JavaScript errors:`);
      jsErrors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log('✅ No JavaScript errors found');
    }
    
    if (networkErrors.length > 0) {
      console.log(`❌ Found ${networkErrors.length} network errors:`);
      networkErrors.forEach(err => console.log(`   - ${err.status} ${err.url}`));
    } else {
      console.log('✅ No network errors found');
    }
    
    // Take a screenshot for manual inspection
    await page.screenshot({ path: 'vercel-site-inspection.png', fullPage: true });
    console.log('\n📸 Screenshot saved as vercel-site-inspection.png');
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser kept open for manual inspection...');
    console.log('Press Ctrl+C to close when done inspecting');
    
    // Wait indefinitely until user closes
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Inspection failed:', error.message);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  inspectVercelSite().catch(console.error);
}

module.exports = { inspectVercelSite };

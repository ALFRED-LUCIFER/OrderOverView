#!/usr/bin/env node

// Debug script to test frontend WebSocket connection issues
const puppeteer = require('puppeteer');

console.log('🔍 Testing Vercel Frontend WebSocket Connection...\n');

async function testFrontendWebSocket() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for CI
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (text.includes('WebSocket') || text.includes('socket') || text.includes('LISA')) {
        console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
      }
      
      if (type === 'error') {
        console.log(`[BROWSER ERROR] ${text}`);
      }
    });
    
    // Navigate to your Vercel frontend
    console.log('📱 Loading Vercel frontend...');
    await page.goto('https://order-over-view-frontend.vercel.app', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Page loaded successfully');
    
    // Check for WebSocket connection
    console.log('🔌 Checking WebSocket connection...');
    
    // Wait for potential WebSocket connections
    await page.waitForTimeout(5000);
    
    // Check if LISA voice interface is present
    const voiceInterface = await page.$('[data-testid="voice-interface"], .voice-interface, button:contains("LISA")');
    if (voiceInterface) {
      console.log('✅ Voice interface found');
      
      // Try to interact with voice interface
      await voiceInterface.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️  Voice interface not found');
    }
    
    // Check network tab for failed requests
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    
    // Monitor network events
    client.on('Network.responseReceived', (params) => {
      const response = params.response;
      if (response.status >= 400) {
        console.log(`❌ Failed request: ${response.status} ${response.url}`);
      }
    });
    
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  testFrontendWebSocket().catch(console.error);
}

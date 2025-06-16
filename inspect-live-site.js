// Live site inspection script for LISA voice interface
console.log('🔍 LISA VOICE INTERFACE - LIVE SITE INSPECTION');
console.log('Site URL:', window.location.href);
console.log('User Agent:', navigator.userAgent);

// Check environment variables in the built app
console.log('\n📋 ENVIRONMENT VARIABLES CHECK:');
console.log('VITE_API_URL:', import.meta.env?.VITE_API_URL || 'Not found in import.meta.env');
console.log('VITE_WEBSOCKET_URL:', import.meta.env?.VITE_WEBSOCKET_URL || 'Not found in import.meta.env');
console.log('VITE_ENABLE_VOICE:', import.meta.env?.VITE_ENABLE_VOICE || 'Not found in import.meta.env');

// Alternative check for environment variables
if (window.process?.env) {
    console.log('process.env.VITE_API_URL:', window.process.env.VITE_API_URL);
    console.log('process.env.VITE_WEBSOCKET_URL:', window.process.env.VITE_WEBSOCKET_URL);
    console.log('process.env.VITE_ENABLE_VOICE:', window.process.env.VITE_ENABLE_VOICE);
}

// Check for LISA voice components
console.log('\n🎤 LISA VOICE COMPONENTS CHECK:');

// Look for voice-related elements
const voiceButton = document.querySelector('[data-testid="voice-toggle"]') || 
                   document.querySelector('.voice-button') ||
                   document.querySelector('button[aria-label*="voice"]') ||
                   document.querySelector('button[title*="voice"]');
console.log('Voice button found:', !!voiceButton);
if (voiceButton) {
    console.log('Voice button element:', voiceButton);
    console.log('Voice button visible:', voiceButton.offsetParent !== null);
}

// Check for WebSocket connection attempts
console.log('\n🔌 WEBSOCKET CONNECTION CHECK:');
let originalWebSocket = window.WebSocket;
let websocketAttempts = [];

window.WebSocket = function(url, protocols) {
    console.log('WebSocket connection attempt:', url);
    websocketAttempts.push({ url, timestamp: new Date().toISOString() });
    
    const ws = new originalWebSocket(url, protocols);
    
    ws.addEventListener('open', (event) => {
        console.log('✅ WebSocket connected:', url);
    });
    
    ws.addEventListener('error', (event) => {
        console.error('❌ WebSocket error:', url, event);
    });
    
    ws.addEventListener('close', (event) => {
        console.log('🔌 WebSocket closed:', url, 'Code:', event.code, 'Reason:', event.reason);
    });
    
    return ws;
};

// Check for console errors
console.log('\n❌ CONSOLE ERRORS CHECK:');
const originalError = console.error;
const errors = [];

console.error = function(...args) {
    errors.push({
        timestamp: new Date().toISOString(),
        message: args.join(' '),
        stack: new Error().stack
    });
    originalError.apply(console, args);
};

// Wait for page to load and check for React components
setTimeout(() => {
    console.log('\n⚛️ REACT COMPONENTS CHECK:');
    
    // Check if React is loaded
    console.log('React available:', typeof window.React !== 'undefined');
    
    // Look for React root
    const reactRoot = document.querySelector('#root') || document.querySelector('[data-reactroot]');
    console.log('React root found:', !!reactRoot);
    if (reactRoot) {
        console.log('React root children count:', reactRoot.children.length);
    }
    
    // Check for common app components
    const navbar = document.querySelector('nav') || document.querySelector('.navbar');
    const dashboard = document.querySelector('.dashboard') || document.querySelector('[data-page="dashboard"]');
    console.log('Navigation found:', !!navbar);
    console.log('Dashboard found:', !!dashboard);
    
    // Final status report
    setTimeout(() => {
        console.log('\n📊 FINAL STATUS REPORT:');
        console.log('WebSocket attempts:', websocketAttempts.length);
        websocketAttempts.forEach((attempt, index) => {
            console.log(`  ${index + 1}. ${attempt.url} at ${attempt.timestamp}`);
        });
        console.log('Errors captured:', errors.length);
        errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.timestamp}: ${error.message}`);
        });
        
        // Try to trigger LISA if voice button exists
        if (voiceButton && voiceButton.offsetParent !== null) {
            console.log('\n🚀 ATTEMPTING TO TRIGGER LISA...');
            voiceButton.click();
        }
    }, 3000);
}, 2000);

console.log('🔍 Inspection script loaded. Waiting for page to fully load...');

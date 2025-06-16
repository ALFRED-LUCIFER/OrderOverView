#!/usr/bin/env node

// Test the exact same connection the frontend VoiceInterface is making
const io = require('socket.io-client');

console.log('🔍 Testing Frontend VoiceInterface Connection Simulation...\n');

// Simulate the exact logic from VoiceInterface.tsx
function getWebSocketUrl() {
  // Simulate import.meta.env.VITE_WEBSOCKET_URL being undefined (which it was)
  const VITE_WEBSOCKET_URL = undefined; // This is what was happening
  
  let wsUrl;
  
  // This is the exact logic from VoiceInterface
  if (false) { // window.location.hostname.includes('vercel.app') - false in local
    wsUrl = 'wss://orderoverview-dkro.onrender.com';
    console.log('🌐 Detected Vercel deployment, using production backend');
  } else if (VITE_WEBSOCKET_URL) {
    wsUrl = VITE_WEBSOCKET_URL;
    console.log('🔧 Using environment variable VITE_WEBSOCKET_URL');
  } else {
    wsUrl = 'ws://localhost:3001';
    console.log('🏠 Using local development URL');
  }
  
  return wsUrl;
}

const wsUrl = getWebSocketUrl();
console.log('🔌 Connecting to WebSocket:', wsUrl);

// Use the exact same configuration as the updated VoiceInterface
const socket = io(wsUrl, {
  transports: ['websocket', 'polling'],
  timeout: 20000,
  forceNew: true,
  autoConnect: true,
});

let connected = false;

socket.on('connect', () => {
  connected = true;
  console.log('✅ WebSocket Connected Successfully!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}`);
});

socket.on('connected', (data) => {
  console.log('✅ LISA Backend Connected:');
  console.log(`   Session ID: ${data.sessionId}`);
  console.log(`   Agent: ${data.agent}`);
  console.log(`   Message: ${data.message}`);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection Error:');
  console.log(`   Type: ${error.type || 'undefined'}`);
  console.log(`   Message: ${error.message}`);
  console.log(`   Description: ${error.description || 'undefined'}`);
  
  if (error.message?.includes('xhr poll error')) {
    console.log('🔧 XHR polling failed - this is the same error the frontend sees');
  }
});

socket.on('disconnect', (reason) => {
  console.log(`🔌 Disconnected: ${reason}`);
});

// Test timeout
setTimeout(() => {
  if (connected) {
    console.log('\n🎉 Connection test PASSED!');
    console.log('The WebSocket connection works from Node.js.');
    console.log('The issue might be browser-specific or environment variable related.');
  } else {
    console.log('\n❌ Connection test FAILED!');
    console.log('The same error occurs in Node.js, indicating a server-side issue.');
  }
  
  socket.disconnect();
  process.exit(connected ? 0 : 1);
}, 15000);

console.log('Testing connection... (timeout in 15 seconds)');

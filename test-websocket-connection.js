#!/usr/bin/env node

// Quick WebSocket connectivity test for your Render backend
const io = require('socket.io-client');

console.log('🔍 Testing WebSocket Connection to Render Backend...\n');

const WEBSOCKET_URL = 'wss://orderoverview-dkro.onrender.com';
console.log(`Target: ${WEBSOCKET_URL}\n`);

const socket = io(WEBSOCKET_URL, {
  timeout: 10000,
  transports: ['websocket', 'polling']
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
  console.log(`   Type: ${error.type}`);
  console.log(`   Message: ${error.message}`);
  console.log(`   Description: ${error.description || 'N/A'}`);
});

socket.on('disconnect', (reason) => {
  console.log(`🔌 Disconnected: ${reason}`);
});

// Test timeout
setTimeout(() => {
  if (connected) {
    console.log('\n🎉 WebSocket connection test PASSED!');
    console.log('Your frontend should be able to connect to LISA.');
  } else {
    console.log('\n❌ WebSocket connection test FAILED!');
    console.log('Check the errors above and your backend status.');
  }
  
  socket.disconnect();
  process.exit(connected ? 0 : 1);
}, 5000);

console.log('Connecting... (timeout in 5 seconds)');

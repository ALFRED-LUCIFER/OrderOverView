#!/usr/bin/env node

// Test local WebSocket connection
const io = require('socket.io-client');

console.log('🔍 Testing Local WebSocket Connection...\n');

const socket = io('ws://localhost:3001', {
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
    console.log('\n🎉 Local WebSocket connection test PASSED!');
    console.log('Your backend is running and WebSocket is working.');
  } else {
    console.log('\n❌ Local WebSocket connection test FAILED!');
    console.log('Check your backend status and WebSocket configuration.');
  }
  
  socket.disconnect();
  process.exit(connected ? 0 : 1);
}, 10000);

console.log('Connecting to ws://localhost:3001... (timeout in 10 seconds)');

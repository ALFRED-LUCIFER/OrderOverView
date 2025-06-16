#!/usr/bin/env node

// Test script to verify LISA voice service database connection
// This tests the HTTP status notifications and conversation flow

const io = require('socket.io-client');

console.log('🎤 Testing LISA Voice Service Database Connection...\n');

const socket = io('ws://localhost:3001');

socket.on('connect', () => {
  console.log('✅ WebSocket Connected to LISA');
});

socket.on('connected', (data) => {
  console.log('✅ LISA Agent Connected:', data);
  console.log(`Session ID: ${data.sessionId}`);
  console.log(`Agent: ${data.agent}`);
  
  // Start testing sequence
  setTimeout(() => testVoiceCommands(), 1000);
});

socket.on('voice-response', (data) => {
  console.log('\n📢 LISA Response:');
  console.log(`Text: "${data.response}"`);
  console.log(`Action: ${data.action || 'none'}`);
  console.log(`Should Speak: ${data.shouldSpeak}`);
  console.log(`Confidence: ${data.confidence || 'N/A'}`);
  
  if (data.data) {
    console.log('📊 Response Data:');
    console.log(`Status Code: ${data.data.statusCode || 'N/A'}`);
    console.log(`Message: ${data.data.message || 'N/A'}`);
    
    if (data.data.orders) {
      console.log(`Orders Found: ${data.data.orders.length}`);
      console.log(`Total Cost: $${data.data.totalCost || 0}`);
    }
    
    if (data.data.id) {
      console.log(`Created ID: ${data.data.id}`);
    }
  }
  
  console.log('---');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection Error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

let testIndex = 0;
const testCommands = [
  "Hello LISA, can you help me search for orders?",
  "Show me all orders in the database",
  "Create a new order for 5 tempered glass panels",
  "Thanks, that's all. Stop conversation."
];

function testVoiceCommands() {
  if (testIndex < testCommands.length) {
    const command = testCommands[testIndex];
    console.log(`\n🗣️  User: "${command}"`);
    
    socket.emit('voice-command', {
      transcript: command,
      isEndOfSpeech: true,
      interimResults: false,
      useNaturalConversation: true
    });
    
    testIndex++;
    
    // Wait 3 seconds before next command
    setTimeout(() => testVoiceCommands(), 3000);
  } else {
    console.log('\n✅ Test completed! Closing connection...');
    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 2000);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  socket.disconnect();
  process.exit(0);
});

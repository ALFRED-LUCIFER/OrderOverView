#!/usr/bin/env node

// LISA Voice Interface Test - Production Environment
const io = require('socket.io-client');

console.log('🎤 Testing LISA Voice Interface on Production...\n');

const WEBSOCKET_URL = 'wss://orderoverview-dkro.onrender.com';
console.log(`Backend: ${WEBSOCKET_URL}`);
console.log(`Frontend: https://order-over-view-frontend.vercel.app\n`);

const socket = io(WEBSOCKET_URL, {
  timeout: 10000,
  transports: ['websocket', 'polling']
});

let connected = false;
let lisaReady = false;

socket.on('connect', () => {
  connected = true;
  console.log('✅ WebSocket Connected Successfully!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}`);
});

socket.on('connected', (data) => {
  lisaReady = true;
  console.log('✅ LISA Voice Agent Ready:');
  console.log(`   Session ID: ${data.sessionId}`);
  console.log(`   Agent: ${data.agent}`);
  console.log(`   Welcome: ${data.message}`);
  
  // Test LISA with a voice command
  setTimeout(() => {
    console.log('\n🗣️  Testing LISA with voice command...');
    testLisaVoiceCommand();
  }, 1000);
});

socket.on('voice-response', (data) => {
  console.log('🎯 LISA Response Received:');
  console.log(`   Text: "${data.response}"`);
  console.log(`   Action: ${data.action || 'none'}`);
  console.log(`   Should Speak: ${data.shouldSpeak}`);
  console.log(`   Confidence: ${data.confidence || 'N/A'}`);
  
  if (data.data) {
    console.log(`   Data: ${JSON.stringify(data.data, null, 2)}`);
  }
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

function testLisaVoiceCommand() {
  const testCommands = [
    "Hello LISA, are you working?",
    "Show me all orders in the system",
    "How many customers do we have?",
    "Thanks LISA, that's all for now"
  ];
  
  let commandIndex = 0;
  
  function sendNextCommand() {
    if (commandIndex < testCommands.length) {
      const command = testCommands[commandIndex];
      console.log(`\n💬 User: "${command}"`);
      
      socket.emit('voice-command', {
        transcript: command,
        isEndOfSpeech: true,
        interimResults: false,
        useNaturalConversation: true
      });
      
      commandIndex++;
      
      // Wait 3 seconds before next command
      setTimeout(sendNextCommand, 3000);
    } else {
      console.log('\n✅ LISA Test Completed!');
      setTimeout(() => {
        socket.disconnect();
        process.exit(0);
      }, 2000);
    }
  }
  
  sendNextCommand();
}

// Test timeout
setTimeout(() => {
  if (connected && lisaReady) {
    console.log('\n🎉 LISA Voice Interface test PASSED!');
    console.log('LISA is ready and responsive on production.');
  } else if (connected && !lisaReady) {
    console.log('\n⚠️  WebSocket connected but LISA not ready');
    console.log('Check LISA voice service initialization.');
  } else {
    console.log('\n❌ LISA Voice Interface test FAILED!');
    console.log('WebSocket connection issues detected.');
  }
  
  if (!lisaReady) {
    socket.disconnect();
    process.exit(1);
  }
}, 15000);

console.log('Connecting to LISA... (timeout in 15 seconds)');

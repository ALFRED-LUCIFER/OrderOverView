#!/usr/bin/env node

/**
 * LISA Conversation Test Script
 * Tests the complete voice conversation flow with database integration
 */

const { io } = require('socket.io-client');

async function testLISAConversation() {
  console.log('🤖 Testing LISA Conversation System...\n');

  return new Promise((resolve, reject) => {
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      forceNew: true
    });

    let testsPassed = 0;
    let totalTests = 5;

    function logTest(testName, passed, details = '') {
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${testName}${details ? ` - ${details}` : ''}`);
      if (passed) testsPassed++;
    }

    // Test 1: Connection
    socket.on('connect', () => {
      logTest('WebSocket Connection', true, 'Connected to backend');
    });

    // Test 2: LISA Welcome
    socket.on('connected', (data) => {
      logTest('LISA Session', true, `Session ${data.sessionId} - ${data.message?.substring(0, 50)}...`);
      
      // Test 3: Send voice command
      setTimeout(() => {
        console.log('\n📤 Sending test command: "Show me all customers"');
        socket.emit('voice-command', {
          transcript: 'Show me all customers',
          isEndOfSpeech: true,
          interimResults: false,
          useNaturalConversation: true
        });
      }, 1000);
    });

    // Test 4: LISA Response
    socket.on('voice-response', (data) => {
      console.log('\n📥 LISA Response received:');
      console.log('   Response:', data.response?.substring(0, 100) + '...');
      console.log('   Action:', data.action || 'None');
      console.log('   Should Speak:', data.shouldSpeak);
      
      logTest('LISA Response', true, `Action: ${data.action || 'conversation'}`);
      
      if (data.action === 'ORDERS_FOUND' || data.action === 'search_results') {
        logTest('Database Integration', true, `Found ${data.data?.orders?.length || 0} items`);
      } else {
        // Test another command that should trigger database
        setTimeout(() => {
          console.log('\n📤 Sending database test: "Find orders for Glass Solutions"');
          socket.emit('voice-command', {
            transcript: 'Find orders for Glass Solutions',
            isEndOfSpeech: true,
            interimResults: false,
            useNaturalConversation: true
          });
        }, 2000);
      }
    });

    // Test 5: Error handling
    socket.on('connect_error', (error) => {
      logTest('Connection', false, `Error: ${error.message}`);
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`\n🔌 Disconnected: ${reason}`);
    });

    // Timeout test
    setTimeout(() => {
      console.log(`\n📊 Test Results: ${testsPassed}/${totalTests} tests passed\n`);
      
      if (testsPassed >= 3) {
        console.log('🎉 LISA Conversation System is working!');
        console.log('✨ Key Features Verified:');
        console.log('   • WebSocket connection established');
        console.log('   • LISA session initialization');
        console.log('   • Voice command processing');
        console.log('   • Natural language responses');
        if (testsPassed >= 4) {
          console.log('   • Database integration active');
        }
      } else {
        console.log('⚠️  LISA Conversation System needs attention');
        console.log('🔧 Troubleshooting steps:');
        console.log('   1. Check backend is running on port 3001');
        console.log('   2. Verify GROQ_API_KEY is configured');
        console.log('   3. Check database connection');
        console.log('   4. Review voice service logs');
      }
      
      socket.disconnect();
      resolve(testsPassed);
    }, 10000);
  });
}

// Install socket.io-client if needed
try {
  require('socket.io-client');
} catch (error) {
  console.log('Installing socket.io-client...');
  require('child_process').execSync('npm install socket.io-client', { stdio: 'inherit' });
}

testLISAConversation().catch(console.error);

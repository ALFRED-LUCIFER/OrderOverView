#!/usr/bin/env node

/**
 * LISA Connection Management Test
 * 
 * This script tests the improved connection management for LISA Voice Interface
 * to ensure that multiple connections are properly handled and duplicate 
 * connections are prevented.
 */

const { io } = require('socket.io-client');

console.log('🧪 LISA Connection Management Test Starting...\n');

// Test configuration
const BACKEND_URL = 'ws://localhost:3001'; // Change to production URL if needed
const TEST_DURATION = 30000; // 30 seconds
const CONNECTION_ATTEMPTS = 5; // Try to create 5 connections

let connections = [];
let connectionEvents = [];

function logEvent(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  connectionEvents.push(logMessage);
}

function createConnection(index) {
  return new Promise((resolve) => {
    logEvent(`🔌 Creating connection #${index}...`);
    
    const clientId = `test-lisa-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`;
    
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
      auth: {
        clientId: clientId,
        userAgent: `LISA-Test-Client-${index}`,
        timestamp: Date.now()
      }
    });

    socket.on('connect', () => {
      logEvent(`✅ Connection #${index} established (ID: ${socket.id})`);
      connections.push({ index, socket, clientId, connected: true });
      resolve(socket);
    });

    socket.on('connected', (data) => {
      logEvent(`🎉 LISA welcomed connection #${index}: ${data.agent} (Session: ${data.sessionId})`);
    });

    socket.on('connect_error', (error) => {
      logEvent(`❌ Connection #${index} failed: ${error.message}`);
      connections.push({ index, socket: null, clientId, connected: false, error: error.message });
      resolve(null);
    });

    socket.on('disconnect', (reason) => {
      logEvent(`🔌 Connection #${index} disconnected: ${reason}`);
      const conn = connections.find(c => c.index === index);
      if (conn) conn.connected = false;
    });

    socket.on('connection_replaced', (data) => {
      logEvent(`🔄 Connection #${index} was replaced: ${data.reason}`);
    });

    socket.on('force_disconnect', (data) => {
      logEvent(`⚠️ Connection #${index} was force disconnected: ${data.reason}`);
    });

    socket.on('connection_timeout', (data) => {
      logEvent(`⏰ Connection #${index} timed out: ${data.reason}`);
    });

    // Timeout fallback
    setTimeout(() => {
      if (!connections.find(c => c.index === index)) {
        logEvent(`⏰ Connection #${index} attempt timed out`);
        connections.push({ index, socket: null, clientId, connected: false, error: 'timeout' });
        resolve(null);
      }
    }, 10000);
  });
}

async function runConnectionTest() {
  logEvent('🚀 Starting connection test...');
  
  // Create multiple connections rapidly to test deduplication
  const connectionPromises = [];
  for (let i = 1; i <= CONNECTION_ATTEMPTS; i++) {
    connectionPromises.push(createConnection(i));
    // Small delay between connections
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  logEvent('⏳ Waiting for all connection attempts...');
  await Promise.all(connectionPromises);
  
  // Wait a bit for the backend to process
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  logEvent('\n📊 Connection Test Results:');
  const activeConnections = connections.filter(c => c.connected);
  const failedConnections = connections.filter(c => !c.connected);
  
  logEvent(`✅ Active connections: ${activeConnections.length}`);
  logEvent(`❌ Failed connections: ${failedConnections.length}`);
  
  activeConnections.forEach(conn => {
    logEvent(`   - Connection #${conn.index}: ${conn.socket?.id || 'unknown'} (clientId: ${conn.clientId})`);
  });
  
  if (failedConnections.length > 0) {
    logEvent('Failed connections:');
    failedConnections.forEach(conn => {
      logEvent(`   - Connection #${conn.index}: ${conn.error || 'unknown error'}`);
    });
  }
  
  // Test voice command on active connections
  if (activeConnections.length > 0) {
    logEvent('\n🗣️ Testing voice commands on active connections...');
    activeConnections.forEach((conn, index) => {
      if (conn.socket) {
        logEvent(`📤 Sending test command to connection #${conn.index}`);
        conn.socket.emit('voice-command', {
          transcript: `Hello LISA, this is test message ${index + 1} from connection ${conn.index}`,
          isEndOfSpeech: true,
          interimResults: false,
          useNaturalConversation: true
        });
      }
    });
  }
  
  // Wait for responses
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Clean up
  logEvent('\n🧹 Cleaning up connections...');
  connections.forEach(conn => {
    if (conn.socket && conn.connected) {
      conn.socket.disconnect();
      logEvent(`🔌 Disconnected connection #${conn.index}`);
    }
  });
  
  logEvent('\n✅ Connection management test completed!');
  
  // Summary
  logEvent('\n📋 Test Summary:');
  logEvent(`   Total connection attempts: ${CONNECTION_ATTEMPTS}`);
  logEvent(`   Successful connections: ${activeConnections.length}`);
  logEvent(`   Expected behavior: ${activeConnections.length <= 2 ? '✅ GOOD' : '⚠️ TOO MANY'} (should be ≤2 per IP)`);
  
  if (activeConnections.length > 2) {
    logEvent('   ⚠️ WARNING: More than 2 connections were allowed from the same IP!');
    logEvent('   This suggests the connection deduplication is not working properly.');
  } else {
    logEvent('   ✅ SUCCESS: Connection deduplication appears to be working correctly!');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  connections.forEach(conn => {
    if (conn.socket && conn.connected) {
      conn.socket.disconnect();
    }
  });
  process.exit(0);
});

// Start the test
runConnectionTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

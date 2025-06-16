#!/usr/bin/env node

// Debug WebSocket connection for specific Vercel deployment
const io = require('socket.io-client');

console.log('🔍 Testing WebSocket Connection for Specific Vercel URL...\n');

const WEBSOCKET_URL = 'wss://orderoverview-dkro.onrender.com';
const FRONTEND_URL = 'https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app';

console.log(`Backend WebSocket: ${WEBSOCKET_URL}`);
console.log(`Frontend URL: ${FRONTEND_URL}\n`);

// Test with different connection options
const connectionOptions = [
  {
    name: 'Standard Connection',
    options: {
      timeout: 10000,
      transports: ['websocket', 'polling']
    }
  },
  {
    name: 'Polling Only',
    options: {
      timeout: 10000,
      transports: ['polling']
    }
  },
  {
    name: 'WebSocket Only', 
    options: {
      timeout: 10000,
      transports: ['websocket']
    }
  },
  {
    name: 'With Headers',
    options: {
      timeout: 10000,
      transports: ['websocket', 'polling'],
      extraHeaders: {
        'Origin': FRONTEND_URL,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }
  }
];

async function testConnection(config) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${config.name}`);
    
    const socket = io(WEBSOCKET_URL, config.options);
    let connected = false;
    let lisaReady = false;

    const timeout = setTimeout(() => {
      if (!connected) {
        console.log(`❌ ${config.name}: Connection timeout`);
        socket.disconnect();
        resolve({ success: false, reason: 'timeout' });
      }
    }, 8000);

    socket.on('connect', () => {
      connected = true;
      console.log(`✅ ${config.name}: Connected (${socket.id})`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
    });

    socket.on('connected', (data) => {
      lisaReady = true;
      console.log(`✅ ${config.name}: LISA Ready`);
      console.log(`   Agent: ${data.agent}`);
      
      clearTimeout(timeout);
      socket.disconnect();
      resolve({ success: true, transport: socket.io.engine.transport.name });
    });

    socket.on('connect_error', (error) => {
      console.log(`❌ ${config.name}: Connection Error`);
      console.log(`   Type: ${error.type}`);
      console.log(`   Message: ${error.message}`);
      console.log(`   Description: ${error.description || 'N/A'}`);
      
      clearTimeout(timeout);
      socket.disconnect();
      resolve({ success: false, reason: error.message });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 ${config.name}: Disconnected (${reason})`);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting WebSocket diagnostics...\n');
  
  const results = [];
  
  for (const config of connectionOptions) {
    const result = await testConnection(config);
    results.push({ name: config.name, ...result });
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const detail = result.success ? `(${result.transport})` : `(${result.reason})`;
    console.log(`${status} ${result.name} ${detail}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Success Rate: ${successCount}/${results.length}`);
  
  if (successCount === 0) {
    console.log('\n🚨 ALL CONNECTIONS FAILED');
    console.log('This indicates a CORS or server configuration issue.');
    console.log('The backend needs to be updated and redeployed.');
  } else if (successCount < results.length) {
    console.log('\n⚠️ PARTIAL SUCCESS');
    console.log('Some connection methods work, others fail.');
    console.log('This suggests browser/transport-specific issues.');
  } else {
    console.log('\n🎉 ALL CONNECTIONS SUCCESSFUL');
    console.log('WebSocket should work fine from the frontend.');
  }
}

runAllTests().catch(console.error);

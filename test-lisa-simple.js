const io = require('socket.io-client');

console.log('🔍 LISA Simple Test - Expensive Orders Search\n');

const client = io('ws://localhost:3001', { autoConnect: true });

client.on('connect', () => {
  console.log('✅ Connected to LISA');
});

client.on('connected', (data) => {
  console.log('🎯 LISA initialized:', data.sessionId);
  
  // Test expensive orders search
  setTimeout(() => {
    console.log('\n🗣️ Query: "show me expensive orders"');
    client.emit('voice-command', {
      transcript: 'show me expensive orders',
      isEndOfSpeech: true,
      useNaturalConversation: true
    });
  }, 1000);
});

client.on('voice-response', (data) => {
  console.log('\n🤖 LISA Response:');
  console.log('   Text:', data.response || data.text);
  console.log('   Action:', data.action || 'none');
  console.log('   Has Data:', !!data.data);
  
  if (data.data?.orders) {
    console.log('   Order Count:', data.data.orders.length);
    console.log('   Total Cost:', data.data.totalCost);
    console.log('\n💰 First 3 orders:');
    data.data.orders.slice(0, 3).forEach((order, i) => {
      const price = order.totalPrice || order.cost || 0;
      console.log(`   ${i+1}. ${order.orderNumber} - $${price.toLocaleString()}`);
    });
  }
  
  setTimeout(() => {
    console.log('\n✅ Test complete');
    client.disconnect();
  }, 2000);
});

client.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

setTimeout(() => {
  console.log('⏰ Timeout');
  process.exit(0);
}, 10000);

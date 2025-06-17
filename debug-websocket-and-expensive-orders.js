const io = require('socket.io-client');

// Test WebSocket client creation and expensive orders search
async function testWebSocketAndExpensiveOrders() {
  console.log('🔍 DEBUGGING: WebSocket Clients & Top 10 Expensive Orders Test\n');
  
  const wsUrl = 'ws://localhost:3001';
  console.log(`🔌 Connecting to: ${wsUrl}\n`);
  
  // Track all clients created
  const clients = [];
  let clientCounter = 0;
  
  console.log('📊 PHASE 1: Testing WebSocket Client Creation Behavior\n');
  
  // Create initial client and track connection events
  const mainClient = io(wsUrl, {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true,
    autoConnect: true
  });
  
  clientCounter++;
  clients.push({ id: clientCounter, client: mainClient, purpose: 'Main Test Client' });
  
  console.log(`🚀 Client ${clientCounter} created: Main Test Client`);
  
  // Track connection events
  mainClient.on('connect', () => {
    console.log(`✅ Client ${clientCounter} connected with socket ID: ${mainClient.id}`);
  });
  
  mainClient.on('connected', (data) => {
    console.log(`🎯 Client ${clientCounter} LISA session initialized:`, data.sessionId);
  });
  
  mainClient.on('connect_error', (error) => {
    console.log(`❌ Client ${clientCounter} connection error:`, error.message);
  });
  
  mainClient.on('disconnect', (reason) => {
    console.log(`🔌 Client ${clientCounter} disconnected:`, reason);
  });
  
  // Wait for connection
  await new Promise(resolve => {
    mainClient.on('connected', resolve);
    setTimeout(resolve, 3000); // Fallback timeout
  });
  
  console.log('\n📋 PHASE 2: First, let\'s add sample expensive orders to database\n');
  
  // Add sample customers and expensive orders
  const sampleCustomers = [
    {
      id: 'cust-expensive-1',
      name: 'Luxury Towers Corp',
      email: 'orders@luxurytowers.com',
      phone: '+1-555-9001',
      country: 'USA',
      city: 'Manhattan',
      company: 'Luxury Towers Corporation'
    },
    {
      id: 'cust-expensive-2', 
      name: 'Pentagon Security Solutions',
      email: 'glass@pentagonsec.gov',
      phone: '+1-555-9002',
      country: 'USA',
      city: 'Washington DC',
      company: 'Pentagon Security Solutions Inc'
    },
    {
      id: 'cust-expensive-3',
      name: 'Royal Hotel Chain',
      email: 'procurement@royalhotels.com',
      phone: '+1-555-9003',
      country: 'USA',
      city: 'Las Vegas',
      company: 'Royal Hotel Chain LLC'
    }
  ];

  const expensiveOrders = [
    {
      orderNumber: 'EXP-9001',
      customerId: 'cust-expensive-1',
      glassType: 'BULLETPROOF',
      glassClass: 'SAFETY_GLASS',
      thickness: 30.0,
      width: 3000,
      height: 4000,
      quantity: 25,
      unitPrice: 1200.00,
      totalPrice: 30000.00,
      status: 'CONFIRMED',
      priority: 'URGENT',
      notes: 'Ultra-high security bulletproof glass for luxury skyscraper'
    },
    {
      orderNumber: 'EXP-9002',
      customerId: 'cust-expensive-2',
      glassType: 'BULLETPROOF',
      glassClass: 'FIRE_RATED',
      thickness: 35.0,
      width: 2500,
      height: 3500,
      quantity: 50,
      unitPrice: 850.00,
      totalPrice: 42500.00,
      status: 'IN_PRODUCTION',
      priority: 'URGENT',
      notes: 'Military-grade fire-rated bulletproof glass for government facility'
    },
    {
      orderNumber: 'EXP-9003',
      customerId: 'cust-expensive-3',
      glassType: 'LAMINATED',
      glassClass: 'TRIPLE_GLAZED',
      thickness: 25.0,
      width: 2000,
      height: 3000,
      quantity: 35,
      unitPrice: 650.00,
      totalPrice: 22750.00,
      status: 'PENDING',
      priority: 'HIGH',
      notes: 'Premium triple-glazed laminated glass for royal suite'
    },
    {
      orderNumber: 'EXP-9004',
      customerId: 'cust-expensive-1',
      glassType: 'INSULATED',
      glassClass: 'ACOUSTIC',
      thickness: 20.0,
      width: 1800,
      height: 2800,
      quantity: 60,
      unitPrice: 380.00,
      totalPrice: 22800.00,
      status: 'READY_FOR_DELIVERY',
      priority: 'MEDIUM',
      notes: 'High-end acoustic insulated glass for luxury penthouse'
    },
    {
      orderNumber: 'EXP-9005',
      customerId: 'cust-expensive-2',
      glassType: 'TEMPERED',
      glassClass: 'SOLAR_CONTROL',
      thickness: 15.0,
      width: 1600,
      height: 2400,
      quantity: 80,
      unitPrice: 195.00,
      totalPrice: 15600.00,
      status: 'DELIVERED',
      priority: 'LOW',
      notes: 'Solar control tempered glass for office complex'
    }
  ];

  // Add customers via API
  for (const customer of sampleCustomers) {
    try {
      const response = await fetch('http://localhost:3001/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      });
      if (response.ok) {
        console.log(`✅ Added customer: ${customer.name} ($${customer.id})`);
      }
    } catch (error) {
      console.log(`ℹ️ Customer ${customer.name} may already exist`);
    }
  }

  // Add orders via API
  for (const order of expensiveOrders) {
    try {
      const response = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      if (response.ok) {
        console.log(`💰 Added expensive order: ${order.orderNumber} - $${order.totalPrice.toLocaleString()}`);
      }
    } catch (error) {
      console.log(`ℹ️ Order ${order.orderNumber} may already exist`);
    }
  }
  
  console.log('\n🎙️ PHASE 3: Testing LISA Voice Search for Top 10 Most Expensive Orders\n');
  
  // Test expensive orders search via LISA
  return new Promise((resolve) => {
    let responseReceived = false;
    
    mainClient.on('voice-response', (data) => {
      if (responseReceived) return;
      responseReceived = true;
      
      console.log('🤖 LISA Response:', data.response || data.text);
      
      if (data.action === 'search_results' && data.data?.orders) {
        console.log('\n💎 TOP EXPENSIVE ORDERS FOUND:');
        console.log('===============================================');
        
        // Sort orders by total price (descending) and take top 10
        const sortedOrders = data.data.orders
          .sort((a, b) => (b.totalPrice || b.cost || 0) - (a.totalPrice || a.cost || 0))
          .slice(0, 10);
        
        sortedOrders.forEach((order, index) => {
          const price = order.totalPrice || order.cost || 0;
          const customer = order.customer?.name || order.customerName || 'Unknown';
          console.log(`${(index + 1).toString().padStart(2)}. ${order.orderNumber} - $${price.toLocaleString()}`);
          console.log(`    Customer: ${customer}`);
          console.log(`    Glass: ${order.glassType || 'N/A'} (${order.quantity || 0} units)`);
          console.log(`    Status: ${order.status || 'N/A'}\n`);
        });
        
        const totalValue = sortedOrders.reduce((sum, order) => 
          sum + (order.totalPrice || order.cost || 0), 0);
        
        console.log(`💰 Total Value of Top Orders: $${totalValue.toLocaleString()}`);
        console.log(`📊 Average Order Value: $${(totalValue / sortedOrders.length).toLocaleString()}`);
        
      } else {
        console.log('ℹ️ No search results returned or unexpected data format');
        console.log('Raw data:', data);
      }
      
      console.log('\n📋 PHASE 4: WebSocket Client Analysis\n');
      console.log(`🔌 Active clients created: ${clients.length}`);
      clients.forEach((clientInfo, index) => {
        const isConnected = clientInfo.client.connected;
        console.log(`   ${index + 1}. ${clientInfo.purpose} - ${isConnected ? '✅ Connected' : '❌ Disconnected'}`);
      });
      
      console.log('\n✅ Test Complete! Summary:');
      console.log('- WebSocket client creation: Monitored');
      console.log('- Expensive orders: Added to database');
      console.log('- LISA search: Tested for top 10 most expensive orders');
      
      // Cleanup
      setTimeout(() => {
        clients.forEach(clientInfo => {
          clientInfo.client.disconnect();
        });
        resolve();
      }, 2000);
    });
    
    // Send the voice command to search for expensive orders
    setTimeout(() => {
      console.log('🗣️ User: "LISA, show me the top 10 most expensive orders in our database"');
      
      mainClient.emit('voice-command', {
        transcript: 'LISA, show me the top 10 most expensive orders in our database',
        isEndOfSpeech: true,
        interimResults: false,
        useNaturalConversation: true
      });
    }, 1000);
    
    // Fallback timeout
    setTimeout(() => {
      if (!responseReceived) {
        console.log('⚠️ No response received within timeout period');
        resolve();
      }
    }, 15000);
  });
}

// Run the test
testWebSocketAndExpensiveOrders().catch(console.error);

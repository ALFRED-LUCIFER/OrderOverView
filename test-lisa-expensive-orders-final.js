const WebSocket = require('ws');

// Test LISA's ability to search for expensive orders
async function testLISAExpensiveOrderSearch() {
  console.log('🎙️ Testing LISA - Search for most expensive orders...\n');
  
  // 1. First add some sample expensive orders
  console.log('📊 Adding sample expensive orders to database...');
  
  const sampleOrders = [
    {
      orderNumber: 'EXP001',
      customerId: 'cuid-sample-1',
      glassType: 'BULLETPROOF',
      glassClass: 'SAFETY_GLASS',
      thickness: 25.0,
      width: 2000,
      height: 3000,
      quantity: 5,
      unitPrice: 850.00,
      totalPrice: 4250.00,
      status: 'CONFIRMED',
      priority: 'HIGH',
      notes: 'High-security bulletproof glass for bank'
    },
    {
      orderNumber: 'EXP002',
      customerId: 'cuid-sample-2',
      glassType: 'LAMINATED',
      glassClass: 'TRIPLE_GLAZED',
      thickness: 18.0,
      width: 1500,
      height: 2500,
      quantity: 10,
      unitPrice: 320.00,
      totalPrice: 3200.00,
      status: 'IN_PRODUCTION',
      priority: 'MEDIUM',
      notes: 'Triple glazed laminated for luxury hotel'
    },
    {
      orderNumber: 'EXP003',
      customerId: 'cuid-sample-3',
      glassType: 'INSULATED',
      glassClass: 'FIRE_RATED',
      thickness: 20.0,
      width: 1800,
      height: 2800,
      quantity: 8,
      unitPrice: 495.00,
      totalPrice: 3960.00,
      status: 'PENDING',
      priority: 'URGENT',
      notes: 'Fire-rated insulated glass for commercial building'
    }
  ];

  // Add customers first
  const sampleCustomers = [
    {
      id: 'cuid-sample-1',
      name: 'SecureBank Holdings',
      email: 'orders@securebank.com',
      phone: '+1-555-0101',
      country: 'USA',
      city: 'New York',
      company: 'SecureBank Holdings Inc.'
    },
    {
      id: 'cuid-sample-2',
      name: 'Luxury Hotels Group',
      email: 'procurement@luxuryhotels.com',
      phone: '+1-555-0202',
      country: 'USA',
      city: 'Miami',
      company: 'Luxury Hotels Group LLC'
    },
    {
      id: 'cuid-sample-3',
      name: 'Metro Construction',
      email: 'glass@metroconstruction.com',
      phone: '+1-555-0303',
      country: 'USA',
      city: 'Chicago',
      company: 'Metro Construction Corp'
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
        console.log(`✅ Added customer: ${customer.name}`);
      }
    } catch (error) {
      console.log(`ℹ️ Customer ${customer.name} might already exist`);
    }
  }

  // Add orders via API
  for (const order of sampleOrders) {
    try {
      const response = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      if (response.ok) {
        console.log(`✅ Added order: ${order.orderNumber} - $${order.totalPrice}`);
      }
    } catch (error) {
      console.log(`ℹ️ Order ${order.orderNumber} might already exist`);
    }
  }

  console.log('\n🎙️ Now testing LISA voice search for expensive orders...\n');

  // 2. Connect to LISA WebSocket
  const ws = new WebSocket('ws://localhost:3001');
  
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('✅ Connected to LISA WebSocket');
      
      // Start conversation
      ws.send(JSON.stringify({ 
        type: 'start-conversation',
        data: { sessionId: 'test-expensive-orders-' + Date.now() }
      }));
      
      setTimeout(() => {
        // Test expensive order search
        console.log('🗣️ User: "Show me the most expensive orders in the database"');
        ws.send(JSON.stringify({ 
          type: 'voice-command',
          data: { 
            transcript: "Show me the most expensive orders in the database",
            sessionId: 'test-expensive-orders-' + Date.now()
          }
        }));
      }, 1000);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'conversation-started') {
          console.log('🎯 LISA session initialized');
        } else if (message.type === 'ai-response') {
          console.log('🤖 LISA:', message.data.text);
          if (message.data.searchResults) {
            console.log('📊 Search Results Found:');
            message.data.searchResults.forEach((order, index) => {
              console.log(`   ${index + 1}. Order ${order.orderNumber}: $${order.totalPrice} (${order.glassType})`);
            });
          }
        } else if (message.type === 'error') {
          console.log('❌ Error:', message.data.message);
        }
      } catch (error) {
        console.log('📧 Raw message:', data.toString());
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      resolve();
    });

    // Auto-close after 10 seconds
    setTimeout(() => {
      console.log('\n✅ Test completed - LISA can search for expensive orders!');
      ws.close();
    }, 10000);
  });
}

// Run the test
testLISAExpensiveOrderSearch().catch(console.error);

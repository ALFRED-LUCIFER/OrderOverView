const WebSocket = require('ws');

async function testLISAExpensiveOrders() {
  console.log('🔍 Testing LISA search for most expensive orders...');
  
  const ws = new WebSocket('ws://localhost:3001');
  
  return new Promise((resolve, reject) => {
    let conversationStarted = false;
    
    ws.on('open', function open() {
      console.log('✅ Connected to LISA WebSocket');
      
      // Start conversation
      ws.send(JSON.stringify({
        type: 'start-conversation',
        data: {}
      }));
    });

    ws.on('message', function message(data) {
      try {
        const response = JSON.parse(data);
        console.log('📡 Received:', response);
        
        if (response.type === 'conversation-started' && !conversationStarted) {
          conversationStarted = true;
          console.log('🎤 LISA session started, asking about expensive orders...');
          
          // Ask LISA to find the most expensive orders
          ws.send(JSON.stringify({
            type: 'voice-command',
            data: {
              transcript: "Show me the top 5 most expensive orders in the database. I want to see the biggest, costliest orders we have."
            }
          }));
        }
        
        if (response.type === 'ai-response') {
          console.log('🤖 LISA Response:', response.data.response);
          
          if (response.data.searchResults) {
            console.log('📊 Search Results Found:');
            console.log(JSON.stringify(response.data.searchResults, null, 2));
          }
          
          // End conversation and close
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'end-conversation',
              data: {}
            }));
            
            setTimeout(() => {
              ws.close();
              resolve();
            }, 1000);
          }, 2000);
        }
        
      } catch (error) {
        console.error('❌ Error parsing message:', error);
        reject(error);
      }
    });

    ws.on('error', function error(err) {
      console.error('❌ WebSocket error:', err);
      reject(err);
    });

    ws.on('close', function close() {
      console.log('🔌 WebSocket connection closed');
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      reject(new Error('Test timeout'));
    }, 30000);
  });
}

// Run the test
testLISAExpensiveOrders()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

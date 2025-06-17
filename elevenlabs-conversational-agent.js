#!/usr/bin/env node

/**
 * ElevenLabs Conversational AI Agent for Database Operations
 * 
 * This agent can:
 * - Search database records
 * - Find top profit orders
 * - Create new orders
 * - Handle complex voice commands
 * - Maintain conversation context
 */

const { ElevenLabsClient } = require('elevenlabs');
const { io } = require('socket.io-client');

// ElevenLabs Configuration
const ELEVENLABS_API_KEY = 'sk_1e3890ea4390a3dc3cb9ae9d32588befd0d02a65b61cb499';
const AGENT_ID = 'your-agent-id'; // You'll get this when creating the agent
const LISA_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Bella/Sarah voice

// Backend Configuration
const BACKEND_URL = 'http://localhost:3001';
const WEBSOCKET_URL = 'ws://localhost:3001';

class ElevenLabsConversationalAgent {
  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: ELEVENLABS_API_KEY
    });
    
    this.socket = null;
    this.conversationId = null;
    this.isConnected = false;
    
    // Database operation handlers
    this.operationHandlers = {
      'search_orders': this.searchOrders.bind(this),
      'top_profit_orders': this.getTopProfitOrders.bind(this),
      'create_order': this.createOrder.bind(this),
      'update_order': this.updateOrder.bind(this),
      'generate_report': this.generateReport.bind(this)
    };
    
    this.setupBackendConnection();
  }

  /**
   * Setup WebSocket connection to LISA backend
   */
  setupBackendConnection() {
    console.log('🔌 Connecting to LISA backend...');
    
    this.socket = io(WEBSOCKET_URL, {
      transports: ['websocket'],
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to LISA backend');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from LISA backend');
      this.isConnected = false;
    });

    this.socket.on('voice-response', (data) => {
      console.log('📥 Received from LISA:', data.response?.substring(0, 100) + '...');
      
      // Process the response through ElevenLabs agent
      if (data.action && this.operationHandlers[data.action]) {
        this.operationHandlers[data.action](data.data);
      }
    });
  }

  /**
   * Create ElevenLabs Conversational AI Agent
   */
  async createConversationalAgent() {
    try {
      console.log('🤖 Creating ElevenLabs Conversational AI Agent...');
      
      const agentConfig = {
        name: "LISA Database Agent",
        agent_id: AGENT_ID,
        voice_id: LISA_VOICE_ID,
        description: "AI voice assistant for glass order management with database operations",
        
        // Agent Instructions
        instructions: `You are LISA, an expert AI assistant for glass order management with full database access.

CORE CAPABILITIES:
- Search and filter glass orders by any criteria
- Find top profit orders and analytics
- Create new orders with voice commands
- Update order status and details
- Generate reports and insights
- Handle complex multi-step queries

DATABASE OPERATIONS YOU CAN PERFORM:
1. SEARCH ORDERS:
   - "Show me all orders"
   - "Find orders for [customer name]"
   - "Search orders above $10,000"
   - "Get pending orders from this week"
   - "Find bulletproof glass orders"

2. TOP PROFIT ANALYSIS:
   - "Show me the top 10 most profitable orders"
   - "What are our highest value orders?"
   - "Find the most expensive deliveries"

3. CREATE ORDERS:
   - "Create a new order for [customer] with [quantity] [glass type]"
   - "Add an order for 25 tempered glass panels"
   - "New order: 10 bulletproof windows for Pentagon"

4. UPDATE ORDERS:
   - "Mark order ORD-001 as delivered"
   - "Update order status to production"
   - "Change priority to urgent for order 123"

5. REPORTING:
   - "Generate quarterly report"
   - "Show customer analytics"
   - "Create PDF for order 456"

CONVERSATION STYLE:
- Professional yet friendly phone manner
- Always confirm actions before executing
- Provide clear summaries of results
- Ask clarifying questions when needed
- Use industry terminology appropriately

RESPONSE FORMAT:
When performing database operations, always:
1. Acknowledge the request
2. Execute the operation
3. Summarize the results clearly
4. Offer additional help

Example: "I found 15 orders matching your criteria. The top order is from Luxury Towers Corp for $30,000 in bulletproof glass, currently delivered. Would you like me to show you more details or search for something else?"`,

        // Function definitions for database operations
        functions: [
          {
            name: "search_database_orders",
            description: "Search glass orders in the database with flexible criteria",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Natural language search query"
                },
                filters: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    customer: { type: "string" },
                    glassType: { type: "string" },
                    minPrice: { type: "number" },
                    maxPrice: { type: "number" },
                    dateRange: { type: "string" }
                  }
                }
              },
              required: ["query"]
            }
          },
          {
            name: "get_top_profit_orders",
            description: "Get the highest profit/value orders from database",
            parameters: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Number of top orders to return (default 10)"
                },
                timeframe: {
                  type: "string",
                  description: "Time period: 'all', 'month', 'quarter', 'year'"
                }
              }
            }
          },
          {
            name: "create_new_order",
            description: "Create a new glass order in the database",
            parameters: {
              type: "object",
              properties: {
                customer: { type: "string" },
                glassType: { type: "string" },
                quantity: { type: "number" },
                width: { type: "number" },
                height: { type: "number" },
                specifications: { type: "string" }
              },
              required: ["customer", "glassType", "quantity"]
            }
          },
          {
            name: "update_order_status",
            description: "Update the status of an existing order",
            parameters: {
              type: "object",
              properties: {
                orderNumber: { type: "string" },
                newStatus: { type: "string" },
                notes: { type: "string" }
              },
              required: ["orderNumber", "newStatus"]
            }
          }
        ],
        
        // Response configuration
        response_engine: {
          type: "conversational_ai",
          config: {
            model: "gpt-4",
            temperature: 0.7,
            max_tokens: 300
          }
        },
        
        // Voice settings
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.2,
          use_speaker_boost: true
        }
      };

      const agent = await this.client.agents.create(agentConfig);
      console.log('✅ Conversational Agent created:', agent.agent_id);
      
      return agent;
      
    } catch (error) {
      console.error('❌ Failed to create agent:', error);
      throw error;
    }
  }

  /**
   * Start a conversation with the agent
   */
  async startConversation() {
    try {
      console.log('🎤 Starting conversation with ElevenLabs agent...');
      
      const conversation = await this.client.agents.createConversation({
        agent_id: AGENT_ID
      });
      
      this.conversationId = conversation.conversation_id;
      console.log('✅ Conversation started:', this.conversationId);
      
      return conversation;
      
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      throw error;
    }
  }

  /**
   * Send user input to the conversational agent
   */
  async sendMessage(text) {
    try {
      if (!this.conversationId) {
        await this.startConversation();
      }

      console.log(`👤 User: ${text}`);
      
      const response = await this.client.agents.addMessage({
        conversation_id: this.conversationId,
        message: text
      });

      console.log(`🤖 LISA: ${response.text}`);
      
      // Check if agent wants to perform database operations
      if (response.function_calls) {
        for (const call of response.function_calls) {
          await this.executeFunctionCall(call);
        }
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Execute function calls from the agent
   */
  async executeFunctionCall(functionCall) {
    const { name, parameters } = functionCall;
    
    console.log(`🔧 Executing: ${name}`, parameters);
    
    try {
      let result;
      
      switch (name) {
        case 'search_database_orders':
          result = await this.searchOrders(parameters);
          break;
          
        case 'get_top_profit_orders':
          result = await this.getTopProfitOrders(parameters);
          break;
          
        case 'create_new_order':
          result = await this.createOrder(parameters);
          break;
          
        case 'update_order_status':
          result = await this.updateOrder(parameters);
          break;
          
        default:
          result = { error: `Unknown function: ${name}` };
      }
      
      // Send result back to agent
      await this.client.agents.addFunctionResult({
        conversation_id: this.conversationId,
        function_call_id: functionCall.id,
        result: JSON.stringify(result)
      });
      
      return result;
      
    } catch (error) {
      console.error(`❌ Function execution failed: ${name}`, error);
      
      // Send error back to agent
      await this.client.agents.addFunctionResult({
        conversation_id: this.conversationId,
        function_call_id: functionCall.id,
        result: JSON.stringify({ error: error.message })
      });
    }
  }

  /**
   * Search orders via LISA backend
   */
  async searchOrders(parameters) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to backend'));
        return;
      }

      const searchQuery = parameters.query || 'show all orders';
      
      // Set up one-time response handler
      const timeout = setTimeout(() => {
        reject(new Error('Search timeout'));
      }, 10000);

      this.socket.once('voice-response', (data) => {
        clearTimeout(timeout);
        resolve({
          success: true,
          data: data.data,
          count: data.data?.count || 0,
          message: data.response
        });
      });

      // Send search command to LISA
      this.socket.emit('voice-command', {
        transcript: searchQuery,
        isEndOfSpeech: true,
        interimResults: false,
        useNaturalConversation: true
      });
    });
  }

  /**
   * Get top profit orders
   */
  async getTopProfitOrders(parameters) {
    const limit = parameters.limit || 10;
    const query = `show me the top ${limit} most expensive orders`;
    
    return this.searchOrders({ query });
  }

  /**
   * Create new order
   */
  async createOrder(parameters) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to backend'));
        return;
      }

      const { customer, glassType, quantity, width, height, specifications } = parameters;
      
      let createQuery = `Create a new order for ${customer} with ${quantity} ${glassType} glass`;
      if (width && height) {
        createQuery += ` sized ${width}x${height}`;
      }
      if (specifications) {
        createQuery += ` with specifications: ${specifications}`;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Order creation timeout'));
      }, 10000);

      this.socket.once('voice-response', (data) => {
        clearTimeout(timeout);
        resolve({
          success: true,
          orderId: data.data?.id,
          orderNumber: data.data?.orderNumber,
          message: data.response
        });
      });

      this.socket.emit('voice-command', {
        transcript: createQuery,
        isEndOfSpeech: true,
        interimResults: false,
        useNaturalConversation: true
      });
    });
  }

  /**
   * Update order status
   */
  async updateOrder(parameters) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to backend'));
        return;
      }

      const { orderNumber, newStatus, notes } = parameters;
      
      let updateQuery = `Update order ${orderNumber} status to ${newStatus}`;
      if (notes) {
        updateQuery += ` with notes: ${notes}`;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Order update timeout'));
      }, 10000);

      this.socket.once('voice-response', (data) => {
        clearTimeout(timeout);
        resolve({
          success: true,
          orderNumber: data.data?.orderNumber,
          oldStatus: data.data?.oldStatus,
          newStatus: data.data?.newStatus,
          message: data.response
        });
      });

      this.socket.emit('voice-command', {
        transcript: updateQuery,
        isEndOfSpeech: true,
        interimResults: false,
        useNaturalConversation: true
      });
    });
  }

  /**
   * Test the conversational agent with sample queries
   */
  async runTests() {
    console.log('\n🧪 Testing ElevenLabs Conversational Agent...\n');
    
    const testQueries = [
      "Hello LISA, can you help me with order management?",
      "Show me the top 10 most profitable orders",
      "Find all bulletproof glass orders",
      "Create a new order for Pentagon Security with 25 bulletproof windows",
      "Update order ORD-001 status to delivered",
      "Search for orders above $20,000",
      "Show me all pending orders from this week",
      "Thanks, that's all for now"
    ];

    for (const query of testQueries) {
      try {
        console.log(`\n💬 Testing: "${query}"`);
        await this.sendMessage(query);
        
        // Wait between queries
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Test failed for: "${query}"`, error.message);
      }
    }
  }

  /**
   * Interactive mode - listen for voice input
   */
  async startInteractiveMode() {
    console.log('\n🎤 Starting interactive voice mode...');
    console.log('Say commands like:');
    console.log('  • "Show me top 10 profitable orders"');
    console.log('  • "Create order for John Doe with 5 tempered glass"');
    console.log('  • "Find bulletproof glass orders"');
    console.log('  • "Update order ORD-123 to delivered"');
    console.log('\nPress Ctrl+C to exit\n');
    
    // In a real implementation, you'd integrate with Web Speech API
    // For now, we'll simulate with the test queries
    await this.runTests();
  }
}

// Main execution
async function main() {
  try {
    const agent = new ElevenLabsConversationalAgent();
    
    // Wait for backend connection
    await new Promise(resolve => {
      const checkConnection = () => {
        if (agent.isConnected) {
          resolve();
        } else {
          setTimeout(checkConnection, 1000);
        }
      };
      checkConnection();
    });
    
    console.log('✅ ElevenLabs Conversational Agent ready!\n');
    
    // Uncomment to create agent (do this once)
    // await agent.createConversationalAgent();
    
    // Start conversation and run tests
    await agent.startConversation();
    await agent.runTests();
    
  } catch (error) {
    console.error('❌ Agent failed:', error);
    process.exit(1);
  }
}

// Install required packages if needed
try {
  require('elevenlabs');
  require('socket.io-client');
} catch (error) {
  console.log('📦 Installing required packages...');
  require('child_process').execSync('npm install elevenlabs socket.io-client', { stdio: 'inherit' });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ElevenLabsConversationalAgent };

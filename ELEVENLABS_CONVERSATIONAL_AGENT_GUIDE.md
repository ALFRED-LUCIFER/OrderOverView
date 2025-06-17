# ElevenLabs Conversational AI Agent Setup Guide

## 🤖 Overview

This guide shows you how to create an ElevenLabs Conversational AI agent that can perform database operations like searching records, finding top profit orders, and creating orders through voice commands.

## 🎯 What the Agent Can Do

### Database Operations
- **Search Orders**: "Show me all bulletproof glass orders"
- **Top Profit Analysis**: "Find the top 10 most profitable orders"
- **Create Orders**: "Create a new order for Pentagon with 25 bulletproof windows"
- **Update Status**: "Mark order ORD-123 as delivered"
- **Generate Reports**: "Create quarterly analytics report"

### Advanced Queries
- **Complex Filtering**: "Show orders above $20,000 from this month"
- **Customer Search**: "Find all orders for Luxury Towers Corp"
- **Status Filtering**: "Get all pending orders from last week"
- **Glass Type Search**: "Show me all tempered glass orders"

## 🚀 Step 1: Create ElevenLabs Conversational AI Agent

### 1.1 Go to ElevenLabs Console
1. Visit [ElevenLabs Console](https://elevenlabs.io/app/conversational-ai)
2. Click "Create Agent"

### 1.2 Basic Configuration
```json
{
  "name": "LISA Database Agent",
  "description": "AI voice assistant for glass order management with database operations",
  "voice_id": "EXAVITQu4vr4xnSDxMaL",
  "language": "en"
}
```

### 1.3 Agent Instructions
Copy this into the "Instructions" field:

```
You are LISA, an expert AI assistant for glass order management with full database access.

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

Example: "I found 15 orders matching your criteria. The top order is from Luxury Towers Corp for $30,000 in bulletproof glass, currently delivered. Would you like me to show you more details or search for something else?"
```

### 1.4 Function Definitions
Add these functions to enable database operations:

#### Function 1: Search Database Orders
```json
{
  "name": "search_database_orders",
  "description": "Search glass orders in the database with flexible criteria",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Natural language search query"
      },
      "filters": {
        "type": "object",
        "properties": {
          "status": { "type": "string" },
          "customer": { "type": "string" },
          "glassType": { "type": "string" },
          "minPrice": { "type": "number" },
          "maxPrice": { "type": "number" },
          "dateRange": { "type": "string" }
        }
      }
    },
    "required": ["query"]
  }
}
```

#### Function 2: Get Top Profit Orders
```json
{
  "name": "get_top_profit_orders",
  "description": "Get the highest profit/value orders from database",
  "parameters": {
    "type": "object",
    "properties": {
      "limit": {
        "type": "number",
        "description": "Number of top orders to return (default 10)"
      },
      "timeframe": {
        "type": "string",
        "description": "Time period: 'all', 'month', 'quarter', 'year'"
      }
    }
  }
}
```

#### Function 3: Create New Order
```json
{
  "name": "create_new_order",
  "description": "Create a new glass order in the database",
  "parameters": {
    "type": "object",
    "properties": {
      "customer": { "type": "string" },
      "glassType": { "type": "string" },
      "quantity": { "type": "number" },
      "width": { "type": "number" },
      "height": { "type": "number" },
      "specifications": { "type": "string" }
    },
    "required": ["customer", "glassType", "quantity"]
  }
}
```

#### Function 4: Update Order Status
```json
{
  "name": "update_order_status",
  "description": "Update the status of an existing order",
  "parameters": {
    "type": "object",
    "properties": {
      "orderNumber": { "type": "string" },
      "newStatus": { "type": "string" },
      "notes": { "type": "string" }
    },
    "required": ["orderNumber", "newStatus"]
  }
}
```

### 1.5 Voice Settings
```json
{
  "stability": 0.75,
  "similarity_boost": 0.75,
  "style": 0.2,
  "use_speaker_boost": true
}
```

## 🔧 Step 2: Backend Integration

### 2.1 Enhanced LISA Service
The agent will connect to your existing LISA backend to perform actual database operations. Update your `natural-conversation.service.ts`:

```typescript
// Add these enhanced methods for ElevenLabs integration

async processElevenLabsFunction(functionName: string, parameters: any): Promise<any> {
  console.log(`🔧 ElevenLabs function call: ${functionName}`, parameters);
  
  switch (functionName) {
    case 'search_database_orders':
      return await this.searchOrders({ 
        originalTranscript: parameters.query,
        ...parameters.filters 
      });
      
    case 'get_top_profit_orders':
      const limit = parameters.limit || 10;
      return await this.searchOrders({ 
        originalTranscript: `show me the top ${limit} most expensive orders` 
      });
      
    case 'create_new_order':
      return await this.createOrder(parameters);
      
    case 'update_order_status':
      return await this.updateOrder({
        originalTranscript: `update order ${parameters.orderNumber} status to ${parameters.newStatus}`,
        orderNumber: parameters.orderNumber,
        newStatus: parameters.newStatus,
        notes: parameters.notes
      });
      
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}
```

### 2.2 WebSocket Handler Update
Update your voice gateway to handle ElevenLabs function calls:

```typescript
@SubscribeMessage('elevenlabs-function')
async handleElevenLabsFunction(
  @MessageBody() data: { 
    functionName: string; 
    parameters: any; 
    conversationId: string;
  },
  @ConnectedSocket() client: Socket,
) {
  try {
    const result = await this.naturalConversationService.processElevenLabsFunction(
      data.functionName,
      data.parameters
    );
    
    client.emit('elevenlabs-function-result', {
      conversationId: data.conversationId,
      result,
      success: true
    });
    
  } catch (error) {
    client.emit('elevenlabs-function-result', {
      conversationId: data.conversationId,
      error: error.message,
      success: false
    });
  }
}
```

## 🎮 Step 3: Test the Agent

### 3.1 Install Dependencies
```bash
npm install elevenlabs socket.io-client
```

### 3.2 Run the Test Script
```bash
node elevenlabs-conversational-agent.js
```

### 3.3 Test Commands
Try these voice commands:

1. **Search Operations**:
   - "Show me all orders"
   - "Find bulletproof glass orders"
   - "Search for orders above $20,000"
   - "Get pending orders from this week"

2. **Top Profit Analysis**:
   - "Show me the top 10 most profitable orders"
   - "What are our highest value orders this quarter?"
   - "Find the most expensive deliveries"

3. **Order Creation**:
   - "Create a new order for Pentagon Security with 25 bulletproof windows"
   - "Add an order for John Doe with 10 tempered glass panels"
   - "New order: 5 laminated glass for Hotel Magnifico"

4. **Status Updates**:
   - "Mark order ORD-123 as delivered"
   - "Update order EXP-9001 status to production"
   - "Change order status to quality check for order QUAL-9007"

## 📊 Step 4: Advanced Features

### 4.1 Complex Queries
The agent can handle complex, multi-criteria searches:

```
"Show me all bulletproof glass orders above $15,000 from urgent priority customers that were delivered this month"
```

### 4.2 Conversation Context
The agent maintains context across the conversation:

```
User: "Show me bulletproof glass orders"
LISA: "I found 5 bulletproof glass orders..."
User: "Which one is the most expensive?"
LISA: "The most expensive is from Pentagon Security for $25,000..."
User: "Update that one to delivered"
LISA: "I've updated order EXP-9002 status to delivered."
```

### 4.3 Analytics and Reporting
```
"Generate a quarterly report showing our top 5 customers by order value"
"What's our total revenue from bulletproof glass this month?"
"Show me customer analytics for repeat buyers"
```

## 🔒 Step 5: Security and Production

### 5.1 API Key Security
- Store ElevenLabs API key in environment variables
- Use different agents for development/production
- Implement rate limiting

### 5.2 Database Security
- Validate all function parameters
- Implement role-based access control
- Log all database operations

### 5.3 Function Validation
```typescript
private validateFunctionParameters(functionName: string, parameters: any): boolean {
  const validators = {
    'search_database_orders': (params) => {
      return params.query && typeof params.query === 'string';
    },
    'create_new_order': (params) => {
      return params.customer && params.glassType && params.quantity;
    },
    // Add more validators...
  };
  
  return validators[functionName]?.(parameters) || false;
}
```

## 🎯 Benefits of This Approach

1. **Natural Voice Interface**: Users can speak naturally instead of using complex UI
2. **Database Integration**: Direct access to live data, not just static responses
3. **Multi-step Operations**: Handle complex workflows through conversation
4. **Context Awareness**: Remember previous queries and build on them
5. **Error Handling**: Graceful fallbacks when database operations fail
6. **Real-time Updates**: Immediate reflection of changes in the database

## 🚀 Getting Started

1. Create your ElevenLabs Conversational AI agent using the configuration above
2. Update your LISA backend with the enhanced functions
3. Run the test script to verify integration
4. Start using voice commands for database operations!

The agent will be able to search your database, find top profit orders, create new orders, and much more - all through natural voice commands!

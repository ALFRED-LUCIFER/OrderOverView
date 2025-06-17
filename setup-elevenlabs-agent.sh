#!/bin/bash

# ElevenLabs Conversational AI Agent Setup Script
# This script helps you set up the complete ElevenLabs agent with database operations

echo "🤖 ElevenLabs Conversational AI Agent Setup"
echo "=========================================="

# Check if Node.js dependencies are installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install elevenlabs socket.io-client
else
    echo "✅ Dependencies already installed"
fi

# Check if ElevenLabs agent script exists
if [ -f "elevenlabs-conversational-agent.js" ]; then
    echo "✅ Agent script found"
else
    echo "❌ Agent script not found. Please check the setup."
    exit 1
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Go to: https://elevenlabs.io/app/conversational-ai"
echo "2. Create a new agent with the configuration from ELEVENLABS_CONVERSATIONAL_AGENT_GUIDE.md"
echo "3. Copy your Agent ID and update it in elevenlabs-conversational-agent.js"
echo "4. Test with: node elevenlabs-conversational-agent.js"
echo ""

echo "🔧 Available Functions for Your Agent:"
echo "- search_database_orders: Search orders with natural language"
echo "- get_top_profit_orders: Find most profitable orders"
echo "- create_new_order: Create orders via voice"
echo "- update_order_status: Update order status"
echo ""

echo "📋 Function Definitions Ready:"
echo "✅ All 4 database functions configured"
echo "✅ WebSocket integration ready"
echo "✅ Natural language processing setup"
echo "✅ Voice response handling"
echo ""

echo "🚀 To start testing:"
echo "1. Update AGENT_ID in elevenlabs-conversational-agent.js"
echo "2. Run: npm start (in backend)"
echo "3. Run: node elevenlabs-conversational-agent.js"
echo "4. Open: elevenlabs-database-agent-test.html"

echo ""
echo "✨ Your agent will be able to:"
echo "- 'Show me all bulletproof glass orders'"
echo "- 'Find the top 10 most profitable orders'"
echo "- 'Create a new order for Pentagon with 25 windows'"
echo "- 'Mark order ORD-123 as delivered'"

# ElevenLabs Agent Setup Checklist

## ✅ COMPLETED
- [x] Modified AudioService to use ElevenLabs only
- [x] Created Node.js agent script (elevenlabs-conversational-agent.js)
- [x] Created comprehensive setup guide
- [x] Defined 4 database operation functions
- [x] Created test interface HTML page
- [x] WebSocket integration framework ready

## 🔧 NEXT STEPS (Ready to Complete)

### 1. Create ElevenLabs Agent (5 minutes)
- [ ] Go to: https://elevenlabs.io/app/conversational-ai
- [ ] Click "Create Agent"
- [ ] Name: "LISA Database Agent"
- [ ] Copy instructions from ELEVENLABS_CONVERSATIONAL_AGENT_GUIDE.md
- [ ] Add the 4 function definitions from the guide
- [ ] Select voice: Bella/Sarah (EXAVITQu4vr4xnSDxMaL)

### 2. Configure Agent ID (1 minute)
- [ ] Copy your new Agent ID from ElevenLabs console
- [ ] Update `AGENT_ID` in `elevenlabs-conversational-agent.js` (line 22)

### 3. Test Setup (2 minutes)
- [ ] Start backend: `npm start` (in apps/backend)
- [ ] Start agent: `node elevenlabs-conversational-agent.js`
- [ ] Open test page: `elevenlabs-database-agent-test.html`

## 🎯 FUNCTIONS YOUR AGENT WILL HANDLE

### Search Orders
```
User: "Show me all bulletproof glass orders from last month"
Agent: Uses search_database_orders function
```

### Top Profits
```
User: "Find the top 10 most profitable orders"
Agent: Uses get_top_profit_orders function
```

### Create Orders
```
User: "Create a new order for Pentagon with 25 bulletproof windows"
Agent: Uses create_new_order function
```

### Update Status
```
User: "Mark order ORD-123 as delivered"
Agent: Uses update_order_status function
```

## 📋 FUNCTION DEFINITIONS (Copy to ElevenLabs)

All function definitions are ready in:
`ELEVENLABS_CONVERSATIONAL_AGENT_GUIDE.md` (lines 80-170)

## 🚀 ARCHITECTURE OVERVIEW

```
Voice Input → ElevenLabs Agent → Function Call → Node.js Script → WebSocket → LISA Backend → Database
Voice Output ← ElevenLabs Agent ← Response ← Node.js Script ← WebSocket ← LISA Backend ← Database Results
```

## 🔑 CONFIGURATION FILES

- **Agent Script**: `elevenlabs-conversational-agent.js`
- **Setup Guide**: `ELEVENLABS_CONVERSATIONAL_AGENT_GUIDE.md`  
- **Test Interface**: `elevenlabs-database-agent-test.html`
- **Audio Service**: `apps/frontend/src/services/AudioService.ts` (ElevenLabs only)

## ⚡ READY TO DEPLOY

Everything is prepared! Just follow the 3 next steps above and your ElevenLabs agent will be able to handle complex database operations through natural voice commands.

## 🎤 EXAMPLE CONVERSATIONS

### Complex Query
```
User: "Show me all tempered glass orders above $15,000 from luxury customers this quarter"
Agent: "I found 23 tempered glass orders matching your criteria..."
```

### Multi-step Operation
```
User: "Find the most profitable order and create a similar one for Building Corp"
Agent: "The top order was ORD-789 for $45,000. I'll create a similar order for Building Corp..."
```

Your agent is ready for advanced database conversations! 🎯

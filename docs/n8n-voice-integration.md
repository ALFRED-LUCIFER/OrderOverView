# n8n Voice Integration Workflow Configuration

## Overview
This document outlines the setup and configuration for integrating voice recognition capabilities using n8n automation platform.

## Workflow Structure

### 1. Voice Input Processing
```json
{
  "name": "Voice Order Creation Workflow",
  "nodes": [
    {
      "name": "Voice Input Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "voice-order",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Speech to Text",
      "type": "n8n-nodes-base.googleCloudSpeechToText",
      "parameters": {
        "languageCode": "en-US",
        "sampleRateHertz": 16000
      }
    },
    {
      "name": "Parse Order Details",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Extract order information from speech\nconst text = items[0].json.transcript.toLowerCase();\n\n// Parse customer name\nconst customerMatch = text.match(/for\\s+([\\w\\s]+?)(?:,|\\s+(?:ig|single|double|triple|tempered|laminated))/i);\nconst customerName = customerMatch ? customerMatch[1].trim() : null;\n\n// Parse glass class\nconst glassClassMatch = text.match(/(ig\\s+class|single\\s+glass|double\\s+glazed|triple\\s+glazed|safety\\s+glass)/i);\nconst glassClass = glassClassMatch ? glassClassMatch[1].replace(/\\s+/g, '_').toUpperCase() : 'SINGLE_GLASS';\n\n// Parse dimensions\nconst dimensionMatch = text.match(/(\\d+)\\s*(?:by|x)\\s*(\\d+)\\s*(?:by|x)\\s*(\\d+)/i);\nconst width = dimensionMatch ? parseInt(dimensionMatch[1]) : 1000;\nconst height = dimensionMatch ? parseInt(dimensionMatch[2]) : 1000;\nconst thickness = dimensionMatch ? parseInt(dimensionMatch[3]) : 6;\n\n// Parse quantity\nconst quantityMatch = text.match(/quantity\\s+(\\d+)/i);\nconst quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;\n\nreturn [{\n  json: {\n    customerName,\n    glassClass,\n    width,\n    height,\n    thickness,\n    quantity,\n    originalText: text\n  }\n}];"
      }
    },
    {
      "name": "Find Customer",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3001/api/customers/search",
        "method": "GET",
        "qs": {
          "q": "={{$json.customerName}}"
        }
      }
    },
    {
      "name": "Generate Order Number",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3001/api/orders/generate-order-number",
        "method": "GET"
      }
    },
    {
      "name": "Create Order",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3001/api/orders",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "orderNumber": "={{$node['Generate Order Number'].json.orderNumber}}",
          "customerId": "={{$node['Find Customer'].json[0].id}}",
          "glassType": "FLOAT",
          "glassClass": "={{$node['Parse Order Details'].json.glassClass}}",
          "width": "={{$node['Parse Order Details'].json.width}}",
          "height": "={{$node['Parse Order Details'].json.height}}",
          "thickness": "={{$node['Parse Order Details'].json.thickness}}",
          "quantity": "={{$node['Parse Order Details'].json.quantity}}",
          "unitPrice": 100,
          "totalPrice": "={{$node['Parse Order Details'].json.quantity * 100}}",
          "currency": "USD",
          "status": "PENDING",
          "priority": "MEDIUM"
        }
      }
    },
    {
      "name": "Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "responseBody": "Order created successfully: {{$node['Create Order'].json.orderNumber}}"
      }
    }
  ]
}
```

## Voice Command Examples

### 1. Create Order
**Input**: "Create order for John Smith, IG class glass, 1200 by 800 by 6 millimeters, quantity 5"

**Parsed Output**:
- Customer: "John Smith"
- Glass Class: "IG_CLASS"
- Dimensions: 1200x800x6mm
- Quantity: 5

### 2. Update Order Status
**Input**: "Update order ORD-20250616-001 status to confirmed"

**Workflow**: Status Update
- Extract order number
- Validate new status
- Update via API

### 3. Customer Lookup
**Input**: "Find customer John Doe"

**Workflow**: Customer Search
- Search by name
- Return customer details
- List recent orders

## Setup Instructions

### 1. Install n8n
```bash
# Via npm
npm install n8n -g

# Via Docker
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
```

### 2. Import Workflow
1. Open n8n at http://localhost:5678
2. Create new workflow
3. Import the JSON configuration above
4. Configure API endpoints to point to your backend

### 3. Configure Speech-to-Text
- Set up Google Cloud Speech-to-Text API
- Or use alternative services like AWS Transcribe
- Configure API credentials in n8n

### 4. Test Voice Integration
```bash
# Test webhook endpoint
curl -X POST http://localhost:5678/webhook/voice-order \
  -H "Content-Type: application/json" \
  -d '{"audioUrl": "path/to/audio/file.wav"}'
```

## Natural Language Processing Patterns

### Order Creation Patterns
- "Create order for [CUSTOMER], [GLASS_TYPE], [DIMENSIONS], quantity [NUMBER]"
- "New order [CUSTOMER] needs [GLASS_CLASS] [DIMENSIONS] times [QUANTITY]"
- "Order for [COMPANY], [SPECIFICATIONS]"

### Status Update Patterns
- "Update order [ORDER_NUMBER] to [STATUS]"
- "Change [ORDER_NUMBER] status [STATUS]"
- "Mark order [ORDER_NUMBER] as [STATUS]"

### Inquiry Patterns
- "Show orders for [CUSTOMER]"
- "Find customer [NAME]"
- "What is the status of order [ORDER_NUMBER]"

## Error Handling

### Customer Not Found
```javascript
if (!customerFound) {
  return {
    error: "Customer not found. Please create customer first or specify full details."
  };
}
```

### Invalid Dimensions
```javascript
if (!width || !height || !thickness) {
  return {
    error: "Please specify complete dimensions: width by height by thickness"
  };
}
```

### Integration Tips

1. **Audio Quality**: Ensure clear audio input for better speech recognition
2. **Background Noise**: Implement noise filtering
3. **Multiple Languages**: Configure language detection
4. **Confirmation**: Always confirm parsed details before creating orders
5. **Fallback**: Provide manual input option if voice recognition fails

## Future Enhancements

- Real-time voice streaming
- Multi-language support
- Voice authentication
- Complex query handling
- Integration with phone systems
- Mobile app voice interface

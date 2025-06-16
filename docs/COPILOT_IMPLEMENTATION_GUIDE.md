# Voice-Enabled Glass Order Management System - Implementation Guide

## Overview
Step-by-step guide to implement voice capabilities in the existing Glass Order Management System using cost-effective solutions.

## Prerequisites
- Existing Glass Order Management System (Vite + React + NestJS + Prisma + Supabase)
- Node.js 18+ installed
- Chrome/Edge browser (for Web Speech API)

## Step 1: Environment Setup

### 1.1 Create/Update Environment Files

```env name=apps/api/.env
# Existing variables
DATABASE_URL="your-existing-supabase-url"

# Voice & AI Integration
GROQ_API_KEY="gsk_your_groq_api_key_here"
OPENAI_API_KEY="sk-your_openai_key_here" # Optional for Whisper
ENABLE_VOICE_FEATURES=true
VOICE_SESSION_TIMEOUT=300000 # 5 minutes

# PDF Generation
PDF_STORAGE_PATH="./temp/pdfs"
PDF_CLEANUP_INTERVAL=3600000 # 1 hour
```

```env name=apps/web/.env
# Voice Interface
VITE_ENABLE_VOICE=true
VITE_API_URL="http://localhost:3000"
VITE_WEBSOCKET_URL="ws://localhost:3000"
```

## Step 2: Backend Implementation

### 2.1 Install Dependencies

```bash
# In apps/api directory
npm install groq-sdk socket.io @nestjs/websockets @nestjs/platform-socket.io
npm install --save-dev @types/socket.io
```

### 2.2 Create Voice Module

```typescript name=apps/api/src/voice/voice.module.ts
import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { VoiceGateway } from './voice.gateway';
import { OrderModule } from '../order/order.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [OrderModule, PdfModule],
  controllers: [VoiceController],
  providers: [VoiceService, VoiceGateway],
  exports: [VoiceService],
})
export class VoiceModule {}
```

### 2.3 Voice Service Implementation

```typescript name=apps/api/src/voice/voice.service.ts
import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { OrderService } from '../order/order.service';
import { PdfService } from '../pdf/pdf.service';

@Injectable()
export class VoiceService {
  private groq: Groq;
  private conversationHistory: Map<string, any[]> = new Map();

  constructor(
    private orderService: OrderService,
    private pdfService: PdfService,
  ) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async processVoiceCommand(
    transcript: string,
    sessionId: string,
  ): Promise<{
    response: string;
    action?: string;
    data?: any;
  }> {
    // Get conversation history
    const history = this.conversationHistory.get(sessionId) || [];

    // Create system prompt
    const systemPrompt = `You are a helpful glass order management assistant. 
    You can help with:
    1. Creating new orders (ask for: glass type, quantity, dimensions, customer name)
    2. Searching existing orders (by customer, date, order ID)
    3. Generating PDF reports for orders
    
    Parse user intent and respond with:
    - Clear confirmation of what you're doing
    - Questions to gather missing information
    - Results of searches or actions
    
    Current context: ${JSON.stringify(history.slice(-5))}`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: transcript },
        ],
        model: 'llama3-70b-8192',
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse = completion.choices[0]?.message?.content || '';

      // Update conversation history
      history.push(
        { role: 'user', content: transcript },
        { role: 'assistant', content: aiResponse },
      );
      this.conversationHistory.set(sessionId, history);

      // Parse intent and execute action
      const action = await this.parseIntentAndExecute(transcript, aiResponse);

      return {
        response: aiResponse,
        ...action,
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      return {
        response: 'I apologize, but I encountered an error processing your request. Please try again.',
      };
    }
  }

  private async parseIntentAndExecute(
    transcript: string,
    aiResponse: string,
  ): Promise<{ action?: string; data?: any }> {
    const lowerTranscript = transcript.toLowerCase();

    // Create order intent
    if (lowerTranscript.includes('create') && lowerTranscript.includes('order')) {
      // Extract order details from AI response
      const orderData = this.extractOrderData(aiResponse);
      if (orderData.isComplete) {
        const order = await this.orderService.create(orderData);
        return { action: 'ORDER_CREATED', data: order };
      }
    }

    // Search orders intent
    if (lowerTranscript.includes('search') || lowerTranscript.includes('find')) {
      const searchCriteria = this.extractSearchCriteria(transcript);
      const orders = await this.orderService.search(searchCriteria);
      return { action: 'ORDERS_FOUND', data: orders };
    }

    // Generate PDF intent
    if (lowerTranscript.includes('pdf') || lowerTranscript.includes('report')) {
      const orderId = this.extractOrderId(transcript);
      if (orderId) {
        const pdfUrl = await this.pdfService.generateOrderPdf(orderId);
        return { action: 'PDF_GENERATED', data: { url: pdfUrl } };
      }
    }

    return {};
  }

  private extractOrderData(text: string): any {
    // Simple extraction logic - enhance as needed
    const patterns = {
      glassType: /(?:tempered|laminated|frosted|clear)\s+glass/i,
      quantity: /(\d+)\s+(?:pieces?|panels?|units?)/i,
      dimensions: /(\d+)\s*x\s*(\d+)\s*(?:mm|cm|inches?)/i,
      customer: /customer\s+(?:name\s+)?(?:is\s+)?([A-Za-z\s]+)/i,
    };

    return {
      glassType: text.match(patterns.glassType)?.[0] || null,
      quantity: parseInt(text.match(patterns.quantity)?.[1] || '0'),
      dimensions: text.match(patterns.dimensions)?.slice(1, 3) || null,
      customerName: text.match(patterns.customer)?.[1]?.trim() || null,
      isComplete: false, // Set based on required fields
    };
  }

  private extractSearchCriteria(text: string): any {
    // Extract search criteria from voice command
    return {
      customerName: text.match(/customer\s+([A-Za-z\s]+)/i)?.[1],
      dateRange: text.includes('today') ? 'today' : 
                 text.includes('week') ? 'week' : null,
      orderId: text.match(/order\s+#?(\d+)/i)?.[1],
    };
  }

  private extractOrderId(text: string): string | null {
    const match = text.match(/order\s+#?(\d+)/i);
    return match ? match[1] : null;
  }

  clearSession(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }
}
```

### 2.4 WebSocket Gateway

```typescript name=apps/api/src/voice/voice.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { VoiceService } from './voice.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  },
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private voiceService: VoiceService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.emit('connected', { sessionId: client.id });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.voiceService.clearSession(client.id);
  }

  @SubscribeMessage('voice-command')
  async handleVoiceCommand(
    @MessageBody() data: { transcript: string },
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.voiceService.processVoiceCommand(
      data.transcript,
      client.id,
    );

    client.emit('voice-response', result);
  }
}
```

### 2.5 PDF Service

```typescript name=apps/api/src/pdf/pdf.service.ts
import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OrderService } from '../order/order.service';

@Injectable()
export class PdfService {
  constructor(private orderService: OrderService) {}

  async generateOrderPdf(orderId: string): Promise<string> {
    const order = await this.orderService.findOne(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    const html = this.generateOrderHtml(order);
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });

      // Save PDF
      const fileName = `order-${orderId}-${Date.now()}.pdf`;
      const filePath = path.join(process.env.PDF_STORAGE_PATH || './temp/pdfs', fileName);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, pdf);

      return `/api/pdf/${fileName}`;
    } finally {
      await browser.close();
    }
  }

  private generateOrderHtml(order: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .header { text-align: center; margin-bottom: 30px; }
            .order-details { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Glass Order #${order.id}</h1>
            <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div class="order-details">
            <h2>Customer Information</h2>
            <p>Name: ${order.customerName}</p>
            <p>Contact: ${order.customerContact || 'N/A'}</p>
          </div>
          
          <div class="order-details">
            <h2>Order Items</h2>
            <table>
              <tr>
                <th>Glass Type</th>
                <th>Dimensions</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
              ${order.items.map(item => `
                <tr>
                  <td>${item.glassType}</td>
                  <td>${item.width}x${item.height} ${item.unit}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.unitPrice}</td>
                  <td>$${item.totalPrice}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          <div class="order-details">
            <h3>Total Amount: $${order.totalAmount}</h3>
          </div>
        </body>
      </html>
    `;
  }
}
```

## Step 3: Frontend Implementation

### 3.1 Install Frontend Dependencies

```bash
# In apps/web directory
npm install socket.io-client
npm install --save-dev @types/webspeechapi
```

### 3.2 Voice Interface Component

```tsx name=apps/web/src/components/VoiceInterface.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, Paper, Typography, Chip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import { io, Socket } from 'socket.io-client';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

export const VoiceInterface: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    socketRef.current = io(import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000');
    
    socketRef.current.on('connected', (data) => {
      console.log('Connected with session:', data.sessionId);
    });

    socketRef.current.on('voice-response', (data) => {
      setResponse(data.response);
      setStatus('speaking');
      speakResponse(data.response);
      
      // Handle actions
      if (data.action === 'ORDER_CREATED') {
        console.log('Order created:', data.data);
        // Trigger UI update or notification
      }
    });

    // Initialize Speech Recognition
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.results[event.results.length - 1];
        const transcriptText = current[0].transcript;
        
        setTranscript(transcriptText);
        
        if (current.isFinal) {
          sendVoiceCommand(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setStatus('idle');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (status === 'listening') {
          setStatus('processing');
        }
      };
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setStatus('listening');
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const sendVoiceCommand = (text: string) => {
    if (socketRef.current && text.trim()) {
      setStatus('processing');
      socketRef.current.emit('voice-command', { transcript: text });
    }
  };

  const speakResponse = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      setStatus('idle');
    };
    window.speechSynthesis.speak(utterance);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening': return 'error';
      case 'processing': return 'warning';
      case 'speaking': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'speaking': return 'Speaking...';
      default: return 'Click to speak';
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        p: 2,
        width: 350,
        maxHeight: 400,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton
          size="large"
          color={isListening ? 'error' : 'primary'}
          onClick={isListening ? stopListening : startListening}
          disabled={status === 'processing' || status === 'speaking'}
        >
          {isListening ? <MicOffIcon /> : <MicIcon />}
        </IconButton>
        <Chip
          label={getStatusText()}
          color={getStatusColor()}
          size="small"
          sx={{ ml: 2 }}
        />
      </Box>

      {transcript && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            You said:
          </Typography>
          <Typography variant="body2">{transcript}</Typography>
        </Box>
      )}

      {response && (
        <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
          <Typography variant="caption" color="text.secondary">
            Assistant:
          </Typography>
          <Typography variant="body2">{response}</Typography>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Try saying:
        </Typography>
        <Typography variant="caption" display="block">
          • "Create a new order for 10 tempered glass panels"
        </Typography>
        <Typography variant="caption" display="block">
          • "Search orders from last week"
        </Typography>
        <Typography variant="caption" display="block">
          • "Generate PDF for order 123"
        </Typography>
      </Box>
    </Paper>
  );
};
```

### 3.3 Integration with Main App

```tsx name=apps/web/src/App.tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import { AppRoutes } from './routes';
import { VoiceInterface } from './components/VoiceInterface';

const queryClient = new QueryClient();

function App() {
  const voiceEnabled = import.meta.env.VITE_ENABLE_VOICE === 'true';

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AppRoutes />
          {voiceEnabled && <VoiceInterface />}
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
```

## Step 4: API Integration Updates

### 4.1 Update Main Module

```typescript name=apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { OrderModule } from './order/order.module';
import { VoiceModule } from './voice/voice.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    OrderModule,
    VoiceModule,
    PdfModule,
  ],
})
export class AppModule {}
```

## Step 5: Getting API Keys

### 5.1 Groq API Key (FREE)
1. Go to https://console.groq.com
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste into .env file

### 5.2 OpenAI API Key (Optional - for Whisper)
1. Go to https://platform.openai.com
2. Sign up/login
3. Navigate to API Keys
4. Create new secret key
5. Copy and paste into .env file

## Step 6: Testing the Implementation

### 6.1 Start Backend
```bash
cd apps/api
npm run start:dev
```

### 6.2 Start Frontend
```bash
cd apps/web
npm run dev
```

### 6.3 Test Voice Commands
1. Open Chrome/Edge browser
2. Navigate to http://localhost:5173
3. Click the microphone button
4. Try these commands:
   - "Create a new order for 5 tempered glass panels"
   - "Search orders from customer John Doe"
   - "Generate PDF for order 123"

## Step 7: Deployment Considerations

### 7.1 HTTPS Required
- Web Speech API requires HTTPS in production
- Use SSL certificates for deployment

### 7.2 Environment Variables
- Ensure all API keys are set in production
- Use secure key management

### 7.3 Performance
- Implement caching for frequently accessed data
- Use connection pooling for database
- Implement rate limiting for AI API calls

## Troubleshooting

### Common Issues:
1. **Microphone not working**: Check browser permissions
2. **AI responses slow**: Consider caching common queries
3. **WebSocket connection fails**: Check CORS settings
4. **PDF generation fails**: Ensure Puppeteer dependencies installed

## Next Steps
1. Add more sophisticated intent recognition
2. Implement multi-language support
3. Add voice authentication
4. Create custom wake word detection
5. Implement offline mode with local models
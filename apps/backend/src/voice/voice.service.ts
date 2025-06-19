import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { NaturalConversationService } from './natural-conversation.service';

@Injectable()
export class VoiceService {
  private conversationHistory: Map<string, any[]> = new Map();

  constructor(
    private ordersService: OrdersService,
    public naturalConversationService: NaturalConversationService,
  ) {}

  async processVoiceCommand(
    transcript: string,
    sessionId: string,
    options?: {
      isEndOfSpeech?: boolean;
      interimResults?: boolean;
      useNaturalConversation?: boolean;
    }
  ): Promise<{
    response: string;
    action?: string;
    data?: any;
    shouldSpeak?: boolean;
    fillerWord?: string;
    isThinking?: boolean;
    confidence?: number;
  }> {
    const {
      isEndOfSpeech = true,
      interimResults = false,
      useNaturalConversation = process.env.AI_RESPONSE_STYLE === 'conversational_telephonic'
    } = options || {};

    // Use natural conversation service if enabled
    if (useNaturalConversation) {
      const naturalResponse = await this.naturalConversationService.processNaturalSpeech(
        transcript,
        sessionId,
        isEndOfSpeech,
        interimResults
      );

      return {
        response: naturalResponse.text,
        action: naturalResponse.action,
        data: naturalResponse.data,
        shouldSpeak: naturalResponse.shouldSpeak,
        fillerWord: naturalResponse.fillerWord,
        isThinking: naturalResponse.isThinking,
        confidence: naturalResponse.confidence,
      };
    }

    // Fallback to original voice processing
    return await this.processVoiceCommandOriginal(transcript, sessionId);
  }

  async processVoiceCommandOriginal(
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
      // Fallback to simple pattern matching for basic functionality
      const aiResponse = this.generateFallbackResponse(transcript);

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

    // Search orders intent
    if (lowerTranscript.includes('search') || lowerTranscript.includes('find')) {
      const searchCriteria = this.extractSearchCriteria(transcript);
      const orders = await this.ordersService.findAll();
      // Filter orders based on criteria
      const filteredOrders = this.filterOrders(orders, searchCriteria);
      return { action: 'ORDERS_FOUND', data: filteredOrders };
    }

    // Generate PDF intent
    if (lowerTranscript.includes('pdf') || lowerTranscript.includes('report')) {
      const orderId = this.extractOrderId(transcript);
      if (orderId) {
        // For now, return a placeholder response
        return { action: 'PDF_REQUESTED', data: { orderId, message: 'PDF generation requested' } };
      }
    }

    return {};
  }

  private filterOrders(orders: any[], criteria: any): any[] {
    return orders.filter(order => {
      if (criteria.customerId && order.customerId !== criteria.customerId) {
        return false;
      }
      if (criteria.orderId && order.id !== criteria.orderId) {
        return false;
      }
      if (criteria.dateRange) {
        const orderDate = new Date(order.orderDate);
        const today = new Date();
        if (criteria.dateRange === 'today') {
          return orderDate.toDateString() === today.toDateString();
        }
        if (criteria.dateRange === 'week') {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= weekAgo;
        }
      }
      return true;
    });
  }

  private extractSearchCriteria(text: string): any {
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

  /**
   * Generate fallback response using simple pattern matching
   */
  private generateFallbackResponse(transcript: string): string {
    const lower = transcript.toLowerCase();
    
    if (lower.includes('hello') || lower.includes('hi')) {
      return "Hello! I'm here to help you with your glass orders. What can I do for you?";
    }
    
    if (lower.includes('order') && (lower.includes('new') || lower.includes('create'))) {
      return "I can help you create a new order. What type of glass do you need?";
    }
    
    if (lower.includes('status') || lower.includes('check')) {
      return "I can check your order status. Could you provide the order number?";
    }
    
    if (lower.includes('goodbye') || lower.includes('bye')) {
      return "Thank you for using OrderOverView. Have a great day!";
    }
    
    return "I understand you need help with glass orders. Could you be more specific about what you'd like to do?";
  }

  clearSession(sessionId: string): void {
    console.log(`🧹 Clearing session ${sessionId}`);
    this.conversationHistory.delete(sessionId);
    this.naturalConversationService?.clearSession?.(sessionId);
  }
}

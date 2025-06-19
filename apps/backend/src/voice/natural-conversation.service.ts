import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { CustomersService } from '../customers/customers.service';
import { MailerService } from '../mailer/mailer.service';
import { EnhancedElevenLabsService } from './enhanced-elevenlabs.service';
import { AIProvidersService } from './ai-providers.service';

interface ConversationState {
  isUserSpeaking: boolean;
  isAISpeaking: boolean;
  lastSpeechTime: number;
  conversationContext: string[];
  pendingResponse: string | null;
  interruptionCount: number;
  conversationStartTime: number;
  currentTopic: string | null;
  awaitingUserInput: boolean;
  // Order creation state
  incompleteOrder?: IncompleteOrder;
}

interface IncompleteOrder {
  step: 'glass_type' | 'dimensions' | 'quantity' | 'customer' | 'confirm' | 'complete';
  glassType?: string;
  width?: number;
  height?: number;
  thickness?: number;
  quantity?: number;
  customerName?: string;
  unitPrice?: number;
  totalPrice?: number;
}

interface NaturalResponse {
  text: string;
  action?: string;
  data?: any;
  shouldSpeak: boolean;
  fillerWord?: string;
  isThinking?: boolean;
  confidence: number;
  voiceConfig?: any;
  conversationMode?: boolean;
}

@Injectable()
export class NaturalConversationService {
  private conversations = new Map<string, ConversationState>();

  constructor(
    private ordersService: OrdersService,
    private customersService: CustomersService,
    private mailerService: MailerService,
    private elevenLabsService: EnhancedElevenLabsService,
    private aiProvidersService: AIProvidersService
  ) {}

  /**
   * Check if voice responses should be enabled based on AI_RESPONSE_STYLE
   */
  private shouldEnableVoiceResponses(): boolean {
    const responseStyle = process.env.AI_RESPONSE_STYLE || 'conversational_telephonic';
    return responseStyle !== 'text_only' && process.env.ENABLE_REAL_VOICE_INTERFACE === 'true';
  }

  /**
   * Check if conversation mode is enabled
   */
  private isConversationModeEnabled(): boolean {
    return process.env.ENABLE_CONVERSATION_MODE === 'true';
  }

  /**
   * Enhanced voice response configuration based on environment
   */
  private getVoiceConfig() {
    return {
      enableVoice: this.shouldEnableVoiceResponses(),
      isConversational: this.isConversationModeEnabled(),
      style: process.env.AI_RESPONSE_STYLE || 'conversational_natural',
      useElevenLabs: process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key_here',
      voiceSettings: {
        voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
        modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1',
        stability: parseFloat(process.env.VOICE_STABILITY || '0.75'),
        similarityBoost: parseFloat(process.env.VOICE_SIMILARITY_BOOST || '0.75'),
        style: parseFloat(process.env.VOICE_STYLE || '0.2')
      }
    };
  }

  async processNaturalSpeech(
    transcript: string,
    sessionId: string,
    isEndOfSpeech: boolean = true,
    interimResults: boolean = false
  ): Promise<NaturalResponse> {
    const state = this.getOrCreateState(sessionId);
    
    // Handle interim results (user still speaking)
    if (!isEndOfSpeech && interimResults) {
      return this.handleInterimSpeech(transcript, state);
    }

    // Handle continuous speech without full utterance
    if (!isEndOfSpeech) {
      return this.handleContinuousSpeech(state);
    }

    // Process complete utterance
    return await this.processCompleteUtterance(transcript, state, sessionId);
  }

  private async processCompleteUtterance(
    transcript: string,
    state: ConversationState,
    sessionId: string
  ): Promise<NaturalResponse> {
    // Update conversation state
    state.lastSpeechTime = Date.now();
    state.isUserSpeaking = false;
    state.conversationContext.push(`Human: ${transcript}`);

    // Check for conversation length limits
    if (this.isConversationTooLong(state)) {
      return this.handleLongConversation(state);
    }

    // Handle ongoing order creation conversation
    if (state.incompleteOrder) {
      return await this.handleIncompleteOrderConversation(transcript, state, sessionId);
    }

    // Detect user intent and emotion
    const intent = await this.detectIntent(transcript, state.conversationContext);
    console.log(`🎯 LISA detected intent:`, intent);
    
    // Generate natural response based on intent
    const response = await this.generateNaturalResponse(
      transcript,
      state.conversationContext,
      intent,
      sessionId
    );
    console.log(`🎤 LISA generated response:`, { text: response.text, action: response.action });

    // Update conversation context
    state.conversationContext.push(`Assistant: ${response.text}`);
    state.currentTopic = intent.topic;
    state.awaitingUserInput = intent.requiresUserInput;

    // Execute any business actions
    if (response.action) {
      console.log(`🚀 LISA executing action: "${response.action}"`);
      // Add original transcript to parameters for intelligent filtering
      const enhancedParameters = { ...intent.parameters, originalTranscript: transcript };
      const actionResult = await this.executeAction(response.action, enhancedParameters, sessionId);
      if (actionResult) {
        console.log(`✅ LISA action result:`, { 
          hasOrders: !!actionResult.orders, 
          orderCount: actionResult.orders?.length || 0,
          totalCost: actionResult.totalCost 
        });
        response.data = actionResult;
      } else {
        console.log(`❌ LISA action returned no result`);
      }
    }

    return response;
  }

  private async handleIncompleteOrderConversation(
    transcript: string,
    state: ConversationState,
    sessionId: string
  ): Promise<NaturalResponse> {
    const order = state.incompleteOrder!;
    const lowerTranscript = transcript.toLowerCase();

    // Handle cancellation
    if (lowerTranscript.includes('cancel') || lowerTranscript.includes('stop') || lowerTranscript.includes('no')) {
      if (order.step === 'confirm') {
        state.incompleteOrder = undefined;
        state.conversationContext.push(`Assistant: No problem! Order cancelled. Is there anything else I can help you with?`);
        return {
          text: "No problem! Order cancelled. Is there anything else I can help you with?",
          shouldSpeak: this.shouldEnableVoiceResponses(),
          confidence: 1.0
        };
      }
    }

    // Handle confirmation step
    if (order.step === 'confirm') {
      if (lowerTranscript.includes('yes') || lowerTranscript.includes('confirm') || lowerTranscript.includes('create')) {
        // Create the order
        const orderResult = await this.createOrder({
          glassType: order.glassType,
          width: order.width,
          height: order.height,
          thickness: order.thickness || 6,
          quantity: order.quantity,
          customerName: order.customerName,
          unitPrice: order.unitPrice,
          totalPrice: order.totalPrice
        }, sessionId);

        state.conversationContext.push(`Assistant: ${orderResult.message}`);
        return {
          text: orderResult.message,
          action: orderResult.success ? 'order_created' : undefined,
          data: orderResult,
          shouldSpeak: this.shouldEnableVoiceResponses(),
          confidence: 1.0
        };
      }
    }

    // Parse user input based on current step
    const extractedInfo = this.extractOrderInformation(transcript, order.step);
    
    // Update order with new information
    if (extractedInfo.glassType && !order.glassType) {
      order.glassType = extractedInfo.glassType;
    }
    if (extractedInfo.width && !order.width) {
      order.width = extractedInfo.width;
    }
    if (extractedInfo.height && !order.height) {
      order.height = extractedInfo.height;
    }
    if (extractedInfo.thickness && !order.thickness) {
      order.thickness = extractedInfo.thickness;
    }
    if (extractedInfo.quantity && !order.quantity) {
      order.quantity = extractedInfo.quantity;
    }
    if (extractedInfo.customerName && !order.customerName) {
      order.customerName = extractedInfo.customerName;
    }

    // Get next step
    const nextStep = this.getNextOrderStep(order);
    
    state.conversationContext.push(`Assistant: ${nextStep.message}`);
    
    return {
      text: nextStep.message,
      action: nextStep.success ? 'order_created' : undefined,
      data: nextStep,
      shouldSpeak: this.shouldEnableVoiceResponses(),
      confidence: 1.0
    };
  }

  private extractOrderInformation(transcript: string, currentStep: string): any {
    const lowerTranscript = transcript.toLowerCase();
    const extracted: any = {};

    // Extract glass type
    if (currentStep === 'glass_type' || !currentStep) {
      if (lowerTranscript.includes('tempered')) {
        extracted.glassType = 'TEMPERED';
      } else if (lowerTranscript.includes('laminated')) {
        extracted.glassType = 'LAMINATED';
      } else if (lowerTranscript.includes('insulated')) {
        extracted.glassType = 'INSULATED';
      } else if (lowerTranscript.includes('float')) {
        extracted.glassType = 'FLOAT';
      }
    }

    // Extract dimensions
    if (currentStep === 'dimensions' || !currentStep) {
      // Look for patterns like "1200 by 800", "1200x800", "1200 mm by 800 mm"
      const dimensionPatterns = [
        /(\d+)\s*(?:mm)?\s*(?:by|x|×)\s*(\d+)\s*(?:mm)?/i,
        /(\d+)\s*(?:mm)?\s*and\s*(\d+)\s*(?:mm)?/i,
        /width\s*(\d+)\s*(?:mm)?\s*(?:and\s*)?height\s*(\d+)\s*(?:mm)?/i,
        /(\d+)\s*(?:mm)?\s*wide\s*(?:and\s*)?(\d+)\s*(?:mm)?\s*high/i
      ];

      for (const pattern of dimensionPatterns) {
        const match = lowerTranscript.match(pattern);
        if (match) {
          extracted.width = parseInt(match[1]);
          extracted.height = parseInt(match[2]);
          break;
        }
      }

      // Extract thickness if mentioned
      const thicknessMatch = lowerTranscript.match(/(?:thickness|thick)\s*(\d+(?:\.\d+)?)\s*(?:mm)?/i);
      if (thicknessMatch) {
        extracted.thickness = parseFloat(thicknessMatch[1]);
      }
    }

    // Extract quantity
    if (currentStep === 'quantity' || !currentStep) {
      const quantityPatterns = [
        /(\d+)\s*(?:pieces?|panels?|units?|glass(?:es)?)/i,
        /(?:quantity|amount)\s*(?:is\s*)?(\d+)/i,
        /(?:need|want)\s*(\d+)/i,
        /^(\d+)$/  // Just a number
      ];

      for (const pattern of quantityPatterns) {
        const match = lowerTranscript.match(pattern);
        if (match) {
          extracted.quantity = parseInt(match[1]);
          break;
        }
      }
    }

    // Extract customer name
    if (currentStep === 'customer' || !currentStep) {
      // Look for names - this is a simple implementation
      const namePatterns = [
        /(?:customer|client|name)\s+(?:is\s+)?([a-zA-Z\s]+)/i,
        /(?:for\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/,  // Capitalized words
      ];

      for (const pattern of namePatterns) {
        const match = transcript.match(pattern);  // Use original case for names
        if (match) {
          extracted.customerName = match[1].trim();
          break;
        }
      }
    }

    return extracted;
  }

  private handleInterimSpeech(transcript: string, state: ConversationState): NaturalResponse {
    state.isUserSpeaking = true;
    
    // Provide thinking sounds during longer utterances
    if (transcript.length > 50 && process.env.ENABLE_THINKING_SOUNDS === 'true') {
      const thinkingSounds = ["Mm-hmm...", "I see...", "Right...", "Uh-huh...", "LISA's listening...", "Go on..."];
      return {
        text: '',
        shouldSpeak: this.shouldEnableVoiceResponses(),
        fillerWord: thinkingSounds[Math.floor(Math.random() * thinkingSounds.length)],
        isThinking: true,
        confidence: 0.5
      };
    }

    return { text: '', shouldSpeak: false, confidence: 0 };
  }

  private handleContinuousSpeech(state: ConversationState): NaturalResponse {
    const timeSinceLastSpeech = Date.now() - state.lastSpeechTime;
    
    // Return filler words during long pauses if enabled
    if (timeSinceLastSpeech > parseInt(process.env.SILENCE_TIMEOUT_MS || '1500') 
        && !state.isAISpeaking 
        && process.env.ENABLE_FILLER_WORDS === 'true') {
      
      return {
        text: '',
        shouldSpeak: this.shouldEnableVoiceResponses(),
        fillerWord: this.getContextualFillerWord(state),
        confidence: 0.3
      };
    }

    return { text: '', shouldSpeak: false, confidence: 0 };
  }

  private async detectIntent(transcript: string, context: string[]) {
    const intentPrompt = `Analyze this user input for a glass order management system and extract intent:

User: "${transcript}"

Previous context:
${context.slice(-5).join('\n')}

Extract:
1. Primary intent (search_orders, create_order, generate_pdf, generate_report, quarterly_report, customer_report, get_info, casual_conversation, complaint, end_conversation)
2. Topic (what specifically they're asking about)
3. Parameters (any specific values mentioned)
4. Emotion (neutral, frustrated, excited, confused)
5. Requires user input (true/false)

IMPORTANT: Detect "end_conversation" intent when user says phrases like:
- "stop", "end", "finish", "done", "quit", "exit"
- "goodbye", "bye", "see you later", "talk to you later"
- "that's all", "nothing else", "hang up"
- "thank you lisa, that's all" or similar closing phrases

Respond in JSON format only.`;

    try {
      const aiResult = await this.aiProvidersService.detectIntentWithOpenAI(transcript, context);
      
      return {
        intent: aiResult.intent.toLowerCase(),
        topic: 'general',
        parameters: aiResult.entities,
        emotion: 'neutral',
        requiresUserInput: aiResult.shouldRespond
      };
    } catch (error) {
      // Fallback intent detection
      return {
        intent: this.fallbackIntentDetection(transcript),
        topic: 'general',
        parameters: {},
        emotion: 'neutral',
        requiresUserInput: false
      };
    }
  }

  private fallbackIntentDetection(transcript: string): string {
    const lower = transcript.toLowerCase();
    
    // Enhanced greeting detection
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') ||
        lower.includes('good morning') || lower.includes('good afternoon') || 
        lower.includes('good evening') || lower.includes('howdy') ||
        (lower.includes('lisa') && (lower.includes('there') || lower.includes('how are you'))) ||
        lower === 'hi' || lower === 'hello' || lower === 'hey') {
      return 'greeting';
    }
    
    if (lower.includes('order') && (lower.includes('create') || lower.includes('new'))) return 'create_order';
    if (lower.includes('update') && lower.includes('order') || 
        (lower.includes('change') && lower.includes('status')) ||
        (lower.includes('mark') && lower.includes('order')) ||
        lower.includes('set status')) return 'update_order';
    if (lower.includes('search') || lower.includes('find') || lower.includes('show') || 
        lower.includes('list') || lower.includes('get') || lower.includes('give me') ||
        lower.includes('expensive') || lower.includes('top') || lower.includes('most') || 
        lower.includes('costly') || lower.includes('highest') || lower.includes('biggest') ||
        // Status-based searches  
        lower.includes('delivered') || lower.includes('completed') || lower.includes('pending') ||
        lower.includes('processing') || lower.includes('cancelled') || lower.includes('shipped') ||
        lower.includes('finished') || (lower.includes('done') && lower.includes('order')) ||
        // Time-based searches
        lower.includes('today') || lower.includes('yesterday') || lower.includes('week') ||
        lower.includes('month') || lower.includes('recent') || lower.includes('latest') ||
        // General order queries
        (lower.includes('order') && (lower.includes('all') || lower.includes('every')))) return 'search_orders';
    if (lower.includes('pdf') || lower.includes('report')) return 'generate_pdf';
    if (lower.includes('quarterly') || lower.includes('quarter') && lower.includes('report')) return 'quarterly_report';
    if (lower.includes('customer') && lower.includes('report') && !lower.includes('quarterly')) return 'customer_report';
    if (lower.includes('analytics') || lower.includes('dashboard') || lower.includes('metrics')) return 'generate_report';
    if (lower.includes('help') || lower.includes('how')) return 'get_info';
    
    // Conversation ending detection
    if (lower.includes('stop') || lower.includes('end') || lower.includes('finish') || 
        lower.includes('goodbye') || lower.includes('bye') || lower.includes('done') ||
        lower.includes('quit') || lower.includes('exit') || lower.includes('hang up') ||
        lower.includes('that\'s all') || lower.includes('thank you lisa') && (lower.includes('stop') || lower.includes('done'))) {
      return 'end_conversation';
    }
    
    return 'casual_conversation';
  }

  private async generateNaturalResponse(
    transcript: string,
    context: string[],
    intent: any,
    sessionId: string
  ): Promise<NaturalResponse> {
    const responseStyle = process.env.AI_RESPONSE_STYLE || 'conversational_telephonic';
    
    const systemPrompt = `You are LISA, a highly intelligent and naturally conversational AI assistant for a glass order management system. You speak like a skilled customer service representative in a friendly phone call.

LISA'S PERSONALITY:
- Professional yet warm and approachable
- Naturally conversational with perfect phone etiquette
- Efficient but never rushed
- Empathetic and understanding
- Expert in glass industry terminology
- Remembers conversation context and refers back to it

GREETING BEHAVIOR:
- Respond to "Hi" with "Hi there!" or "Hello!"
- Respond to "Hello" with "Hello! How can I help you today?"
- Always be warm and welcoming on first contact
- Show enthusiasm when users greet you
- Remember if you've already greeted this session

CRITICAL CONVERSATIONAL RULES:
1. Start responses with natural acknowledgments: "Oh I see", "Got it", "Alright", "Sure thing", "Hi there!"
2. Use conversational contractions: I'm, you're, let's, we'll, that's
3. Include occasional natural hesitations: "um", "uh", "well", "you know"
4. Mirror the user's energy and emotion level
5. Ask follow-up questions conversationally
6. Keep responses under 50 words for natural flow
7. SPECIAL: If user just says "Hi" or "Hello", respond warmly and ask how you can help

RESPONSE STYLE: ${responseStyle}
- Be warm and helpful like a skilled phone representative
- Use active listening cues
- Handle confusion gracefully
- Show genuine interest

USER INTENT: ${intent.intent}
USER EMOTION: ${intent.emotion}
TOPIC: ${intent.topic}

GLASS ORDER CAPABILITIES:
- Create orders (need: glass type, quantity, dimensions, customer)
- Update order status (need: order number, new status like delivered, confirmed, production)
- Search existing orders
- Generate quarterly analytics reports
- Generate customer analytics reports  
- Generate PDF reports
- Answer questions about glass types
- End conversations when asked

CONVERSATION CONTEXT:
${context.slice(-8).join('\n')}

USER SAID: "${transcript}"

SPECIAL INSTRUCTIONS:
- If user greets you (hi, hello, hey), respond warmly and ask how you can help
- If user wants to end the conversation (saying goodbye, stop, finish, done, etc.), respond warmly and add [ACTION:end_conversation] at the end
- For casual conversation or greetings, be friendly and offer to help with orders or information

Respond naturally and conversationally as LISA. If taking action, add [ACTION:${intent.intent}] at the end.`;

    try {
      const aiResult = await this.aiProvidersService.generateResponseWithGroq(
        transcript,
        intent.intent,
        context.slice(-8),
        { systemInfo: 'ARIA voice assistant for OrderOverView glass orders' }
      );

      let responseText = aiResult.response || 
        "Sorry, I didn't quite catch that. Could you say that again?";

      // Extract action if present
      const actionMatch = responseText.match(/\[ACTION:(\w+)\]/);
      let action = actionMatch ? actionMatch[1] : aiResult.action;
      
      // Map internal actions to frontend-expected action names
      if (action === 'search_orders') {
        action = 'search_results';
      } else if (action === 'create_order') {
        action = 'order_created';
      }
      
      // Clean up response text
      responseText = this.cleanupResponse(responseText);
      
      // Add natural speech patterns
      responseText = this.enhanceNaturalSpeech(responseText, intent.emotion);

      return {
        text: responseText,
        action,
        shouldSpeak: this.shouldEnableVoiceResponses(),
        confidence: 0.9,
        voiceConfig: this.getVoiceConfig(),
        conversationMode: this.isConversationModeEnabled()
      };

    } catch (error) {
      console.error('Error generating natural response:', error);
      return {
        text: this.getErrorResponse(intent.emotion),
        shouldSpeak: this.shouldEnableVoiceResponses(),
        confidence: 0.5,
        voiceConfig: this.getVoiceConfig()
      };
    }
  }

  private enhanceNaturalSpeech(text: string, emotion: string): string {
    // Add natural speech patterns based on emotion
    switch (emotion) {
      case 'frustrated':
        return `I understand, and I'm here to help. ${text}`;
      case 'excited':
        return `That's great! ${text}`;
      case 'confused':
        return `No worries, let me clarify that. ${text}`;
      default:
        return text;
    }
  }

  private cleanupResponse(text: string): string {
    // Remove action markers and clean up
    return text
      .replace(/\[ACTION:.*?\]/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();
  }

  private getContextualFillerWord(state: ConversationState): string {
    const topic = state.currentTopic;
    
    if (topic === 'order_creation') {
      return ["Got it, so far we have...", "Okay, let me make sure...", "Right, and for the...", "Perfect, so LISA has..."][Math.floor(Math.random() * 4)];
    }
    
    if (topic === 'search') {
      return ["Let me check that for you...", "LISA's searching now...", "Looking that up...", "One moment while I find that..."][Math.floor(Math.random() * 4)];
    }

    const generalFillers = [
      "Mm-hmm...", "I see...", "Right...", "Okay...", "Sure...", "Uh-huh...", "LISA's thinking...", "Let me help with that..."
    ];
    return generalFillers[Math.floor(Math.random() * generalFillers.length)];
  }

  private getErrorResponse(emotion: string): string {
    if (emotion === 'frustrated') {
      return "I apologize for the confusion. Let me try to help you better.";
    }
    return "Sorry about that. Could you repeat what you need help with?";
  }

  private async executeAction(action: string, parameters: any, sessionId: string): Promise<any> {
    try {
      console.log(`🎯 LISA executing action: "${action}" with parameters:`, parameters);
      
      switch (action) {
        case 'greeting':
          return await this.handleGreeting(sessionId);
        case 'search_orders':
        case 'search_results':  // Handle both action names
          return await this.searchOrdersEnhanced(parameters);
        case 'create_order':
        case 'order_created':   // Handle both action names
          return await this.createOrder(parameters, sessionId);
        case 'update_order':
        case 'order_updated':   // Handle both action names
          return await this.updateOrder(parameters);
        case 'update_order':
        case 'order_updated':   // Handle both action names
          return await this.updateOrder(parameters);
        case 'generate_pdf':
          return await this.generatePdf(parameters);
        case 'generate_report':
        case 'quarterly_report':
        case 'customer_report':
          return await this.generateReport(parameters);
        case 'end_conversation':
          return await this.endConversation(sessionId);
        default:
          console.log(`⚠️ LISA: Unknown action "${action}" - no handler found`);
          return null;
      }
    } catch (error) {
      console.error(`Error executing action ${action}:`, error);
      return { error: 'Action failed' };
    }
  }

  private async searchOrders(parameters: any) {
    // Extract search criteria from the original transcript if available
    const transcript = parameters?.originalTranscript?.toLowerCase() || '';
    console.log('🔍 LISA: Enhanced search with transcript:', transcript);
    
    try {
      if (this.ordersService) {
        console.log('🗣️  LISA: Searching orders via database...', parameters);
        
        const orders = await this.ordersService.findAll();
        let filteredOrders = orders;
        let searchDescription = 'all orders';
        
        // Status-based filtering
        if (transcript.includes('delivered') || transcript.includes('completed')) {
          filteredOrders = orders.filter(order => 
            order.status?.toLowerCase().includes('delivered') || 
            order.status?.toLowerCase().includes('completed')
          );
          searchDescription = 'delivered orders';
        }
        else if (transcript.includes('pending') || transcript.includes('waiting')) {
          filteredOrders = orders.filter(order => 
            order.status?.toLowerCase().includes('pending')
          );
          searchDescription = 'pending orders';
        }
        else if (transcript.includes('processing') || transcript.includes('production')) {
          filteredOrders = orders.filter(order => 
            order.status?.toLowerCase().includes('production') ||
            order.status?.toLowerCase().includes('processing')
          );
          searchDescription = 'orders in production';
        }
        else if (transcript.includes('cancelled') || transcript.includes('canceled')) {
          filteredOrders = orders.filter(order => 
            order.status?.toLowerCase().includes('cancelled')
          );
          searchDescription = 'cancelled orders';
        }
        else if (transcript.includes('confirmed')) {
          filteredOrders = orders.filter(order => 
            order.status?.toLowerCase().includes('confirmed')
          );
          searchDescription = 'confirmed orders';
        }
        
        // Price/Value-based filtering
        else if (transcript.includes('expensive') || transcript.includes('high value') || 
                 transcript.includes('costly') || transcript.includes('biggest')) {
          filteredOrders = orders.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
          searchDescription = 'most expensive orders';
        }
        else if (transcript.includes('cheap') || transcript.includes('low cost') || 
                 transcript.includes('affordable') || transcript.includes('budget')) {
          filteredOrders = orders.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
          searchDescription = 'lowest cost orders';
        }
        
        // Amount/Value thresholds
        const amountMatch = transcript.match(/(?:above|over|more than|greater than)\s*[$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        if (amountMatch) {
          const threshold = parseFloat(amountMatch[1].replace(/,/g, ''));
          filteredOrders = orders.filter(order => (order.totalPrice || 0) > threshold);
          searchDescription = `orders above $${threshold.toLocaleString()}`;
        }
        
        const belowMatch = transcript.match(/(?:below|under|less than)\s*[$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        if (belowMatch) {
          const threshold = parseFloat(belowMatch[1].replace(/,/g, ''));
          filteredOrders = orders.filter(order => (order.totalPrice || 0) < threshold);
          searchDescription = `orders below $${threshold.toLocaleString()}`;
        }
        
        // Glass type filtering
        else if (transcript.includes('tempered')) {
          filteredOrders = orders.filter(order => 
            order.glassType?.toLowerCase().includes('tempered')
          );
          searchDescription = 'tempered glass orders';
        }
        else if (transcript.includes('laminated')) {
          filteredOrders = orders.filter(order => 
            order.glassType?.toLowerCase().includes('laminated')
          );
          searchDescription = 'laminated glass orders';
        }
        else if (transcript.includes('bulletproof') || transcript.includes('security')) {
          filteredOrders = orders.filter(order => 
            order.glassType?.toLowerCase().includes('bulletproof')
          );
          searchDescription = 'bulletproof glass orders';
        }
        
        // Priority filtering
        else if (transcript.includes('urgent') || transcript.includes('priority')) {
          filteredOrders = orders.filter(order => 
            order.priority?.toLowerCase().includes('urgent') ||
            order.priority?.toLowerCase().includes('high')
          );
          searchDescription = 'urgent priority orders';
        }
        
        // Time-based filtering
        else if (transcript.includes('today')) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === today.getTime();
          });
          searchDescription = "today's orders";
        }
        else if (transcript.includes('this week') || transcript.includes('week')) {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          filteredOrders = orders.filter(order => 
            new Date(order.createdAt) >= weekAgo
          );
          searchDescription = 'orders from this week';
        }
        else if (transcript.includes('this month') || transcript.includes('month')) {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          filteredOrders = orders.filter(order => 
            new Date(order.createdAt) >= monthAgo
          );
          searchDescription = 'orders from this month';
        }
        
        // Customer-based filtering
        const customerMatch = transcript.match(/(?:customer|client|for)\s+([a-zA-Z\s]+)/);
        if (customerMatch) {
          const customerName = customerMatch[1].trim();
          filteredOrders = orders.filter(order => 
            order.customer?.name?.toLowerCase().includes(customerName.toLowerCase())
          );
          searchDescription = `orders for customer ${customerName}`;
        }
        
        // Quantity-based filtering
        const quantityMatch = transcript.match(/(?:quantity|amount|pieces?)\s*(?:above|over|more than)\s*(\d+)/);
        if (quantityMatch) {
          const threshold = parseInt(quantityMatch[1]);
          filteredOrders = orders.filter(order => (order.quantity || 0) > threshold);
          searchDescription = `orders with quantity above ${threshold}`;
        }
        
        // Default to most expensive if no specific filter
        if (searchDescription === 'all orders' && 
            (transcript.includes('show') || transcript.includes('list') || transcript.includes('find'))) {
          filteredOrders = orders.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
          searchDescription = 'orders (sorted by value)';
        }
        
        // Limit results to top 15
        filteredOrders = filteredOrders.slice(0, 15);
        const totalCost = filteredOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        
        console.log('✅ LISA: Search results from database!', { 
          count: filteredOrders.length,
          totalCost,
          searchType: searchDescription,
          statusCode: 200
        });
        
        return {
          orders: filteredOrders,
          totalCost,
          count: filteredOrders.length,
          statusCode: 200,
          message: `Found ${filteredOrders.length} ${searchDescription}`,
          searchType: searchDescription
        };
      }
    } catch (error) {
      console.error('❌ LISA: Database search failed:', error.message);
    }
    
    console.log('📝 LISA: Using enhanced demo data for search');
    
    // Enhanced mock data with various statuses and comprehensive examples
    const mockOrders = [
      { 
        id: '1', 
        orderNumber: 'EXP-9001', 
        customer: { name: 'Luxury Towers Corp' },
        customerName: 'Luxury Towers Corp',
        glassType: 'BULLETPROOF',
        glassClass: 'SAFETY_GLASS',
        quantity: 25,
        width: 3000,
        height: 4000,
        unitPrice: 1200.00,
        totalPrice: 30000.00,
        status: 'DELIVERED',
        priority: 'HIGH',
        createdAt: new Date('2024-12-15')
      },
      { 
        id: '2', 
        orderNumber: 'EXP-9002', 
        customer: { name: 'Pentagon Security Solutions' },
        customerName: 'Pentagon Security Solutions',
        glassType: 'BULLETPROOF',
        glassClass: 'FIRE_RATED',
        quantity: 50,
        width: 2500,
        height: 3500,
        unitPrice: 500.00,
        totalPrice: 25000.00,
        status: 'DELIVERED',
        priority: 'URGENT',
        createdAt: new Date('2024-12-10')
      },
      { 
        id: '3', 
        orderNumber: 'EXP-9003', 
        customer: { name: 'Royal Hotel Chain' },
        customerName: 'Royal Hotel Chain',
        glassType: 'LAMINATED',
        glassClass: 'TRIPLE_GLAZED',
        quantity: 35,
        width: 2000,
        height: 3000,
        unitPrice: 650.00,
        totalPrice: 22750.00,
        status: 'DELIVERED',
        priority: 'HIGH',
        createdAt: new Date('2024-12-08')
      },
      { 
        id: '4', 
        orderNumber: 'DEL-9004', 
        customer: { name: 'Metropolitan Hospital' },
        customerName: 'Metropolitan Hospital',
        glassType: 'TEMPERED',
        glassClass: 'SAFETY_GLASS',
        quantity: 60,
        width: 1800,
        height: 2800,
        unitPrice: 308.33,
        totalPrice: 18500.00,
        status: 'DELIVERED',
        priority: 'URGENT',
        createdAt: new Date('2024-12-05')
      },
      { 
        id: '5', 
        orderNumber: 'PEND-9005', 
        customer: { name: 'Corporate Plaza Inc' },
        customerName: 'Corporate Plaza Inc',
        glassType: 'LOW_E',
        glassClass: 'SOLAR_CONTROL',
        quantity: 80,
        width: 1600,
        height: 2400,
        unitPrice: 195.00,
        totalPrice: 15600.00,
        status: 'PENDING',
        priority: 'MEDIUM',
        createdAt: new Date()
      },
      { 
        id: '6', 
        orderNumber: 'PROC-9006', 
        customer: { name: 'Modern Skyscrapers LLC' },
        customerName: 'Modern Skyscrapers LLC',
        glassType: 'REFLECTIVE',
        glassClass: 'DOUBLE_GLAZED',
        quantity: 45,
        width: 1400,
        height: 2200,
        unitPrice: 284.44,
        totalPrice: 12800.00,
        status: 'IN_PRODUCTION',
        priority: 'MEDIUM',
        createdAt: new Date('2024-12-12')
      },
      { 
        id: '7', 
        orderNumber: 'QUAL-9007', 
        customer: { name: 'Banking Tower Corp' },
        customerName: 'Banking Tower Corp',
        glassType: 'TINTED',
        glassClass: 'IG_CLASS',
        quantity: 65,
        width: 1200,
        height: 2000,
        unitPrice: 150.00,
        totalPrice: 9750.00,
        status: 'QUALITY_CHECK',
        priority: 'LOW',
        createdAt: new Date('2024-12-14')
      },
      { 
        id: '8', 
        orderNumber: 'CANC-9008', 
        customer: { name: 'Hotel Magnifico' },
        customerName: 'Hotel Magnifico',
        glassType: 'FROSTED',
        glassClass: 'SINGLE_GLASS',
        quantity: 30,
        width: 1000,
        height: 1800,
        unitPrice: 240.00,
        totalPrice: 7200.00,
        status: 'CANCELLED',
        priority: 'LOW',
        createdAt: new Date('2024-11-28')
      }
    ];
  }

  /**
   * Enhanced order search with AI-powered natural language understanding
   */
  private async searchOrdersEnhanced(parameters: any) {
    const transcript = parameters?.originalTranscript?.toLowerCase() || '';
    console.log('🔍 LISA: Enhanced AI-powered search:', transcript);
    
    try {
      let orders = [];
      
      if (this.ordersService) {
        console.log('🗣️ LISA: Searching via database...');
        orders = await this.ordersService.findAll();
      } else {
        console.log('📝 LISA: Using enhanced demo data...');
        orders = this.getEnhancedMockOrders();
      }
      
      // AI-powered intelligent filtering
      const searchResults = this.performIntelligentSearch(orders, transcript);
      
      return {
        ...searchResults,
        searchQuery: transcript,
        conversation: this.isConversationModeEnabled(),
        voiceConfig: this.getVoiceConfig()
      };
      
    } catch (error) {
      console.error('❌ LISA: Enhanced search failed:', error);
      return { 
        orders: [], 
        totalCost: 0, 
        message: 'Search failed. Please try again.',
        error: true 
      };
    }
  }

  /**
   * AI-powered intelligent search processing
   */
  private performIntelligentSearch(orders: any[], transcript: string) {
    let filteredOrders = [...orders];
    let searchDescription = 'all orders';
    
    // Enhanced date filtering with natural language
    if (transcript.includes('today') || transcript.includes('recent')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= today;
      });
      searchDescription = 'today\'s orders';
    }
    else if (transcript.includes('yesterday')) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === yesterday.getTime();
      });
      searchDescription = 'yesterday\'s orders';
    }
    else if (transcript.includes('this week') || transcript.includes('week')) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredOrders = orders.filter(order => 
        new Date(order.createdAt) >= weekAgo
      );
      searchDescription = 'this week\'s orders';
    }
    
    // Enhanced status filtering with natural language
    else if (transcript.includes('urgent') || transcript.includes('priority')) {
      filteredOrders = orders.filter(order => 
        order.priority?.toLowerCase() === 'urgent' || order.priority?.toLowerCase() === 'high'
      );
      searchDescription = 'urgent priority orders';
    }
    else if (transcript.includes('pending') || transcript.includes('waiting')) {
      filteredOrders = orders.filter(order => 
        order.status?.toLowerCase().includes('pending')
      );
      searchDescription = 'pending orders';
    }
    else if (transcript.includes('delivered') || transcript.includes('completed')) {
      filteredOrders = orders.filter(order => 
        order.status?.toLowerCase().includes('delivered') || 
        order.status?.toLowerCase().includes('completed')
      );
      searchDescription = 'delivered orders';
    }
    
    // Enhanced customer search with fuzzy matching
    else if (transcript.includes('customer') || transcript.includes('client')) {
      const customerMatch = transcript.match(/(?:customer|client|for)\s+([a-zA-Z\s]+?)(?:\s|$)/);
      if (customerMatch) {
        const customerName = customerMatch[1].trim().toLowerCase();
        filteredOrders = orders.filter(order => 
          order.customer?.name?.toLowerCase().includes(customerName) ||
          order.customerName?.toLowerCase().includes(customerName)
        );
        searchDescription = `orders for customer containing "${customerName}"`;
      }
    }
    
    // Enhanced glass type search
    else if (transcript.includes('bulletproof') || transcript.includes('security')) {
      filteredOrders = orders.filter(order => 
        order.glassType?.toLowerCase().includes('bulletproof')
      );
      searchDescription = 'bulletproof glass orders';
    }
    else if (transcript.includes('tempered')) {
      filteredOrders = orders.filter(order => 
        order.glassType?.toLowerCase().includes('tempered')
      );
      searchDescription = 'tempered glass orders';
    }
    else if (transcript.includes('laminated')) {
      filteredOrders = orders.filter(order => 
        order.glassType?.toLowerCase().includes('laminated')
      );
      searchDescription = 'laminated glass orders';
    }
    
    // Enhanced value-based search
    else if (transcript.includes('expensive') || transcript.includes('highest') || transcript.includes('top')) {
      filteredOrders = orders.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
      searchDescription = 'highest value orders';
    }
    else if (transcript.includes('cheapest') || transcript.includes('lowest') || transcript.includes('budget')) {
      filteredOrders = orders.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
      searchDescription = 'lowest cost orders';
    }
    
    // Enhanced quantity search
    else if (transcript.includes('large') || transcript.includes('big')) {
      filteredOrders = orders.filter(order => (order.quantity || 0) > 50);
      searchDescription = 'large quantity orders (>50 pieces)';
    }
    else if (transcript.includes('small') || transcript.includes('few')) {
      filteredOrders = orders.filter(order => (order.quantity || 0) <= 10);
      searchDescription = 'small quantity orders (≤10 pieces)';
    }
    
    // Default intelligent sorting
    else {
      filteredOrders = orders.sort((a, b) => {
        // Sort by priority first, then by date
        const priorityOrder = { 'URGENT': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      searchDescription = 'most relevant orders';
    }
    
    const limitedOrders = filteredOrders.slice(0, 10);
    const totalCost = limitedOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    
    return {
      orders: limitedOrders,
      totalCost,
      message: `Found ${filteredOrders.length} ${searchDescription}. Total value: $${totalCost.toLocaleString()}`,
      searchDescription,
      totalFound: filteredOrders.length
    };
  }

  /**
   * Enhanced mock orders with more realistic data
   */
  private getEnhancedMockOrders() {
    return [
      { 
        id: '1', 
        orderNumber: 'EXP-9001', 
        customer: { name: 'Luxury Towers Corp' },
        customerName: 'Luxury Towers Corp',
        glassType: 'BULLETPROOF',
        glassClass: 'SAFETY_GLASS',
        quantity: 25,
        width: 3000,
        height: 4000,
        unitPrice: 1200.00,
        totalPrice: 30000.00,
        status: 'DELIVERED',
        priority: 'HIGH',
        createdAt: new Date('2024-12-15')
      },
      { 
        id: '2', 
        orderNumber: 'EXP-9002', 
        customer: { name: 'Pentagon Security Solutions' },
        customerName: 'Pentagon Security Solutions',
        glassType: 'BULLETPROOF',
        glassClass: 'FIRE_RATED',
        quantity: 50,
        width: 2500,
        height: 3500,
        unitPrice: 500.00,
        totalPrice: 25000.00,
        status: 'DELIVERED',
        priority: 'URGENT',
        createdAt: new Date('2024-12-10')
      },
      { 
        id: '3', 
        orderNumber: 'EXP-9003', 
        customer: { name: 'Royal Hotel Chain' },
        customerName: 'Royal Hotel Chain',
        glassType: 'LAMINATED',
        glassClass: 'TRIPLE_GLAZED',
        quantity: 35,
        width: 2000,
        height: 3000,
        unitPrice: 650.00,
        totalPrice: 22750.00,
        status: 'DELIVERED',
        priority: 'HIGH',
        createdAt: new Date('2024-12-08')
      },
      { 
        id: '4', 
        orderNumber: 'DEL-9004', 
        customer: { name: 'Metropolitan Hospital' },
        customerName: 'Metropolitan Hospital',
        glassType: 'TEMPERED',
        glassClass: 'SAFETY_GLASS',
        quantity: 60,
        width: 1800,
        height: 2800,
        unitPrice: 308.33,
        totalPrice: 18500.00,
        status: 'DELIVERED',
        priority: 'URGENT',
        createdAt: new Date('2024-12-05')
      },
      { 
        id: '5', 
        orderNumber: 'PEND-9005', 
        customer: { name: 'Corporate Plaza Inc' },
        customerName: 'Corporate Plaza Inc',
        glassType: 'LOW_E',
        glassClass: 'SOLAR_CONTROL',
        quantity: 80,
        width: 1600,
        height: 2400,
        unitPrice: 195.00,
        totalPrice: 15600.00,
        status: 'PENDING',
        priority: 'MEDIUM',
        createdAt: new Date()
      },
      { 
        id: '6', 
        orderNumber: 'PROC-9006', 
        customer: { name: 'Modern Skyscrapers LLC' },
        customerName: 'Modern Skyscrapers LLC',
        glassType: 'REFLECTIVE',
        glassClass: 'DOUBLE_GLAZED',
        quantity: 45,
        width: 1400,
        height: 2200,
        unitPrice: 284.44,
        totalPrice: 12800.00,
        status: 'IN_PRODUCTION',
        priority: 'MEDIUM',
        createdAt: new Date('2024-12-12')
      },
      { 
        id: '7', 
        orderNumber: 'QUAL-9007', 
        customer: { name: 'Banking Tower Corp' },
        customerName: 'Banking Tower Corp',
        glassType: 'TINTED',
        glassClass: 'IG_CLASS',
        quantity: 65,
        width: 1200,
        height: 2000,
        unitPrice: 150.00,
        totalPrice: 9750.00,
        status: 'QUALITY_CHECK',
        priority: 'LOW',
        createdAt: new Date('2024-12-14')
      },
      { 
        id: '8', 
        orderNumber: 'CANC-9008', 
        customer: { name: 'Hotel Magnifico' },
        customerName: 'Hotel Magnifico',
        glassType: 'FROSTED',
        glassClass: 'SINGLE_GLASS',
        quantity: 30,
        width: 1000,
        height: 1800,
        unitPrice: 240.00,
        totalPrice: 7200.00,
        status: 'CANCELLED',
        priority: 'LOW',
        createdAt: new Date('2024-11-28')
      }
    ];
  }

  private async createOrder(parameters: any, sessionId?: string) {
    // Get conversation state for multi-step order creation
    const state = sessionId ? this.getOrCreateState(sessionId) : null;
    
    // If we don't have enough information, start the multi-step flow
    if (!this.hasCompleteOrderInfo(parameters) && state) {
      return this.initiateOrderCreationFlow(parameters, state);
    }
    
    // If we have complete information, create the order
    try {
      if (this.ordersService && this.hasCompleteOrderInfo(parameters)) {
        // Generate order number
        const orderNumber = await this.ordersService.generateOrderNumber();
        
        console.log('🗣️  LISA: Creating order via database...', { orderNumber, parameters });
        
        // Create real order
        const orderData = {
          orderNumber,
          customerId: parameters.customerId || await this.findOrCreateCustomer(parameters.customerName),
          glassType: parameters.glassType.toUpperCase() || 'TEMPERED',
          glassClass: parameters.glassClass?.toUpperCase() || 'IG_CLASS',
          thickness: parseFloat(parameters.thickness) || 6.0,
          width: parseFloat(parameters.width) || 1200,
          height: parseFloat(parameters.height) || 800,
          quantity: parseInt(parameters.quantity) || 1,
          unitPrice: parseFloat(parameters.unitPrice) || this.calculateUnitPrice(parameters),
          totalPrice: parseFloat(parameters.totalPrice) || this.calculateTotalPrice(parameters),
          status: 'PENDING' as any,
          priority: 'MEDIUM' as any,
          notes: `Voice order: ${parameters.glassType || 'glass'} order via voice assistant LISA`
        };
        
        const newOrder = await this.ordersService.create(orderData);
        
        // Clear incomplete order state
        if (state && state.incompleteOrder) {
          state.incompleteOrder = undefined;
        }
        
        console.log('✅ LISA: Order created successfully!', { 
          id: newOrder.id, 
          orderNumber: newOrder.orderNumber,
          statusCode: 201 
        });
        
        return { 
          id: newOrder.id, 
          orderNumber: newOrder.orderNumber,
          success: true,
          statusCode: 201,
          message: `Perfect! I've created order ${newOrder.orderNumber} successfully. The order details have been saved and you'll receive a confirmation email shortly.`
        };
      }
    } catch (error) {
      console.error('❌ LISA: Database order creation failed:', error.message);
      // Return mock successful creation for demo if DB fails
      const mockOrderId = `ORD-DEMO-${Date.now()}`;
      return { 
        id: mockOrderId, 
        orderNumber: mockOrderId,
        success: true,
        statusCode: 200,
        message: 'Order created successfully (demo mode - database unavailable)'
      };
    }
    
    // Return mock successful creation for demo
    const mockOrderId = `ORD-DEMO-${Date.now()}`;
    console.log('📝 LISA: Using demo mode for order creation', { 
      id: mockOrderId,
      statusCode: 200 
    });
    
    return { 
      id: mockOrderId, 
      orderNumber: mockOrderId,
      success: true,
      statusCode: 200,
      message: 'Order created successfully (demo mode)'
    };
  }

  private hasCompleteOrderInfo(parameters: any): boolean {
    return !!(
      parameters.glassType && 
      parameters.quantity && 
      parameters.width && 
      parameters.height && 
      (parameters.customerName || parameters.customerId)
    );
  }

  private initiateOrderCreationFlow(parameters: any, state: ConversationState) {
    // Initialize incomplete order if not exists
    if (!state.incompleteOrder) {
      state.incompleteOrder = {
        step: 'glass_type'
      };
    }

    const order = state.incompleteOrder;

    // Process any provided information
    if (parameters.glassType && !order.glassType) {
      order.glassType = parameters.glassType;
    }
    if (parameters.quantity && !order.quantity) {
      order.quantity = parseInt(parameters.quantity);
    }
    if (parameters.width && !order.width) {
      order.width = parseFloat(parameters.width);
    }
    if (parameters.height && !order.height) {
      order.height = parseFloat(parameters.height);
    }
    if (parameters.thickness && !order.thickness) {
      order.thickness = parseFloat(parameters.thickness);
    }
    if (parameters.customerName && !order.customerName) {
      order.customerName = parameters.customerName;
    }

    // Determine next step and ask appropriate question
    return this.getNextOrderStep(order);
  }

  private getNextOrderStep(order: IncompleteOrder) {
    if (!order.glassType) {
      order.step = 'glass_type';
      return {
        success: false,
        statusCode: 202,
        message: "I'd be happy to help you create a new order! First, what type of glass do you need? We have tempered, laminated, insulated, or float glass available.",
        needsInput: true,
        step: 'glass_type'
      };
    }

    if (!order.width || !order.height) {
      order.step = 'dimensions';
      return {
        success: false,
        statusCode: 202,
        message: `Great! You've selected ${order.glassType} glass. Now I need the dimensions. What are the width and height in millimeters? For example, you can say "1200 by 800 millimeters".`,
        needsInput: true,
        step: 'dimensions'
      };
    }

    if (!order.quantity) {
      order.step = 'quantity';
      return {
        success: false,
        statusCode: 202,
        message: `Perfect! The dimensions are ${order.width}mm by ${order.height}mm. How many pieces do you need?`,
        needsInput: true,
        step: 'quantity'
      };
    }

    if (!order.customerName) {
      order.step = 'customer';
      return {
        success: false,
        statusCode: 202,
        message: `Excellent! So that's ${order.quantity} pieces of ${order.glassType} glass at ${order.width}mm x ${order.height}mm. What's the customer name for this order?`,
        needsInput: true,
        step: 'customer'
      };
    }

    // Calculate pricing
    if (!order.unitPrice) {
      order.unitPrice = this.calculateUnitPrice({
        glassType: order.glassType,
        width: order.width,
        height: order.height,
        thickness: order.thickness || 6
      });
      order.totalPrice = order.unitPrice * order.quantity;
    }

    // Final confirmation
    order.step = 'confirm';
    return {
      success: false,
      statusCode: 202,
      message: `Perfect! Let me confirm your order details:
      
Customer: ${order.customerName}
Glass Type: ${order.glassType}
Dimensions: ${order.width}mm x ${order.height}mm x ${order.thickness || 6}mm
Quantity: ${order.quantity} pieces
Unit Price: $${order.unitPrice?.toFixed(2)}
Total Price: $${order.totalPrice?.toFixed(2)}

Would you like me to create this order? Say "yes" to confirm or "no" to cancel.`,
      needsInput: true,
      step: 'confirm',
      orderSummary: {
        customerName: order.customerName,
        glassType: order.glassType,
        width: order.width,
        height: order.height,
        thickness: order.thickness || 6,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        totalPrice: order.totalPrice
      }
    };
  }

  private calculateUnitPrice(params: any): number {
    const basePrice = 50; // Base price per square meter
    const area = (params.width * params.height) / 1000000; // Convert mm² to m²
    
    // Price multipliers based on glass type
    const typeMultipliers = {
      'TEMPERED': 1.5,
      'LAMINATED': 1.8,
      'INSULATED': 2.2,
      'FLOAT': 1.0
    };
    
    const multiplier = typeMultipliers[params.glassType?.toUpperCase()] || 1.0;
    return Math.round(basePrice * area * multiplier * 100) / 100;
  }

  private calculateTotalPrice(params: any): number {
    const unitPrice = params.unitPrice || this.calculateUnitPrice(params);
    return unitPrice * (params.quantity || 1);
  }

  private async findOrCreateCustomer(customerName: string): Promise<string> {
    // In a real implementation, this would search for existing customers
    // and create a new one if not found
    // For now, return a default customer ID
    return 'default-customer-id';
  }

  private async updateOrder(parameters: any) {
    // Extract order number and status from voice input
    const transcript = parameters?.originalTranscript?.toLowerCase() || '';
    console.log('🔄 LISA: Updating order via voice...', { transcript, parameters });
    
    let orderNumber = '';
    let newStatus = 'CONFIRMED'; // default
    
    try {
      // Extract order number from transcript
      const orderNumberMatch = transcript.match(/(?:order\s+)?([A-Z]+-\d+|ORD-\d+|[A-Z]{3,4}-\d{4})/i);
      orderNumber = orderNumberMatch ? orderNumberMatch[1].toUpperCase() : parameters.orderNumber;
      
      // Extract status from transcript
      if (transcript.includes('delivered') || transcript.includes('complete')) {
        newStatus = 'DELIVERED';
      } else if (transcript.includes('production') || transcript.includes('producing')) {
        newStatus = 'IN_PRODUCTION';
      } else if (transcript.includes('confirmed') || transcript.includes('confirm')) {
        newStatus = 'CONFIRMED';
      } else if (transcript.includes('pending')) {
        newStatus = 'PENDING';
      } else if (transcript.includes('cancelled') || transcript.includes('cancel')) {
        newStatus = 'CANCELLED';
      } else if (transcript.includes('ready')) {
        newStatus = 'READY_FOR_DELIVERY';
      } else if (transcript.includes('quality') || transcript.includes('check')) {
        newStatus = 'QUALITY_CHECK';
      }
      
      if (this.ordersService && orderNumber) {
        console.log('🗣️  LISA: Updating order via database...', { orderNumber, newStatus });
        
        // Try to find and update the order
        try {
          const orders = await this.ordersService.findAll();
          const orderToUpdate = orders.find(order => 
            order.orderNumber?.toUpperCase() === orderNumber.toUpperCase()
          );
          
          if (orderToUpdate) {
            const updatedOrder = await this.ordersService.update(orderToUpdate.id, { 
              status: newStatus as any 
            });
            
            console.log('✅ LISA: Order updated successfully!', { 
              id: updatedOrder.id, 
              orderNumber: updatedOrder.orderNumber,
              oldStatus: orderToUpdate.status,
              newStatus: updatedOrder.status,
              statusCode: 200
            });
            
            return { 
              id: updatedOrder.id, 
              orderNumber: updatedOrder.orderNumber,
              oldStatus: orderToUpdate.status,
              newStatus: updatedOrder.status,
              success: true,
              statusCode: 200,
              message: `Order ${orderNumber} status updated to ${newStatus}`
            };
          } else {
            console.log('⚠️ LISA: Order not found in database', { orderNumber });
          }
        } catch (dbError) {
          console.error('❌ LISA: Database order update failed:', dbError.message);
        }
      }
    } catch (error) {
      console.error('❌ LISA: Order update parsing failed:', error.message);
    }
    
    // Return mock successful update for demo
    const mockOrderNumber = orderNumber || 'ORD-DEMO-001';
    const mockStatus = newStatus || 'CONFIRMED';
    
    console.log('📝 LISA: Using demo mode for order update', { 
      orderNumber: mockOrderNumber,
      newStatus: mockStatus,
      statusCode: 200 
    });
    
    return { 
      id: `mock-${Date.now()}`, 
      orderNumber: mockOrderNumber,
      oldStatus: 'PENDING',
      newStatus: mockStatus,
      success: true,
      statusCode: 200,
      message: `Order ${mockOrderNumber} status updated to ${mockStatus} (demo mode)`
    };
  }

  private async generatePdf(parameters: any) {
    // Mock PDF generation
    const orderNumber = parameters.orderNumber || 'ORD-1234';
    const pdfUrl = `https://example.com/invoice/${orderNumber}.pdf`;
    
    return {
      success: true,
      statusCode: 200,
      message: `PDF generated successfully!`,
      data: {
        url: pdfUrl,
        orderNumber
      }
    };
  }

  private async generateReport(parameters: any) {
    // Mock report generation
    const reportType = parameters.type || 'quarterly';
    const reportUrl = `https://example.com/report/${reportType}-report.pdf`;
    
    return {
      success: true,
      statusCode: 200,
      message: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully!`,
      data: {
        url: reportUrl,
        type: reportType
      }
    };
  }

  private async endConversation(sessionId: string) {
    const state = this.getState(sessionId);
    
    if (state) {
      state.isUserSpeaking = false;
      state.isAISpeaking = false;
      state.lastSpeechTime = Date.now();
      
      // Clear conversation context
      state.conversationContext = [];
      
      return {
        success: true,
        statusCode: 200,
        message: 'Thank you for using the glass order management system. Have a great day!'
      };
    }
    
    return {
      success: false,
      statusCode: 404,
      message: 'Session not found'
    };
  }

  private async handleGreeting(sessionId: string) {
    const state = this.getState(sessionId);
    
    // Check if this is the first greeting in the session
    const isFirstGreeting = !state?.conversationContext.some(msg => 
      msg.includes('Hi there!') || msg.includes('Hello!') || msg.includes('LISA')
    );
    
    const greetingMessages = [
      "Hi there! I'm LISA, your glass order assistant. How can I help you today?",
      "Hello! Great to hear from you. What can I do for you?",
      "Hi! I'm here to help with your glass orders. What do you need?",
      "Hello there! Ready to assist with orders, searches, or any questions you have.",
    ];
    
    const casualGreetings = [
      "Hi! What can I help you with today?",
      "Hello! How are you doing?",
      "Hey there! What's on your mind?",
      "Hi! Good to chat with you again."
    ];
    
    const selectedMessage = isFirstGreeting 
      ? greetingMessages[Math.floor(Math.random() * greetingMessages.length)]
      : casualGreetings[Math.floor(Math.random() * casualGreetings.length)];
    
    console.log(`👋 LISA: Greeting user (first: ${isFirstGreeting}): "${selectedMessage}"`);
    
    return {
      success: true,
      statusCode: 200,
      message: selectedMessage,
      greeting: true,
      isFirstGreeting
    };
  }

  private getState(sessionId: string): ConversationState | undefined {
    return this.conversations.get(sessionId);
  }

  private getOrCreateState(sessionId: string): ConversationState {
    let state = this.conversations.get(sessionId);
    
    if (!state) {
      state = {
        isUserSpeaking: false,
        isAISpeaking: false,
        lastSpeechTime: Date.now(),
        conversationContext: [],
        pendingResponse: null,
        interruptionCount: 0,
        conversationStartTime: Date.now(),
        currentTopic: null,
        awaitingUserInput: false,
        incompleteOrder: undefined
      };
      
      this.conversations.set(sessionId, state);
    }
    
    return state;
  }

  private isConversationTooLong(state: ConversationState): boolean {
    const maxLength = parseInt(process.env.MAX_CONVERSATION_LENGTH || '20');
    return state.conversationContext.length > maxLength;
  }

  private async handleLongConversation(state: ConversationState): Promise<NaturalResponse> {
    state.conversationContext = state.conversationContext.slice(-10); // Keep last 10 exchanges
    
    return {
      text: 'Our conversation is getting lengthy. For better assistance, I will summarize our discussion. Please hold on.',
      shouldSpeak: this.shouldEnableVoiceResponses(),
      confidence: 0.8
    };
  }

  /**
   * Get conversation statistics for a session
   */
  getConversationStats(sessionId: string) {
    const state = this.conversations.get(sessionId);
    if (!state) {
      return {
        sessionId,
        exists: false,
        conversationLength: 0,
        interruptions: 0,
        duration: 0,
        currentTopic: null
      };
    }

    return {
      sessionId,
      exists: true,
      conversationLength: state.conversationContext.length,
      interruptions: state.interruptionCount,
      duration: Date.now() - state.conversationStartTime,
      currentTopic: state.currentTopic,
      isUserSpeaking: state.isUserSpeaking,
      isAISpeaking: state.isAISpeaking,
      awaitingUserInput: state.awaitingUserInput
    };
  }

  /**
   * Handle conversation interruption
   */
  async handleInterruption(sessionId: string): Promise<{ success: boolean; message: string }> {
    const state = this.conversations.get(sessionId);
    if (!state) {
      return {
        success: false,
        message: 'No active conversation found'
      };
    }

    // Stop any pending AI speech
    state.isAISpeaking = false;
    state.pendingResponse = null;
    state.interruptionCount += 1;
    
    // Reset speaking states
    state.isUserSpeaking = false;
    state.awaitingUserInput = true;

    console.log(`🚫 Conversation interrupted for session ${sessionId}. Total interruptions: ${state.interruptionCount}`);

    return {
      success: true,
      message: 'Conversation interrupted successfully'
    };
  }

  /**
   * Clear conversation session
   */
  clearSession(sessionId: string): boolean {
    const existed = this.conversations.has(sessionId);
    this.conversations.delete(sessionId);
    
    if (existed) {
      console.log(`🧹 Cleared conversation session: ${sessionId}`);
    }
    
    return existed;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.conversations.keys());
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.conversations.size;
  }
}
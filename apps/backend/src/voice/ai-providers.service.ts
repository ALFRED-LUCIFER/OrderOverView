import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@deepgram/sdk';
import Groq from 'groq-sdk';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  provider: 'openai' | 'deepgram';
  duration?: number;
}

export interface IntentDetectionResult {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  provider: 'openai' | 'anthropic' | 'groq';
  shouldRespond: boolean;
}

export interface ConversationResult {
  response: string;
  confidence: number;
  provider: 'openai' | 'anthropic' | 'groq';
  action?: string;
  data?: any;
}

@Injectable()
export class AIProvidersService {
  private readonly logger = new Logger(AIProvidersService.name);
  private openai: OpenAI;
  private anthropic: Anthropic;
  private groq: Groq;
  private deepgram: any;

  constructor() {
    // Initialize GROQ first (primary provider)
    if (process.env.GROQ_API_KEY) {
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    }

    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Initialize Anthropic Claude
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // Initialize Deepgram
    if (process.env.DEEPGRAM_API_KEY) {
      this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribeWithOpenAI(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<TranscriptionResult> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI not configured');
      }

      const file = new File([audioBuffer], 'audio.webm', { type: mimeType });
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'en',
        response_format: 'json',
      });

      return {
        text: transcription.text,
        confidence: 0.9, // Whisper doesn't provide confidence scores
        provider: 'openai',
      };
    } catch (error) {
      this.logger.error('OpenAI transcription failed:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio using Deepgram
   */
  async transcribeWithDeepgram(audioBuffer: Buffer): Promise<TranscriptionResult> {
    try {
      if (!this.deepgram) {
        throw new Error('Deepgram not configured');
      }

      const response = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          punctuate: true,
          diarize: false,
        }
      );

      const transcript = response.results?.channels?.[0]?.alternatives?.[0];
      
      return {
        text: transcript?.transcript || '',
        confidence: transcript?.confidence || 0,
        provider: 'deepgram',
      };
    } catch (error) {
      this.logger.error('Deepgram transcription failed:', error);
      throw error;
    }
  }

  /**
   * Create a real-time streaming connection with Deepgram
   */
  createDeepgramStreamingConnection(socketCallback: (data: any) => void): any {
    try {
      if (!this.deepgram) {
        throw new Error('Deepgram not configured');
      }

      this.logger.log('🎤 Creating Deepgram streaming connection...');

      const connection = this.deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        punctuate: true,
        interim_results: true,
        endpointing: 300, // ms of silence before finalizing
        utterance_end_ms: 1000,
        vad_events: true,
      });

      connection.on('open', () => {
        this.logger.log('✅ Deepgram streaming connection opened');
        socketCallback({ type: 'connection', status: 'connected' });
      });

      connection.on('transcript', (data: any) => {
        if (data.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript;
          const isFinal = data.is_final;
          const confidence = data.channel.alternatives[0].confidence || 0;
          
          this.logger.log(`🎤 Deepgram ${isFinal ? 'FINAL' : 'interim'}: "${transcript}"`);
          
          socketCallback({
            type: 'transcription',
            transcript,
            isFinal,
            confidence,
            provider: 'deepgram'
          });
        }
      });

      connection.on('metadata', (data: any) => {
        this.logger.log('📊 Deepgram metadata:', data);
      });

      connection.on('error', (error: any) => {
        this.logger.error('❌ Deepgram streaming error:', error);
        socketCallback({ type: 'error', error: error.message });
      });

      connection.on('close', () => {
        this.logger.log('🔚 Deepgram streaming connection closed');
        socketCallback({ type: 'connection', status: 'disconnected' });
      });

      return connection;
    } catch (error) {
      this.logger.error('❌ Failed to create Deepgram streaming connection:', error);
      throw error;
    }
  }

  /**
   * Detect intent using GROQ Llama (Primary provider)
   */
  async detectIntentWithGroq(text: string, context?: string[]): Promise<IntentDetectionResult> {
    try {
      if (!this.groq) {
        throw new Error('GROQ not configured');
      }

      const systemPrompt = `You are an intent detection system for a glass order management system. 
      Analyze the user's speech and determine their intent. Common intents include:
      - place_order: User wants to create a new glass order
      - check_order: User wants to check status of existing order
      - modify_order: User wants to change an existing order
      - cancel_order: User wants to cancel an order
      - get_quote: User wants pricing information
      - general_inquiry: General questions about glass products
      - greeting: User is greeting or starting conversation (hi, hello, hey, good morning, how are you)
      - goodbye: User is ending conversation
      - clarification: User needs help or clarification
      - search_orders: User wants to search for orders
      - none: No clear intent detected

      SPECIAL ATTENTION for greetings:
      - "Hi", "Hello", "Hey", "Good morning", "How are you" = greeting intent
      - Simple greetings should be detected as "greeting" even if very short

      Return a JSON object with:
      {
        "intent": "detected_intent",
        "confidence": 0.0-1.0,
        "entities": {extracted key-value pairs},
        "shouldRespond": true/false
      }`;

      const contextString = context ? `\nPrevious conversation:\n${context.join('\n')}` : '';

      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${text}${contextString}` }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        intent: result.intent || 'none',
        confidence: result.confidence || 0.5,
        entities: result.entities || {},
        provider: 'groq',
        shouldRespond: result.shouldRespond !== false,
      };
    } catch (error) {
      this.logger.error('GROQ intent detection failed:', error);
      throw error;
    }
  }

  /**
   * Generate conversation response using GROQ Llama
   */
  async generateResponseWithGroq(
    userMessage: string,
    intent: string,
    context?: string[],
    systemData?: any
  ): Promise<ConversationResult> {
    try {
      if (!this.groq) {
        throw new Error('GROQ not configured');
      }

      const systemPrompt = `You are LISA, an AI assistant for OrderOverView glass order management system.
      You help customers place orders, check status, get quotes, and answer questions about glass products.
      
      Current intent: ${intent}
      
      Be conversational, helpful, and professional. Keep responses concise but friendly.
      For order-related intents, guide users through the process step by step.
      
      Glass types available: Tempered, Laminated, Insulated, Low-E, Clear Float, Bulletproof, Frosted, Tinted
      Standard thicknesses: 3mm, 4mm, 5mm, 6mm, 8mm, 10mm, 12mm, 15mm, 19mm
      
      If you need specific information to proceed, ask for it clearly.
      Always confirm important details before finalizing orders.
      
      For greetings, be warm and welcoming.`;

      const contextString = context ? `\nConversation history:\n${context.join('\n')}` : '';
      const dataString = systemData ? `\nSystem data: ${JSON.stringify(systemData, null, 2)}` : '';

      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${userMessage}${contextString}${dataString}` }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content || '';
      
      return {
        response,
        confidence: 0.9,
        provider: 'groq',
        action: this.extractActionFromResponse(response, intent),
        data: systemData,
      };
    } catch (error) {
      this.logger.error('GROQ conversation failed:', error);
      throw error;
    }
  }

  /**
   * Ensemble method for intent detection with GROQ priority
   */
  async detectIntentEnsemble(text: string, context?: string[]): Promise<IntentDetectionResult> {
    // Try GROQ first, then fallback to other providers
    const providers = [
      () => this.detectIntentWithGroq(text, context),
      () => this.detectIntentWithClaude(text, context),
      () => this.detectIntentWithOpenAI(text, context),
    ];

    for (const provider of providers) {
      try {
        const result = await provider();
        this.logger.log(`✅ Intent detection succeeded with ${result.provider}: ${result.intent}`);
        return result;
      } catch (error) {
        this.logger.warn(`❌ Provider failed, trying next: ${error.message}`);
        continue;
      }
    }

    // If all AI providers fail, use fallback pattern matching
    this.logger.warn('All AI providers failed, using fallback pattern matching');
    return this.fallbackIntentDetection(text);
  }

  /**
   * Detect intent using OpenAI GPT-4o
   */
  async detectIntentWithOpenAI(text: string, context?: string[]): Promise<IntentDetectionResult> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI not configured');
      }

      const systemPrompt = `You are an intent detection system for a glass order management system. 
      Analyze the user's speech and determine their intent. Common intents include:
      - place_order: User wants to create a new glass order
      - check_order: User wants to check status of existing order
      - modify_order: User wants to change an existing order
      - cancel_order: User wants to cancel an order
      - get_quote: User wants pricing information
      - general_inquiry: General questions about glass products
      - greeting: User is greeting or starting conversation (hi, hello, hey, good morning, how are you)
      - goodbye: User is ending conversation
      - clarification: User needs help or clarification
      - search_orders: User wants to search for orders
      - none: No clear intent detected

      SPECIAL ATTENTION for greetings:
      - "Hi", "Hello", "Hey", "Good morning", "How are you" = greeting intent
      - Simple greetings should be detected as "greeting" even if very short

      Return a JSON object with:
      {
        "intent": "detected_intent",
        "confidence": 0.0-1.0,
        "entities": {extracted key-value pairs},
        "shouldRespond": true/false
      }`;

      const contextString = context ? `\nPrevious conversation:\n${context.join('\n')}` : '';

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${text}${contextString}` }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        intent: result.intent || 'none',
        confidence: result.confidence || 0.5,
        entities: result.entities || {},
        provider: 'openai',
        shouldRespond: result.shouldRespond !== false,
      };
    } catch (error) {
      this.logger.error('OpenAI intent detection failed:', error);
      throw error;
    }
  }

  /**
   * Detect intent using Anthropic Claude
   */
  async detectIntentWithClaude(text: string, context?: string[]): Promise<IntentDetectionResult> {
    try {
      if (!this.anthropic) {
        throw new Error('Anthropic not configured');
      }

      const systemPrompt = `You are an intent detection system for a glass order management system. 
      Analyze the user's speech and determine their intent. Common intents include:
      - place_order: User wants to create a new glass order
      - check_order: User wants to check status of existing order
      - modify_order: User wants to change an existing order
      - cancel_order: User wants to cancel an order
      - get_quote: User wants pricing information
      - general_inquiry: General questions about glass products
      - greeting: User is greeting or starting conversation
      - goodbye: User is ending conversation
      - clarification: User needs help or clarification
      - none: No clear intent detected

      Return only a JSON object with:
      {
        "intent": "detected_intent",
        "confidence": 0.0-1.0,
        "entities": {extracted key-value pairs},
        "shouldRespond": true/false
      }`;

      const contextString = context ? `\nPrevious conversation:\n${context.join('\n')}` : '';

      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `${text}${contextString}` }
        ],
        temperature: 0.1,
      });

      const content = message.content[0];
      const responseText = content.type === 'text' ? content.text : '{}';
      const result = JSON.parse(responseText);
      
      return {
        intent: result.intent || 'none',
        confidence: result.confidence || 0.5,
        entities: result.entities || {},
        provider: 'anthropic',
        shouldRespond: result.shouldRespond !== false,
      };
    } catch (error) {
      this.logger.error('Claude intent detection failed:', error);
      throw error;
    }
  }

  /**
   * Fallback intent detection using pattern matching
   */
  private fallbackIntentDetection(text: string): IntentDetectionResult {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey') ||
        lowerText.includes('good morning') || lowerText.includes('good afternoon') || 
        lowerText.includes('good evening') || lowerText.includes('howdy')) {
      return { intent: 'greeting', confidence: 0.8, entities: {}, provider: 'groq', shouldRespond: true };
    }
    
    if (lowerText.includes('order') && (lowerText.includes('new') || lowerText.includes('place') || lowerText.includes('create'))) {
      return { intent: 'place_order', confidence: 0.7, entities: {}, provider: 'groq', shouldRespond: true };
    }
    
    if (lowerText.includes('check') || lowerText.includes('status')) {
      return { intent: 'check_order', confidence: 0.7, entities: {}, provider: 'groq', shouldRespond: true };
    }
    
    if (lowerText.includes('quote') || lowerText.includes('price') || lowerText.includes('cost')) {
      return { intent: 'get_quote', confidence: 0.7, entities: {}, provider: 'groq', shouldRespond: true };
    }
    
    if (lowerText.includes('bye') || lowerText.includes('goodbye') || lowerText.includes('see you')) {
      return { intent: 'goodbye', confidence: 0.8, entities: {}, provider: 'groq', shouldRespond: true };
    }

    return { intent: 'general_inquiry', confidence: 0.5, entities: {}, provider: 'groq', shouldRespond: true };
  }

  /**
   * Extract action from response text
   */
  private extractActionFromResponse(response: string, intent: string): string | undefined {
    const lowerResponse = response.toLowerCase();
    
    if (intent === 'place_order' && lowerResponse.includes('created')) {
      return 'order_created';
    }
    
    if (intent === 'check_order' && lowerResponse.includes('found')) {
      return 'order_found';
    }
    
    if (intent === 'get_quote' && lowerResponse.includes('price')) {
      return 'quote_provided';
    }

    return undefined;
  }

  /**
   * Health check for all AI providers
   */
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    return {
      groq: !!this.groq && !!process.env.GROQ_API_KEY,
      openai: !!this.openai && !!process.env.OPENAI_API_KEY,
      anthropic: !!this.anthropic && !!process.env.ANTHROPIC_API_KEY,
      deepgram: !!this.deepgram && !!process.env.DEEPGRAM_API_KEY,
    };
  }
}
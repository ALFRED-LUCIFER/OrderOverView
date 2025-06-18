import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface IntentResult {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
  emotion: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  requiresUserInput: boolean;
  topic: string;
  context: {
    isFollowUp: boolean;
    previousIntent?: string;
    conversationPhase: 'greeting' | 'task' | 'clarification' | 'completion' | 'farewell';
  };
  naturalResponse: string;
}

@Injectable()
export class EnhancedIntentService {
  private openaiApiKey: string;
  private groqApiKey: string;
  private groq: Groq;

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY', '');
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY', '');
    
    if (this.groqApiKey) {
      this.groq = new Groq({ apiKey: this.groqApiKey });
    }
  }

  /**
   * Enhanced intent detection using multiple AI providers
   */
  async detectIntent(
    transcript: string, 
    conversationContext: string[] = []
  ): Promise<IntentResult> {
    console.log('🔍 LISA: Detecting intent for:', transcript);
    
    try {
      // Try Groq first as it's most reliable
      if (this.groq) {
        return await this.detectIntentWithGroq(transcript, conversationContext);
      }
      
      // Fallback to OpenAI if available
      if (this.openaiApiKey) {
        return await this.detectIntentWithOpenAI(transcript, conversationContext);
      }
      
      // Final fallback to local pattern matching
      return this.fallbackIntentDetection(transcript, conversationContext);
      
    } catch (error) {
      console.error('❌ LISA: Intent detection failed:', error.message);
      return this.fallbackIntentDetection(transcript, conversationContext);
    }
  }

  /**
   * Generate simple response using multiple providers
   */
  async generateResponse(
    transcript: string,
    conversationContext: string[],
    intent: IntentResult | null
  ): Promise<string> {
    // If intent detection failed, use fallback
    if (!intent) {
      console.log('⚠️ LISA: No intent provided, using fallback detection');
      intent = this.fallbackIntentDetection(transcript, conversationContext);
    }

    try {
      // Try Groq response
      if (this.groq) {
        const response = await this.generateGroqResponse(transcript, conversationContext, intent);
        return response;
      }

      // Fallback to simple response
      return `I understand you're asking about ${intent.intent}. Let me help you with that.`;
      
    } catch (error) {
      console.error('❌ LISA: Response generation failed:', error.message);
      return "I'm here to help! Could you please rephrase your question?";
    }
  }

  /**
   * Detect intent using GPT-4 API (wrapper for OpenAI method)
   */
  async detectIntentWithGPT4(
    transcript: string, 
    conversationContext: string[] = [],
    userProfile?: any
  ): Promise<IntentResult> {
    console.log('🔍 LISA: Using GPT-4 for intent detection');
    return await this.detectIntentWithOpenAI(transcript, conversationContext);
  }

  /**
   * Detect intent using Claude API (fallback to Groq or OpenAI)
   */
  async detectIntentWithClaude(
    transcript: string, 
    conversationContext: string[] = []
  ): Promise<IntentResult> {
    console.log('🔍 LISA: Claude requested, falling back to available provider');
    // Since Claude isn't implemented, use best available provider
    if (this.groq) {
      return await this.detectIntentWithGroq(transcript, conversationContext);
    }
    return await this.detectIntentWithOpenAI(transcript, conversationContext);
  }

  /**
   * Ensemble intent detection using multiple providers
   */
  async detectIntentEnsemble(
    transcript: string, 
    conversationContext: string[] = []
  ): Promise<IntentResult> {
    console.log('🔍 LISA: Using ensemble intent detection');
    // Use the main detectIntent method which already has fallback logic
    return await this.detectIntent(transcript, conversationContext);
  }

  /**
   * Generate streaming response for real-time conversation
   */
  async *generateStreamingResponse(
    transcript: string,
    conversationContext: string[],
    intent: IntentResult,
    sessionId: string
  ): AsyncGenerator<string, void, unknown> {
    console.log(`🌊 LISA: Starting streaming response for session ${sessionId}`);
    
    try {
      // Generate response based on intent
      const response = await this.generateResponse(transcript, conversationContext, intent);
      
      // Stream the response word by word for natural conversation feel
      const words = response.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const isLastWord = i === words.length - 1;
        
        // Add natural timing between words
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50));
        }
        
        yield isLastWord ? word : word + ' ';
      }
      
    } catch (error) {
      console.error('❌ LISA: Streaming response error:', error);
      yield "I apologize, but I'm having trouble processing your request right now. Could you please try again?";
    }
  }

  /**
   * Detect intent using Groq API
   */
  private async detectIntentWithGroq(
    transcript: string, 
    conversationContext: string[]
  ): Promise<IntentResult> {
    const prompt = this.buildIntentDetectionPrompt(transcript, conversationContext);
    
    const response = await this.groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';
    return this.parseIntentResponse(content, transcript);
  }

  /**
   * Detect intent using OpenAI API
   */
  private async detectIntentWithOpenAI(
    transcript: string, 
    conversationContext: string[]
  ): Promise<IntentResult> {
    const prompt = this.buildIntentDetectionPrompt(transcript, conversationContext);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    return this.parseIntentResponse(content, transcript);
  }

  /**
   * Generate response using Groq
   */
  private async generateGroqResponse(
    transcript: string,
    conversationContext: string[],
    intent: IntentResult
  ): Promise<string> {
    const systemPrompt = this.buildConversationPrompt(intent, conversationContext);
    
    const response = await this.groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || "I'm here to help!";
  }

  /**
   * Build intent detection prompt
   */
  private buildIntentDetectionPrompt(transcript: string, conversationContext: string[]): string {
    const context = conversationContext.length > 0 
      ? `Previous conversation: ${conversationContext.slice(-3).join(' ')}`
      : 'This is the start of the conversation.';

    return `
You are LISA, an AI assistant for a Glass Order Management System. Analyze this user input and return intent information in JSON format.

${context}

User input: "${transcript}"

Possible intents:
- CREATE_ORDER: User wants to create a new glass order
- SEARCH_ORDERS: User wants to find or list orders
- UPDATE_ORDER: User wants to modify an existing order
- DELETE_ORDER: User wants to cancel an order
- SEARCH_CUSTOMERS: User wants to find customer information
- CREATE_CUSTOMER: User wants to add a new customer
- GET_REPORTS: User wants analytics or reports
- GREETING: User is greeting or starting conversation
- HELP: User needs assistance or instructions
- GENERAL: General conversation or unclear intent

Return ONLY a JSON object with this structure:
{
  "intent": "INTENT_NAME",
  "confidence": 0.95,
  "parameters": {},
  "emotion": "neutral|positive|negative|frustrated|excited",
  "urgency": "low|medium|high|urgent",
  "requiresUserInput": false,
  "topic": "orders|customers|reports|general",
  "context": {
    "isFollowUp": false,
    "conversationPhase": "greeting|task|clarification|completion|farewell"
  },
  "naturalResponse": "Brief natural response acknowledging the intent"
}`;
  }

  /**
   * Build conversation prompt for response generation
   */
  private buildConversationPrompt(intent: IntentResult, conversationContext: string[]): string {
    const context = conversationContext.length > 0 
      ? `Recent conversation: ${conversationContext.slice(-3).join(' ')}`
      : '';

    return `You are LISA, a helpful AI assistant for a Glass Order Management System.

${context}

The user's intent is: ${intent.intent}
Confidence: ${intent.confidence}
Topic: ${intent.topic}
Emotion: ${intent.emotion}

Respond naturally and helpfully. Keep responses conversational and under 2 sentences.
If the user wants to create orders, ask for details like glass type, dimensions, customer info.
If they want to search, ask for specific criteria.
Be friendly and professional.`;
  }

  /**
   * Parse intent response from AI
   */
  private parseIntentResponse(content: string, originalTranscript: string): IntentResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || 'GENERAL',
          confidence: parsed.confidence || 0.5,
          parameters: parsed.parameters || {},
          emotion: parsed.emotion || 'neutral',
          urgency: parsed.urgency || 'medium',
          requiresUserInput: parsed.requiresUserInput || false,
          topic: parsed.topic || 'general',
          context: parsed.context || {
            isFollowUp: false,
            conversationPhase: 'task'
          },
          naturalResponse: parsed.naturalResponse || "I understand. How can I help you?"
        };
      }
    } catch (error) {
      console.warn('⚠️ LISA: Failed to parse AI intent response, using fallback');
    }

    return this.fallbackIntentDetection(originalTranscript, []);
  }

  /**
   * Fallback intent detection using pattern matching
   */
  private fallbackIntentDetection(transcript: string, conversationContext: string[]): IntentResult {
    const text = transcript.toLowerCase();
    
    // Greeting patterns
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)/.test(text)) {
      return {
        intent: 'GREETING',
        confidence: 0.9,
        parameters: {},
        emotion: 'positive',
        urgency: 'low',
        requiresUserInput: false,
        topic: 'general',
        context: {
          isFollowUp: false,
          conversationPhase: 'greeting'
        },
        naturalResponse: "Hello! I'm LISA, your Glass Order Management assistant. How can I help you today?"
      };
    }

    // Order creation patterns
    if (/(create|new|add|make|place).*order/.test(text) || /(order|glass).*new/.test(text)) {
      return {
        intent: 'CREATE_ORDER',
        confidence: 0.8,
        parameters: {},
        emotion: 'neutral',
        urgency: 'medium',
        requiresUserInput: true,
        topic: 'orders',
        context: {
          isFollowUp: false,
          conversationPhase: 'task'
        },
        naturalResponse: "I'll help you create a new glass order. What type of glass do you need?"
      };
    }

    // Search orders patterns
    if (/(find|search|show|list|get).*order/.test(text) || /(order|orders).*search/.test(text)) {
      return {
        intent: 'SEARCH_ORDERS',
        confidence: 0.8,
        parameters: {},
        emotion: 'neutral',
        urgency: 'medium',
        requiresUserInput: true,
        topic: 'orders',
        context: {
          isFollowUp: false,
          conversationPhase: 'task'
        },
        naturalResponse: "I can help you find orders. What would you like to search for?"
      };
    }

    // Customer patterns
    if (/(find|search|show|list).*customer/.test(text) || /(customer|customers).*search/.test(text)) {
      return {
        intent: 'SEARCH_CUSTOMERS',
        confidence: 0.8,
        parameters: {},
        emotion: 'neutral',
        urgency: 'medium',
        requiresUserInput: true,
        topic: 'customers',
        context: {
          isFollowUp: false,
          conversationPhase: 'task'
        },
        naturalResponse: "I'll help you find customer information. What details are you looking for?"
      };
    }

    // Help patterns
    if (/(help|assist|support|what can you do)/.test(text)) {
      return {
        intent: 'HELP',
        confidence: 0.9,
        parameters: {},
        emotion: 'neutral',
        urgency: 'low',
        requiresUserInput: false,
        topic: 'general',
        context: {
          isFollowUp: false,
          conversationPhase: 'clarification'
        },
        naturalResponse: "I can help you create orders, search for information, manage customers, and generate reports. What would you like to do?"
      };
    }

    // Default fallback
    return {
      intent: 'GENERAL',
      confidence: 0.5,
      parameters: {},
      emotion: 'neutral',
      urgency: 'medium',
      requiresUserInput: true,
      topic: 'general',
      context: {
        isFollowUp: false,
        conversationPhase: 'clarification'
      },
      naturalResponse: "I understand you need help with the Glass Order Management system. Could you be more specific about what you'd like to do?"
    };
  }
}

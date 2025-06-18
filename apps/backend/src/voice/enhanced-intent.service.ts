import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvidersService, IntentDetectionResult } from './ai-providers.service';

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
  provider?: string;
}

@Injectable()
export class EnhancedIntentService {
  private readonly logger = new Logger(EnhancedIntentService.name);

  constructor(
    private configService: ConfigService,
    private aiProvidersService: AIProvidersService
  ) {}

  async detectIntent(transcript: string, conversationContext: string[] = []): Promise<IntentResult> {
    this.logger.log('🔍 Detecting intent with AI providers for:', transcript);
    
    try {
      // Use ensemble method for best accuracy
      const aiResult = await this.aiProvidersService.detectIntentEnsemble(transcript, conversationContext);
      return this.convertAIResultToIntentResult(aiResult, transcript, conversationContext);
    } catch (error) {
      this.logger.warn('AI intent detection failed, using fallback:', error.message);
      return this.fallbackIntentDetection(transcript, conversationContext);
    }
  }

  async generateResponse(transcript: string, conversationContext: string[], intent: IntentResult | null): Promise<string> {
    if (!intent) {
      intent = await this.detectIntent(transcript, conversationContext);
    }
    return intent.naturalResponse;
  }

  async detectIntentWithGPT4(transcript: string, conversationContext: string[] = [], userProfile?: any): Promise<IntentResult> {
    try {
      const aiResult = await this.aiProvidersService.detectIntentWithOpenAI(transcript, conversationContext);
      return this.convertAIResultToIntentResult(aiResult, transcript, conversationContext);
    } catch (error) {
      this.logger.warn('GPT-4 intent detection failed:', error.message);
      return this.fallbackIntentDetection(transcript, conversationContext);
    }
  }

  async detectIntentWithClaude(transcript: string, conversationContext: string[] = []): Promise<IntentResult> {
    try {
      const aiResult = await this.aiProvidersService.detectIntentWithClaude(transcript, conversationContext);
      return this.convertAIResultToIntentResult(aiResult, transcript, conversationContext);
    } catch (error) {
      this.logger.warn('Claude intent detection failed:', error.message);
      return this.fallbackIntentDetection(transcript, conversationContext);
    }
  }

  async detectIntentEnsemble(transcript: string, conversationContext: string[] = []): Promise<IntentResult> {
    return this.detectIntent(transcript, conversationContext);
  }

  async *generateStreamingResponse(transcript: string, conversationContext: string[], intent: IntentResult, sessionId: string): AsyncGenerator<string, void, unknown> {
    const response = await this.generateResponse(transcript, conversationContext, intent);
    const words = response.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const isLastWord = i === words.length - 1;
      yield isLastWord ? word : word + ' ';
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Convert AI provider result to our enhanced intent format
   */
  private convertAIResultToIntentResult(
    aiResult: IntentDetectionResult, 
    transcript: string, 
    conversationContext: string[]
  ): IntentResult {
    const intent = aiResult.intent.toUpperCase();
    
    // Map AI intents to our enhanced format
    const intentMapping: { [key: string]: Partial<IntentResult> } = {
      'PLACE_ORDER': {
        emotion: 'neutral',
        urgency: 'medium',
        requiresUserInput: true,
        topic: 'orders',
        context: { isFollowUp: false, conversationPhase: 'task' },
        naturalResponse: "I'll help you create a new glass order. What type of glass do you need?"
      },
      'CHECK_ORDER': {
        emotion: 'neutral',
        urgency: 'medium',
        requiresUserInput: true,
        topic: 'orders',
        context: { isFollowUp: false, conversationPhase: 'task' },
        naturalResponse: "I can help you check your order status. Could you provide your order number or customer name?"
      },
      'GET_QUOTE': {
        emotion: 'neutral',
        urgency: 'medium',
        requiresUserInput: true,
        topic: 'pricing',
        context: { isFollowUp: false, conversationPhase: 'task' },
        naturalResponse: "I'd be happy to provide a quote. What type and size of glass are you looking for?"
      },
      'GREETING': {
        emotion: 'positive',
        urgency: 'low',
        requiresUserInput: false,
        topic: 'general',
        context: { isFollowUp: false, conversationPhase: 'greeting' },
        naturalResponse: "Hello! I'm ARIA, your AI assistant for OrderOverView. How can I help you with your glass orders today?"
      },
      'GOODBYE': {
        emotion: 'positive',
        urgency: 'low',
        requiresUserInput: false,
        topic: 'general',
        context: { isFollowUp: false, conversationPhase: 'farewell' },
        naturalResponse: "Thank you for using OrderOverView! Have a great day!"
      }
    };

    const defaults = {
      emotion: 'neutral',
      urgency: 'medium' as const,
      requiresUserInput: true,
      topic: 'general',
      context: { isFollowUp: false, conversationPhase: 'clarification' as const },
      naturalResponse: "I understand you need help with the Glass Order Management system. Could you be more specific about what you'd like to do?"
    };

    const mappedIntent = intentMapping[intent] || defaults;

    return {
      intent,
      confidence: aiResult.confidence,
      parameters: aiResult.entities,
      emotion: mappedIntent.emotion || 'neutral',
      urgency: mappedIntent.urgency || 'medium',
      requiresUserInput: mappedIntent.requiresUserInput !== undefined ? mappedIntent.requiresUserInput : true,
      topic: mappedIntent.topic || 'general',
      context: mappedIntent.context || { isFollowUp: false, conversationPhase: 'clarification' },
      naturalResponse: mappedIntent.naturalResponse || "I understand you need help with the Glass Order Management system. Could you be more specific about what you'd like to do?"
    };
  }

  private fallbackIntentDetection(transcript: string, conversationContext: string[]): IntentResult {
    const text = transcript.toLowerCase();
    
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)/.test(text)) {
      return {
        intent: 'GREETING',
        confidence: 0.9,
        parameters: {},
        emotion: 'positive',
        urgency: 'low',
        requiresUserInput: false,
        topic: 'general',
        context: { isFollowUp: false, conversationPhase: 'greeting' },
        naturalResponse: "Hello! I'm here to help you with your glass orders. What can I do for you?"
      };
    }

    if (/(create|new|add|make|place).*order/.test(text) || /(order|glass).*new/.test(text)) {
      return {
        intent: 'CREATE_ORDER',
        confidence: 0.8,
        parameters: {},
        emotion: 'neutral',
        urgency: 'medium',
        requiresUserInput: true,
        topic: 'orders',
        context: { isFollowUp: false, conversationPhase: 'task' },
        naturalResponse: "I'll help you create a new glass order. What type of glass do you need?"
      };
    }

    return {
      intent: 'GENERAL',
      confidence: 0.5,
      parameters: {},
      emotion: 'neutral',
      urgency: 'medium',
      requiresUserInput: true,
      topic: 'general',
      context: { isFollowUp: false, conversationPhase: 'clarification' },
      naturalResponse: "I understand you need help with the Glass Order Management system. Could you be more specific about what you'd like to do?"
    };
  }
}

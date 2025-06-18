import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  constructor(private configService: ConfigService) {}

  async detectIntent(transcript: string, conversationContext: string[] = []): Promise<IntentResult> {
    console.log('🔍 Detecting intent for:', transcript);
    return this.fallbackIntentDetection(transcript, conversationContext);
  }

  async generateResponse(transcript: string, conversationContext: string[], intent: IntentResult | null): Promise<string> {
    if (!intent) {
      intent = this.fallbackIntentDetection(transcript, conversationContext);
    }
    return intent.naturalResponse;
  }

  async detectIntentWithGPT4(transcript: string, conversationContext: string[] = [], userProfile?: any): Promise<IntentResult> {
    return await this.detectIntent(transcript, conversationContext);
  }

  async detectIntentWithClaude(transcript: string, conversationContext: string[] = []): Promise<IntentResult> {
    return await this.detectIntent(transcript, conversationContext);
  }

  async detectIntentEnsemble(transcript: string, conversationContext: string[] = []): Promise<IntentResult> {
    return await this.detectIntent(transcript, conversationContext);
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

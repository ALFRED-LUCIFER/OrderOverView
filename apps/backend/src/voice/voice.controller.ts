import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { VoiceService } from './voice.service';

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
  ) {}

  @Get('health')
  healthCheck() {
    return { 
      status: 'LISA voice service is running', 
      agent: 'LISA',
      naturalConversation: 'enabled',
      model: 'llama-3.3-70b-versatile' 
    };
  }

  @Get('test')
  async testVoiceCommands() {
    return { message: 'Voice test endpoint - natural conversation ready' };
  }

  @Get('config')
  getVoiceConfig() {
    return {
      agent: 'LISA',
      model: 'llama-3.3-70b-versatile',
      enableContinuousListening: process.env.ENABLE_CONTINUOUS_LISTENING === 'true',
      voiceActivityThreshold: parseFloat(process.env.VOICE_ACTIVITY_THRESHOLD || '0.3'),
      silenceTimeoutMs: parseInt(process.env.SILENCE_TIMEOUT_MS || '1500'),
      maxConversationLength: parseInt(process.env.MAX_CONVERSATION_LENGTH || '30'),
      aiResponseStyle: process.env.AI_RESPONSE_STYLE || 'conversational_telephonic',
      enableFillerWords: process.env.ENABLE_FILLER_WORDS === 'true',
      enableThinkingSounds: process.env.ENABLE_THINKING_SOUNDS === 'true',
    };
  }
}

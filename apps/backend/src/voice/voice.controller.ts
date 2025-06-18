import { Controller, Get, Post, Body, Param, Res, UploadedFile, UseInterceptors, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as multer from 'multer';
import { VoiceService } from './voice.service';
import { EnhancedVoiceService } from './enhanced-voice.service';
import { EnhancedIntentService } from './enhanced-intent.service';
import { EnhancedElevenLabsService } from './enhanced-elevenlabs.service';

// Request/Response DTOs
export interface TranscriptionRequest {
  audioData: string; // base64 encoded audio
  provider?: 'whisper' | 'deepgram' | 'auto';
  language?: string;
}

export interface TranscriptionResponse {
  transcript: string;
  confidence: number;
  provider: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  duration?: number;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  provider?: 'elevenlabs' | 'openai' | 'browser';
}

export interface IntentDetectionRequest {
  transcript: string;
  conversationContext?: string[];
  userProfile?: any;
  provider?: 'gpt4' | 'claude' | 'ensemble';
}

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly enhancedVoiceService: EnhancedVoiceService,
    private readonly enhancedIntentService: EnhancedIntentService,
    private readonly elevenLabsService: EnhancedElevenLabsService,
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

  /**
   * Enhanced Speech-to-Text endpoint with multiple provider support
   */
  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribeAudio(
    @UploadedFile() audioFile: multer.File,
    @Query('provider') provider: 'whisper' | 'deepgram' | 'auto' = 'auto',
    @Query('language') language: string = 'en'
  ): Promise<TranscriptionResponse> {
    try {
      if (!audioFile) {
        throw new Error('No audio file provided');
      }

      console.log(`🎤 LISA: Processing transcription request with ${provider} provider`);
      
      const result = await this.enhancedVoiceService.transcribeAudio(
        audioFile.buffer, 
        provider
      );

      return {
        transcript: result.transcript,
        confidence: result.confidence,
        provider: provider === 'auto' ? 'whisper' : provider, // Default fallback
        words: result.words,
        duration: result.duration
      };

    } catch (error) {
      console.error('❌ LISA: Transcription error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Enhanced Speech-to-Text endpoint with base64 audio data
   */
  @Post('transcribe-base64')
  async transcribeBase64Audio(@Body() request: TranscriptionRequest): Promise<TranscriptionResponse> {
    try {
      console.log(`🎤 LISA: Processing base64 transcription with ${request.provider || 'auto'} provider`);
      
      // Decode base64 audio data
      const audioBuffer = Buffer.from(request.audioData, 'base64');
      
      const result = await this.enhancedVoiceService.transcribeAudio(
        audioBuffer, 
        request.provider || 'auto'
      );

      return {
        transcript: result.transcript,
        confidence: result.confidence,
        provider: request.provider || 'auto',
        words: result.words,
        duration: result.duration
      };

    } catch (error) {
      console.error('❌ LISA: Base64 transcription error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Simple Intent Detection endpoint
   */
  @Post('detect-intent')
  async detectIntent(@Body() request: IntentDetectionRequest) {
    try {
      console.log('🧠 Detecting intent for:', request.transcript);
      
      const result = await this.enhancedIntentService.detectIntent(
        request.transcript,
        request.conversationContext || []
      );

      return {
        intent: result.intent,
        confidence: result.confidence,
        parameters: result.parameters,
        emotion: result.emotion,
        context: result.context,
        naturalResponse: result.naturalResponse,
        provider: 'pattern-matching'
      };

    } catch (error) {
      console.error('❌ Intent detection error:', error);
      throw new Error(`Intent detection failed: ${error.message}`);
    }
  }

  /**
   * Simple streaming conversation response endpoint
   */
  @Post('stream-response')
  async getStreamingResponse(
    @Body() request: {
      transcript: string;
      conversationContext: string[];
      intent?: any;
      sessionId: string;
    },
    @Res() response: Response
  ) {
    try {
      console.log(`🌊 Starting streaming response for session ${request.sessionId}`);
      
      // If intent is not provided, detect it first
      let intent = request.intent;
      if (!intent) {
        console.log('🧠 No intent provided, detecting intent first...');
        intent = await this.enhancedIntentService.detectIntent(
          request.transcript,
          request.conversationContext || []
        );
      }
      
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.setHeader('Transfer-Encoding', 'chunked');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');

      const streamGenerator = this.enhancedIntentService.generateStreamingResponse(
        request.transcript,
        request.conversationContext || [],
        intent,
        request.sessionId
      );

      for await (const chunk of streamGenerator) {
        response.write(chunk);
      }
      
      response.end();

    } catch (error) {
      console.error('❌ Streaming response error:', error);
      response.status(500).json({ error: `Streaming failed: ${error.message}` });
    }
  }

  /**
   * Voice Activity Detection endpoint
   */
  @Post('voice-activity')
  @UseInterceptors(FileInterceptor('audio'))
  async detectVoiceActivity(@UploadedFile() audioFile: multer.File) {
    try {
      if (!audioFile) {
        throw new Error('No audio file provided');
      }

      console.log('🔊 LISA: Analyzing voice activity...');
      
      const result = this.enhancedVoiceService.analyzeVoiceActivity(audioFile.buffer);

      return {
        isSpeaking: result.isSpeaking,
        confidence: result.confidence,
        volume: result.volume,
        frequency: result.frequency
      };

    } catch (error) {
      console.error('❌ LISA: Voice activity detection error:', error);
      throw new Error(`Voice activity detection failed: ${error.message}`);
    }
  }

  /**
   * Text-to-Speech endpoint (future implementation for server-side TTS)
   */
  @Post('tts')
  async textToSpeech(@Body() request: TTSRequest, @Res() response: Response) {
    try {
      console.log(`🗣️ LISA: Converting text to speech with ${request.provider || 'default'} provider`);
      
      // For now, return instructions for client-side TTS
      // This can be enhanced to return actual audio in the future
      response.json({
        message: 'TTS processing complete',
        instruction: 'Use client-side TTS services (ElevenLabs, OpenAI, or Browser)',
        text: request.text,
        provider: request.provider || 'client-side'
      });

    } catch (error) {
      console.error('❌ LISA: TTS error:', error);
      response.status(500).json({ error: `TTS failed: ${error.message}` });
    }
  }

  /**
   * Get voice service capabilities and status
   */
  @Get('capabilities')
  getVoiceCapabilities() {
    return {
      stt: {
        providers: ['whisper', 'deepgram'],
        features: ['word_timestamps', 'confidence_scores', 'language_detection']
      },
      intent: {
        providers: ['gpt4', 'claude', 'ensemble'],
        features: ['emotion_detection', 'entity_extraction', 'context_awareness']
      },
      tts: {
        providers: ['client-side'],
        features: ['streaming', 'voice_selection', 'speed_control']
      },
      vad: {
        features: ['real_time_detection', 'confidence_scoring', 'audio_analysis']
      }
    };
  }

  // ElevenLabs Enhanced Voice Endpoints

  @Get('elevenlabs/status')
  async getElevenLabsStatus() {
    const isAvailable = this.elevenLabsService.isAvailable();
    const config = this.elevenLabsService.getDefaultVoiceConfig();
    
    return {
      available: isAvailable,
      configured: !!process.env.ELEVENLABS_API_KEY,
      voiceConfig: config,
      status: isAvailable ? 'ready' : 'not configured'
    };
  }

  @Post('elevenlabs/speak')
  async elevenLabsSpeak(
    @Body() body: { text: string; voiceConfig?: any },
    @Res() res: Response
  ) {
    try {
      const result = await this.elevenLabsService.textToSpeech(
        body.text,
        body.voiceConfig
      );

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          success: false
        });
      }

      // Set appropriate headers for audio response
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.audioBuffer?.length.toString(),
        'Cache-Control': 'no-cache'
      });

      return res.send(result.audioBuffer);

    } catch (error) {
      console.error('❌ ElevenLabs speak error:', error);
      return res.status(500).json({
        error: 'Text-to-speech failed',
        success: false
      });
    }
  }

  @Get('elevenlabs/voices')
  async getElevenLabsVoices() {
    try {
      const voices = await this.elevenLabsService.getVoices();
      return {
        voices,
        success: true,
        total: voices.length
      };
    } catch (error) {
      console.error('❌ Get voices error:', error);
      return {
        voices: [],
        success: false,
        error: 'Failed to fetch voices'
      };
    }
  }

  @Get('elevenlabs/quota')
  async getElevenLabsQuota() {
    try {
      const quota = await this.elevenLabsService.getQuota();
      return {
        quota,
        success: true
      };
    } catch (error) {
      console.error('❌ Get quota error:', error);
      return {
        quota: null,
        success: false,
        error: 'Failed to fetch quota'
      };
    }
  }

  @Post('elevenlabs/test')
  async testElevenLabs() {
    try {
      const isWorking = await this.elevenLabsService.testConnection();
      return {
        working: isWorking,
        message: isWorking ? 'ElevenLabs connection successful' : 'ElevenLabs connection failed',
        success: isWorking
      };
    } catch (error) {
      console.error('❌ ElevenLabs test error:', error);
      return {
        working: false,
        success: false,
        error: 'Test failed'
      };
    }
  }
}

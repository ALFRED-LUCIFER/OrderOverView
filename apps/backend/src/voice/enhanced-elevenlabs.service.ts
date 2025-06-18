import { Injectable } from '@nestjs/common';

export interface ElevenLabsVoiceConfig {
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style: number;
}

export interface ElevenLabsResponse {
  audioUrl?: string;
  audioBuffer?: Buffer;
  success: boolean;
  error?: string;
}

@Injectable()
export class EnhancedElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
  }

  /**
   * Check if ElevenLabs is configured and available
   */
  isAvailable(): boolean {
    return !!(this.apiKey && this.apiKey !== 'your_elevenlabs_api_key_here');
  }

  /**
   * Get default voice configuration from environment
   */
  getDefaultVoiceConfig(): ElevenLabsVoiceConfig {
    return {
      voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
      modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1',
      stability: parseFloat(process.env.VOICE_STABILITY || '0.75'),
      similarityBoost: parseFloat(process.env.VOICE_SIMILARITY_BOOST || '0.75'),
      style: parseFloat(process.env.VOICE_STYLE || '0.2')
    };
  }

  /**
   * Convert text to speech using ElevenLabs API
   */
  async textToSpeech(
    text: string, 
    voiceConfig?: Partial<ElevenLabsVoiceConfig>
  ): Promise<ElevenLabsResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'ElevenLabs API key not configured'
      };
    }

    try {
      const config = { ...this.getDefaultVoiceConfig(), ...voiceConfig };
      
      const payload = {
        text: text.trim(),
        model_id: config.modelId,
        voice_settings: {
          stability: config.stability,
          similarity_boost: config.similarityBoost,
          style: config.style,
          use_speaker_boost: true
        }
      };

      console.log(`🎤 ElevenLabs: Converting text to speech with voice ${config.voiceId}`);

      const response = await fetch(`${this.baseUrl}/text-to-speech/${config.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail?.message || errorData.message || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      return {
        success: true,
        audioBuffer
      };

    } catch (error) {
      console.error('❌ ElevenLabs TTS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<any[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('❌ Failed to fetch ElevenLabs voices:', error);
      return [];
    }
  }

  /**
   * Get quota information
   */
  async getQuota(): Promise<any> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/user/subscription`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to fetch ElevenLabs quota:', error);
      return null;
    }
  }

  /**
   * Test ElevenLabs connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const testResult = await this.textToSpeech('Testing connection');
      return testResult.success;
    } catch (error) {
      console.error('❌ ElevenLabs connection test failed:', error);
      return false;
    }
  }
}

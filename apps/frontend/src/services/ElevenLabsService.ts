/**
 * ElevenLabs Text-to-Speech Service
 * 
 * A reliable alterna    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`ElevenLabs TTS failed: ${errorMessage}`);e to browser speechSynthesis API
 * that provides high-quality voice synthesis with better stability
 */

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category: string;
}

export interface TTSOptions {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  // LISA's voice - using a natural, professional female voice
  private readonly LISA_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Bella - warm, friendly female voice
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if needed (for Chrome autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.warn('⚠️ AudioContext initialization failed:', error);
    }
  }

  /**
   * Convert text to speech using ElevenLabs API
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!text.trim()) {
      console.warn('⚠️ Empty text provided to ElevenLabs speak()');
      return;
    }

    console.log(`🎤 ElevenLabs speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    try {
      // Stop any current audio
      this.stopSpeaking();

      const audioBlob = await this.textToSpeech(text, options);
      await this.playAudio(audioBlob);
      
    } catch (error) {
      console.error('❌ ElevenLabs speak error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`ElevenLabs TTS failed: ${errorMessage}`);
    }
  }

  /**
   * Stop current speech
   */
  stopSpeaking(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
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
      throw error;
    }
  }

  /**
   * Convert text to speech and return audio blob
   */
  private async textToSpeech(text: string, options: TTSOptions = {}): Promise<Blob> {
    const payload = {
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: options.stability ?? 0.75,
        similarity_boost: options.similarity_boost ?? 0.75,
        style: options.style ?? 0.0,
        use_speaker_boost: options.use_speaker_boost ?? true,
      },
    };

    const response = await fetch(`${this.baseUrl}/text-to-speech/${this.LISA_VOICE_ID}`, {
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
      throw new Error(errorMessage);
    }

    return await response.blob();
  }

  /**
   * Play audio blob
   */
  private async playAudio(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      this.currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        console.log('✅ ElevenLabs speech completed');
        resolve();
      };

      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        console.error('❌ Audio playback error:', error);
        reject(new Error('Audio playback failed'));
      };

      audio.oncanplaythrough = () => {
        console.log('🎤 Starting ElevenLabs audio playback');
        audio.play().catch(reject);
      };

      // Load the audio
      audio.load();
    });
  }

  /**
   * Test ElevenLabs connection and voice
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing ElevenLabs connection...');
      await this.speak('Hello, this is a test of the ElevenLabs voice service.');
      return true;
    } catch (error) {
      console.error('❌ ElevenLabs connection test failed:', error);
      return false;
    }
  }

  /**
   * Get quota information
   */
  async getQuota(): Promise<any> {
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
      throw error;
    }
  }
}

// Factory function to create ElevenLabs service with API key from environment
export const createElevenLabsService = (): ElevenLabsService | null => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ VITE_ELEVENLABS_API_KEY not found. ElevenLabs service disabled.');
    return null;
  }

  return new ElevenLabsService(apiKey);
};

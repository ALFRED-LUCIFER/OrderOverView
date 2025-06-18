/**
 * ElevenLabs Text-to-Speech Service - Enhanced with Backend Integration
 * 
 * A reliable service that provides high-quality voice synthesis through our backend,
 * which handles the ElevenLabs API integration securely and consistently.
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

export interface VoiceConfig {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface ElevenLabsStatus {
  available: boolean;
  configured: boolean;
  voiceConfig: any;
  status: string;
}

export interface ElevenLabsQuota {
  character_count: number;
  character_limit: number;
  can_extend_character_limit: boolean;
  allowed_to_extend_character_limit: boolean;
  next_character_count_reset_unix: number;
}

export class ElevenLabsService {
  private backendUrl: string;
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(backendUrl: string = 'http://localhost:3001') {
    this.backendUrl = backendUrl;
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
   * Convert text to speech using backend ElevenLabs service
   */
  async speak(text: string, voiceConfig?: VoiceConfig): Promise<void> {
    if (!text.trim()) {
      console.warn('⚠️ Empty text provided to ElevenLabs speak()');
      return;
    }

    console.log(`🎤 ElevenLabs speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    try {
      // Stop any current audio
      this.stopSpeaking();

      const audioBlob = await this.textToSpeech(text, voiceConfig);
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
   * Get ElevenLabs service status from backend
   */
  async getStatus(): Promise<ElevenLabsStatus> {
    try {
      const response = await fetch(`${this.backendUrl}/voice/elevenlabs/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get ElevenLabs status:', error);
      throw error;
    }
  }

  /**
   * Get available voices from backend
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const response = await fetch(`${this.backendUrl}/voice/elevenlabs/voices`);

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
   * Get quota information from backend
   */
  async getQuota(): Promise<ElevenLabsQuota> {
    try {
      const response = await fetch(`${this.backendUrl}/voice/elevenlabs/quota`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.quota;
    } catch (error) {
      console.error('❌ Failed to fetch ElevenLabs quota:', error);
      throw error;
    }
  }

  /**
   * Test ElevenLabs connection through backend
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing ElevenLabs connection through backend...');
      
      const response = await fetch(`${this.backendUrl}/voice/elevenlabs/test`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.working || false;
    } catch (error) {
      console.error('❌ ElevenLabs connection test failed:', error);
      return false;
    }
  }

  /**
   * Convert text to speech via backend and return audio blob
   */
  private async textToSpeech(text: string, voiceConfig?: VoiceConfig): Promise<Blob> {
    const payload = {
      text,
      voiceConfig: voiceConfig || {}
    };

    const response = await fetch(`${this.backendUrl}/voice/elevenlabs/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Ignore JSON parse errors for audio responses
      }
      throw new Error(errorMessage);
    }

    // The backend returns audio data directly
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

}

// Factory function to create ElevenLabs service
export const createElevenLabsService = (backendUrl?: string): ElevenLabsService => {
  const baseUrl = backendUrl || import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return new ElevenLabsService(baseUrl);
};

// Default instance
export const elevenLabsService = createElevenLabsService();

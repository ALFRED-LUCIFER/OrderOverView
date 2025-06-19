/**
 * Enhanced Audio Service for LISA with OpenAI TTS Support
 * Supports OpenAI TTS, ElevenLabs TTS, and Browser fallback
 */

export interface TTSOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  provider?: 'openai' | 'elevenlabs' | 'browser';
}

export interface AudioPermissionStatus {
  granted: boolean;
  userInteractionRequired: boolean;
  audioContextState: AudioContextState;
  speechSynthesisAvailable: boolean;
}

export class EnhancedAudioService {
  private isInitialized = false;
  private userInteracted = false;
  private backendUrl: string;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(backendUrl: string = 'http://localhost:3001') {
    this.backendUrl = backendUrl;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test connectivity to backend
      const response = await fetch(`${this.backendUrl}/api/voice/health`);
      if (!response.ok) {
        throw new Error('Backend voice service not available');
      }

      this.isInitialized = true;
      console.log('✅ Enhanced Audio Service initialized');
    } catch (error) {
      console.error('❌ Enhanced Audio Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Speak text using the best available TTS provider
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!text.trim()) {
      console.warn('⚠️ Empty text provided to speak()');
      return;
    }

    console.log(`🗣️ Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    try {
      // Try Browser TTS first (most reliable and fastest)
      if (!options.provider || options.provider === 'browser') {
        try {
          await this.speakWithBrowser(text, options);
          return;
        } catch (error) {
          console.warn('⚠️ Browser TTS failed, trying ElevenLabs:', error instanceof Error ? error.message : String(error));
        }
      }

      // Try ElevenLabs TTS as fallback
      if (!options.provider || options.provider === 'elevenlabs') {
        try {
          await this.speakWithElevenLabs(text);
          return;
        } catch (error) {
          console.warn('⚠️ ElevenLabs TTS failed, trying OpenAI:', error instanceof Error ? error.message : String(error));
        }
      }

      // Try OpenAI TTS as final fallback (has quota issues)
      if (!options.provider || options.provider === 'openai') {
        try {
          await this.speakWithOpenAI(text);
          return;
        } catch (error) {
          console.warn('⚠️ OpenAI TTS failed (quota exceeded):', error instanceof Error ? error.message : String(error));
        }
      }

      // If no provider specified and all failed, try browser TTS as absolute fallback
      await this.speakWithBrowser(text, options);

    } catch (error) {
      console.error('❌ All TTS methods failed:', error);
      throw new Error(`Speech synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Speak with OpenAI TTS
   */
  private async speakWithOpenAI(text: string): Promise<void> {
    const response = await fetch(`${this.backendUrl}/api/voice/openai/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const audioBlob = await response.blob();
    await this.playAudioBlob(audioBlob);
  }

  /**
   * Speak with ElevenLabs TTS
   */
  private async speakWithElevenLabs(text: string): Promise<void> {
    const response = await fetch(`${this.backendUrl}/api/voice/elevenlabs/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const audioBlob = await response.blob();
    await this.playAudioBlob(audioBlob);
  }

  /**
   * Speak with browser Speech Synthesis API
   */
  private async speakWithBrowser(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser TTS not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 0.9;

      if (options.voice) {
        utterance.voice = options.voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Browser TTS error: ${event.error}`));

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Play audio blob
   */
  private async playAudioBlob(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Stop any current audio
        this.stopSpeaking();

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          reject(new Error('Audio playback failed'));
        };

        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop current speech
   */
  stopSpeaking(): void {
    // Stop current audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // Stop browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return !!(this.currentAudio && !this.currentAudio.paused) || 
           ('speechSynthesis' in window && window.speechSynthesis.speaking);
  }

  /**
   * Test TTS providers
   */
  async testProviders(): Promise<{ openai: boolean; elevenlabs: boolean; browser: boolean }> {
    const results = { openai: false, elevenlabs: false, browser: false };

    // Test OpenAI
    try {
      const response = await fetch(`${this.backendUrl}/api/voice/openai/test`, { method: 'POST' });
      const data = await response.json();
      results.openai = data.working || false;
    } catch (error) {
      console.warn('OpenAI TTS test failed:', error);
    }

    // Test ElevenLabs
    try {
      const response = await fetch(`${this.backendUrl}/api/voice/elevenlabs/status`);
      const data = await response.json();
      results.elevenlabs = data.available || false;
    } catch (error) {
      console.warn('ElevenLabs test failed:', error);
    }

    // Test Browser
    results.browser = 'speechSynthesis' in window;

    return results;
  }

  /**
   * Get available voices for browser TTS
   */
  async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!('speechSynthesis' in window)) return [];
    
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          resolve(window.speechSynthesis.getVoices());
        };
      }
    });
  }

  /**
   * Get permissions status
   */
  async getPermissionsStatus(): Promise<AudioPermissionStatus> {
    const audioContextState = 'suspended'; // Default value
    
    return {
      granted: this.isInitialized,
      userInteractionRequired: !this.userInteracted,
      audioContextState: audioContextState as AudioContextState,
      speechSynthesisAvailable: 'speechSynthesis' in window
    };
  }

  /**
   * Mark user interaction (needed for audio autoplay)
   */
  markUserInteraction(): void {
    this.userInteracted = true;
  }
}

// Create and export default instance
export const enhancedAudioService = new EnhancedAudioService();
export default enhancedAudioService;

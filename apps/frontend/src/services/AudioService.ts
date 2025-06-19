/**
 * Chrome-compatible Audio Service for LISA Voice Bot
 * TESTING MODE: Only ElevenLabs enabled, browser TTS disabled
 */

import { ElevenLabsService, createElevenLabsService } from './ElevenLabsService';

export interface TTSOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export interface AudioPermissionStatus {
  granted: boolean;
  userInteractionRequired: boolean;
  audioContextState: AudioContextState;
  speechSynthesisAvailable: boolean;
}

export class AudioService {
  private elevenLabsService: ElevenLabsService | null = null;
  private isInitialized = false;
  private userInteracted = false;

  constructor() {
    // Initialize ElevenLabs service as primary TTS
    this.elevenLabsService = createElevenLabsService();
    if (this.elevenLabsService) {
      console.log('✅ ElevenLabs service initialized as PRIMARY TTS (TESTING MODE)');
    } else {
      console.log('❌ ElevenLabs service not available (API key missing)');
    }
  }

  /**
   * Initialize audio service - Enhanced for browser autoplay policies
   */
  async initialize(): Promise<void> {
    console.log('🎤 Initializing AudioService (ElevenLabs TESTING MODE)...');
    
    try {
      this.userInteracted = true;

      if (!this.elevenLabsService) {
        throw new Error('ElevenLabs service not available - API key missing');
      }

      // Test if we can play audio (browser autoplay policy)
      try {
        console.log('🧪 Testing audio playback capability...');
        const testBlob = new Blob([''], { type: 'audio/wav' });
        const testAudio = new Audio(URL.createObjectURL(testBlob));
        
        // Try to play and immediately pause to test autoplay policy
        const playPromise = testAudio.play();
        if (playPromise) {
          await playPromise;
          testAudio.pause();
        }
        console.log('✅ Audio playback test successful');
      } catch (autoplayError) {
        console.warn('⚠️ Audio autoplay blocked by browser:', autoplayError);
        // Continue initialization but note the limitation
      }

      this.isInitialized = true;
      console.log('✅ AudioService initialized successfully (ElevenLabs mode)');
    } catch (error) {
      console.error('❌ AudioService initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Audio initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Check audio permissions and capabilities
   */
  async checkPermissions(): Promise<AudioPermissionStatus> {
    return {
      granted: !!this.elevenLabsService,
      userInteractionRequired: !this.userInteracted,
      audioContextState: 'running',
      speechSynthesisAvailable: !!this.elevenLabsService
    };
  }

  /**
   * Request audio permissions and initialize on user interaction
   */
  async requestPermissions(): Promise<boolean> {
    console.log('🔐 Requesting audio permissions (ElevenLabs mode)...');

    try {
      if (!this.userInteracted) {
        throw new Error('User interaction required before requesting permissions');
      }

      await this.initialize();
      return true;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return false;
    }
  }

  /**
   * Speak text using ONLY ElevenLabs (browser TTS disabled for testing)
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!text.trim()) {
      console.warn('⚠️ Empty text provided to speak()');
      return;
    }

    console.log(`🗣️ Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log('🎤 Using ElevenLabs with browser TTS fallback');

    // Try ElevenLabs first
    if (this.elevenLabsService) {
      try {
        await this.elevenLabsService.speak(text);
        return;
      } catch (error) {
        console.error('❌ ElevenLabs failed:', error);
        console.log('🔄 Falling back to browser TTS...');
        
        // Fallback to browser TTS if ElevenLabs fails
        try {
          await this.speakWithBrowserTTS(text, options);
          return;
        } catch (browserError) {
          console.error('❌ Browser TTS also failed:', browserError);
          throw new Error(`Both ElevenLabs and browser TTS failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } else {
      // Use browser TTS directly if ElevenLabs not available
      console.log('🔄 ElevenLabs not available, using browser TTS...');
      try {
        await this.speakWithBrowserTTS(text, options);
        return;
      } catch (browserError) {
        console.error('❌ Browser TTS failed:', browserError);
        throw new Error(`Browser TTS failed: ${browserError instanceof Error ? browserError.message : String(browserError)}`);
      }
    }
  }

  /**
   * Browser TTS fallback method
   */
  private async speakWithBrowserTTS(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      utterance.lang = options.lang || 'en-US';

      utterance.onend = () => {
        console.log('✅ Browser TTS completed');
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('❌ Browser TTS error:', event);
        reject(new Error(`Browser TTS error: ${event.error}`));
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  stopSpeaking(): void {
    console.log('🛑 Stopping ElevenLabs speech...');
    
    if (this.elevenLabsService) {
      this.elevenLabsService.stopSpeaking();
    }
  }

  /**
   * Check if currently speaking
   */
  isCurrentlySpeaking(): boolean {
    return this.elevenLabsService ? this.elevenLabsService.isSpeaking() : false;
  }

  /**
   * Force reset speech state
   */
  resetSpeechState(): void {
    console.log('🔄 Force resetting speech state (ElevenLabs mode)...');
    this.stopSpeaking();
  }

  /**
   * Get available voices - Returns empty for ElevenLabs mode
   */
  async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    console.log('ℹ️ getAvailableVoices() called in ElevenLabs mode - returning empty array');
    return [];
  }

  /**
   * Set preferred voice - No-op in ElevenLabs mode
   */
  setPreferredVoice(voice: SpeechSynthesisVoice): void {
    console.log('ℹ️ setPreferredVoice() called in ElevenLabs mode - no action taken');
  }

  /**
   * Toggle between browser TTS and ElevenLabs - Forced to ElevenLabs
   */
  setVoiceProvider(useElevenLabs: boolean): void {
    console.log(`ℹ️ setVoiceProvider(${useElevenLabs}) called - forced to ElevenLabs in testing mode`);
  }

  /**
   * Get current voice provider
   */
  getVoiceProvider(): 'browser' | 'elevenlabs' | 'unavailable' {
    return this.elevenLabsService ? 'elevenlabs' : 'unavailable';
  }

  /**
   * Check if ElevenLabs is available and working
   */
  async isElevenLabsAvailable(): Promise<boolean> {
    if (!this.elevenLabsService) {
      return false;
    }
    
    try {
      return await this.elevenLabsService.testConnection();
    } catch (error) {
      console.warn('ElevenLabs availability check failed:', error);
      return false;
    }
  }

  /**
   * Get voice provider status
   */
  async getVoiceProviderStatus(): Promise<{
    browserTTS: { available: boolean; working: boolean };
    elevenLabs: { available: boolean; working: boolean };
    current: 'browser' | 'elevenlabs' | 'unavailable';
  }> {
    const elevenLabsAvailable = !!this.elevenLabsService;
    const elevenLabsWorking = elevenLabsAvailable ? await this.isElevenLabsAvailable() : false;
    
    return {
      browserTTS: { available: false, working: false }, // Disabled for testing
      elevenLabs: { available: elevenLabsAvailable, working: elevenLabsWorking },
      current: this.getVoiceProvider()
    };
  }

  /**
   * Get debug information about the audio service state
   */
  public getDebugInfo(): object {
    return {
      mode: 'ELEVENLABS_TESTING_ONLY',
      isInitialized: this.isInitialized,
      userInteracted: this.userInteracted,
      elevenLabsAvailable: !!this.elevenLabsService,
      currentProvider: this.getVoiceProvider(),
      browserTTSDisabled: true
    };
  }

  /**
   * Play audio buffer directly (for AI provider audio responses)
   */
  async playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      console.log('🔊 Playing audio buffer...');
      
      // Create blob from buffer
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio element
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        
        audio.play().catch(reject);
      });
      
    } catch (error) {
      console.error('❌ Failed to play audio buffer:', error);
      throw error;
    }
  }
}

// Singleton instance
export const audioService = new AudioService();
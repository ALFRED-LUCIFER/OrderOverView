/**
 * Chrome-compatible Audio Service for LISA Voice Bot
 * Handles TTS, permissions, and Chrome autoplay policy
 */

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
  private audioContext: AudioContext | null = null;
  private speechSynthesis: SpeechSynthesis;
  private isInitialized = false;
  private userInteracted = false;
  private voicesLoaded = false;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechQueue: Array<{ text: string; options?: TTSOptions; resolve: () => void; reject: (error: Error) => void }> = [];
  private isSpeaking = false;
  private speechTimeout: NodeJS.Timeout | null = null;
  private speechStartTime: number = 0;

  constructor() {
    // Safely assign speechSynthesis, handle cases where it might be undefined
    this.speechSynthesis = window.speechSynthesis;
    if (!this.speechSynthesis) {
      console.warn('⚠️ window.speechSynthesis is not available in this environment');
    }
    this.setupVoiceLoadingHandler();
    this.setupPageVisibilityHandler();
  }

  /**
   * Initialize audio service with user interaction (required for Chrome)
   */
  async initialize(): Promise<void> {
    console.log('🎤 Initializing AudioService...');
    
    try {
      // Mark user interaction
      this.userInteracted = true;

      // Initialize audio context
      await this.initializeAudioContext();

      // Wait for voices to load
      await this.waitForVoices();

      // Select preferred voice
      this.selectPreferredVoice();

      // Test TTS with silent utterance
      await this.testTTSCapability();

      this.isInitialized = true;
      console.log('✅ AudioService initialized successfully');
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
    const status: AudioPermissionStatus = {
      granted: false,
      userInteractionRequired: !this.userInteracted,
      audioContextState: this.audioContext?.state || 'suspended',
      speechSynthesisAvailable: 'speechSynthesis' in window
    };

    try {
      // Check if we can create audio context
      if (!this.audioContext && this.userInteracted) {
        await this.initializeAudioContext();
      }

      status.granted = this.isInitialized && 
                      this.audioContext?.state === 'running' && 
                      this.voicesLoaded;
    } catch (error) {
      console.warn('Permission check failed:', error);
    }

    return status;
  }

  /**
   * Request audio permissions and initialize on user interaction
   */
  async requestPermissions(): Promise<boolean> {
    console.log('🔐 Requesting audio permissions...');

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
   * Speak text using TTS with Chrome-specific handling
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!text.trim()) {
      console.warn('⚠️ Empty text provided to speak()');
      return;
    }

    console.log(`🗣️ Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`🔍 Speech state - isSpeaking: ${this.isSpeaking}, queueLength: ${this.speechQueue.length}`);

    return new Promise((resolve, reject) => {
      // Check if speechSynthesis is available first
      if (!this.speechSynthesis) {
        console.error('❌ speechSynthesis not available');
        reject(new Error('speechSynthesis not available in this environment'));
        return;
      }

      // Stop any current speech before starting new one
      if (this.isSpeaking) {
        console.log('🛑 Stopping current speech to start new one...');
        this.stopSpeaking();
      }

      // Add to queue if currently speaking (after stop attempt)
      if (this.isSpeaking) {
        console.log('📝 Adding to speech queue...');
        this.speechQueue.push({ text, options, resolve, reject });
        return;
      }

      this.performSpeech(text, options, resolve, reject);
    });
  }

  /**
   * Stop current speech and clear queue
   */
  stopSpeaking(): void {
    console.log('🛑 Stopping speech...');
    
    this.clearSpeechTimeout();
    
    // Check if speechSynthesis is available before trying to cancel
    if (this.speechSynthesis && typeof this.speechSynthesis.cancel === 'function') {
      this.speechSynthesis.cancel();
    } else {
      console.warn('⚠️ speechSynthesis not available or cancel method not found');
    }
    
    this.currentUtterance = null;
    this.isSpeaking = false;
    
    // Reject all queued speeches
    this.speechQueue.forEach(({ reject }) => {
      reject(new Error('Speech interrupted'));
    });
    this.speechQueue = [];
  }

  /**
   * Force reset speech state if it gets stuck
   */
  resetSpeechState(): void {
    console.log('🔄 Force resetting speech state...');
    this.clearSpeechTimeout();
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.speechQueue = [];
    
    if (this.speechSynthesis && typeof this.speechSynthesis.cancel === 'function') {
      this.speechSynthesis.cancel();
    }
  }

  private clearSpeechTimeout(): void {
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
  }

  private forceSpeechReset(): void {
    console.log('🚨 Force resetting stuck speech state');
    this.clearSpeechTimeout();
    this.isSpeaking = false;
    this.currentUtterance = null;
    
    if (this.speechSynthesis && typeof this.speechSynthesis.cancel === 'function') {
      this.speechSynthesis.cancel();
    }
  }

  /**
   * Get available voices (async-safe)
   */
  async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    await this.waitForVoices();
    return this.availableVoices;
  }

  /**
   * Set preferred voice for LISA
   */
  setPreferredVoice(voice: SpeechSynthesisVoice): void {
    this.preferredVoice = voice;
    console.log(`🎭 Set preferred voice: ${voice.name} (${voice.lang})`);
  }

  /**
   * Get current audio context state for debugging
   */
  getDebugInfo(): object {
    return {
      isInitialized: this.isInitialized,
      userInteracted: this.userInteracted,
      voicesLoaded: this.voicesLoaded,
      audioContextState: this.audioContext?.state,
      speechSynthesisAvailable: 'speechSynthesis' in window,
      currentVoice: this.preferredVoice?.name,
      isSpeaking: this.isSpeaking,
      queueLength: this.speechQueue.length,
      availableVoicesCount: this.availableVoices.length
    };
  }

  // Private methods

  private async initializeAudioContext(): Promise<void> {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return;
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log(`✅ AudioContext created: ${this.audioContext.state}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create AudioContext: ${errorMessage}`);
    }
  }

  private setupVoiceLoadingHandler(): void {
    // Check if speechSynthesis is available
    if (!this.speechSynthesis) {
      console.warn('⚠️ speechSynthesis not available, skipping voice loading setup');
      return;
    }

    // Handle voice loading
    const loadVoices = () => {
      if (!this.speechSynthesis) return;
      
      this.availableVoices = this.speechSynthesis.getVoices();
      if (this.availableVoices.length > 0) {
        this.voicesLoaded = true;
        console.log(`✅ Loaded ${this.availableVoices.length} voices`);
        this.selectPreferredVoice();
      }
    };

    // Load voices immediately if available
    loadVoices();

    // Handle async voice loading
    this.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }

  private setupPageVisibilityHandler(): void {
    // Handle page visibility changes (Chrome suspends audio contexts)
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden && this.audioContext?.state === 'suspended') {
        try {
          await this.audioContext.resume();
          console.log('🔄 Resumed audio context after visibility change');
        } catch (error) {
          console.warn('Failed to resume audio context:', error);
        }
      }
    });
  }

  private async waitForVoices(timeout = 5000): Promise<void> {
    if (this.voicesLoaded) return;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkVoices = () => {
        if (this.voicesLoaded) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          console.warn('⚠️ Voice loading timeout, using default voice');
          this.voicesLoaded = true;
          resolve();
          return;
        }

        setTimeout(checkVoices, 100);
      };

      checkVoices();
    });
  }

  private selectPreferredVoice(): void {
    if (!this.voicesLoaded || this.availableVoices.length === 0) return;

    // Prefer female English voices for LISA
    const femaleEnglishVoices = this.availableVoices.filter(voice => 
      voice.lang.startsWith('en') && (
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('moira') ||
        voice.name.toLowerCase().includes('susan') ||
        voice.name.toLowerCase().includes('victoria')
      )
    );

    // Fallback to any English voice
    const englishVoices = this.availableVoices.filter(voice => 
      voice.lang.startsWith('en')
    );

    this.preferredVoice = femaleEnglishVoices[0] || 
                         englishVoices[0] || 
                         this.availableVoices[0];

    if (this.preferredVoice) {
      console.log(`🎭 Selected voice for LISA: ${this.preferredVoice.name} (${this.preferredVoice.lang})`);
    }
  }

  private async testTTSCapability(): Promise<void> {
    console.log('🧪 Testing TTS capability...');
    
    return new Promise((resolve, reject) => {
      // Create a very short, silent utterance for testing
      const testUtterance = new SpeechSynthesisUtterance(' ');
      testUtterance.volume = 0.01; // Very quiet but not completely silent
      testUtterance.rate = 10; // Speak very fast
      testUtterance.pitch = 1;
      
      let resolved = false;
      
      testUtterance.onend = () => {
        if (!resolved) {
          resolved = true;
          console.log('✅ TTS capability test passed');
          resolve();
        }
      };
      
      testUtterance.onerror = (event) => {
        if (!resolved) {
          resolved = true;
          console.warn('⚠️ TTS test error (may be normal):', event.error);
          // Don't reject on error, as Chrome might block but still work later
          resolve();
        }
      };
      
      // Timeout for test - don't wait too long
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log('✅ TTS test completed (timeout)');
          resolve();
        }
      }, 500);
      
      try {
        // Check if speechSynthesis is available before testing
        if (!this.speechSynthesis) {
          if (!resolved) {
            resolved = true;
            console.warn('⚠️ speechSynthesis not available for testing');
            resolve(); // Don't fail initialization, just skip the test
          }
          return;
        }
        
        this.speechSynthesis.speak(testUtterance);
      } catch (error) {
        if (!resolved) {
          resolved = true;
          console.warn('⚠️ TTS test exception (may be normal):', error);
          resolve(); // Don't fail initialization on test errors
        }
      }
    });
  }

  private performSpeech(
    text: string, 
    options: TTSOptions = {}, 
    resolve: () => void, 
    reject: (error: Error) => void
  ): void {
    try {
      console.log('🎤 Starting speech synthesis...');
      console.log(`🔍 Available voices: ${this.availableVoices.length}, Preferred voice: ${this.preferredVoice?.name || 'none'}`);
      
      this.isSpeaking = true;
      this.speechStartTime = Date.now();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice and speech parameters
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
        console.log(`🎭 Using voice: ${this.preferredVoice.name}`);
      } else {
        console.log('⚠️ No preferred voice set, using default');
      }

      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 0.8;
      utterance.lang = options.lang || 'en-US';

      console.log(`🎚️ Speech params - rate: ${utterance.rate}, pitch: ${utterance.pitch}, volume: ${utterance.volume}, lang: ${utterance.lang}`);

      // Set up timeout to prevent stuck state (estimate: 10 chars per second at 0.9 rate)
      const estimatedDuration = Math.max(3000, (text.length / 10) * 1000 / utterance.rate);
      const timeoutDuration = Math.min(estimatedDuration + 5000, 30000); // Max 30 seconds
      
      console.log(`⏱️ Setting speech timeout: ${timeoutDuration}ms for text length: ${text.length}`);
      
      this.speechTimeout = setTimeout(() => {
        console.warn('⚠️ Speech timeout - forcing reset');
        this.forceSpeechReset();
        reject(new Error('Speech timeout - utterance took too long'));
      }, timeoutDuration);

      let callbackFired = false;

      // Handle completion
      utterance.onend = () => {
        if (callbackFired) return;
        callbackFired = true;
        
        console.log('✅ Speech completed');
        this.clearSpeechTimeout();
        this.isSpeaking = false;
        this.currentUtterance = null;
        resolve();
        this.processQueue();
      };

      // Handle errors with Chrome-specific handling
      utterance.onerror = (event) => {
        if (callbackFired) return;
        callbackFired = true;
        
        console.error('❌ Speech error:', event.error, event);
        this.clearSpeechTimeout();
        this.isSpeaking = false;
        this.currentUtterance = null;
        
        // Handle Chrome-specific autoplay policy errors
        if (event.error === 'not-allowed') {
          reject(new Error('Audio blocked by browser autoplay policy - user interaction required'));
        } else if (event.error === 'interrupted') {
          reject(new Error('Speech was interrupted'));
        } else {
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        }
        
        this.processQueue();
      };

      // Handle interruption
      utterance.onstart = () => {
        console.log('🎤 Speech started');
      };

      this.currentUtterance = utterance;
      
      // Check if speechSynthesis is available before speaking
      if (!this.speechSynthesis) {
        console.error('❌ speechSynthesis not available at speech time');
        this.clearSpeechTimeout();
        this.isSpeaking = false;
        reject(new Error('speechSynthesis not available in this environment'));
        this.processQueue();
        return;
      }
      
      // Check if speechSynthesis has speak method
      if (typeof this.speechSynthesis.speak !== 'function') {
        console.error('❌ speechSynthesis.speak is not a function');
        this.clearSpeechTimeout();
        this.isSpeaking = false;
        reject(new Error('speechSynthesis.speak method not available'));
        this.processQueue();
        return;
      }

      console.log('🚀 Calling speechSynthesis.speak()...');
      this.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('❌ Exception in performSpeech:', error);
      this.clearSpeechTimeout();
      this.isSpeaking = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reject(new Error(`Failed to perform speech: ${errorMessage}`));
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.speechQueue.length === 0 || this.isSpeaking) return;

    const { text, options, resolve, reject } = this.speechQueue.shift()!;
    this.performSpeech(text, options, resolve, reject);
  }
}

// Singleton instance
export const audioService = new AudioService();

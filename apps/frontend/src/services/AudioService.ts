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
    
    // Chrome-specific: Try to load voices immediately
    this.loadVoicesImmediately();
  }

  /**
   * Chrome-specific: Force voice loading
   */
  private loadVoicesImmediately(): void {
    if (!this.speechSynthesis) return;
    
    // Chrome sometimes requires calling getVoices() multiple times
    const loadAttempt = () => {
      const voices = this.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.availableVoices = voices;
        this.voicesLoaded = true;
        console.log(`✅ Loaded ${voices.length} voices immediately`);
        this.selectPreferredVoice();
      }
    };
    
    // Try multiple times with delays
    loadAttempt();
    setTimeout(loadAttempt, 10);
    setTimeout(loadAttempt, 50);
    setTimeout(loadAttempt, 100);
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

      // Wait for voices to load with multiple attempts
      await this.waitForVoices();

      // Select preferred voice
      this.selectPreferredVoice();

      // Chrome-specific: Cancel any pending speech
      if (this.speechSynthesis) {
        this.speechSynthesis.cancel();
      }

      // Test TTS with a proper test
      await this.testTTSCapability();

      this.isInitialized = true;
      console.log('✅ AudioService initialized successfully');
      console.log('🔍 Debug info:', this.getDebugInfo());
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

    // Ensure we're initialized
    if (!this.isInitialized) {
      console.warn('⚠️ AudioService not initialized, attempting to initialize...');
      try {
        await this.initialize();
      } catch (error) {
        throw new Error('Cannot speak: Audio service not initialized');
      }
    }

    return new Promise((resolve, reject) => {
      // Check if speechSynthesis is available first
      if (!this.speechSynthesis) {
        console.error('❌ speechSynthesis not available');
        reject(new Error('speechSynthesis not available in this environment'));
        return;
      }

      // Chrome-specific: Always cancel before speaking to clear any stuck state
      if (this.speechSynthesis) {
        this.speechSynthesis.cancel();
        
        // Check if we need to wait for cancel to take effect
        if (this.speechSynthesis.speaking || this.speechSynthesis.pending) {
          console.warn('⚠️ Speech synthesis still busy after cancel');
        }
      }

      // Check for stuck state and auto-recover
      if (this.autoRecoverIfStuck()) {
        console.log('🔄 Recovered from stuck state, continuing...');
      }

      // Add to queue if currently speaking
      if (this.isSpeaking) {
        console.log('📝 Adding to speech queue...');
        this.speechQueue.push({ text, options, resolve, reject });
        return;
      }

      // Small delay to ensure Chrome is ready after cancel
      setTimeout(() => {
        this.performSpeech(text, options, resolve, reject);
      }, 10);
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
    
    // Give Chrome a moment to reset
    setTimeout(() => {
      console.log('✅ Speech state reset complete');
    }, 100);
  }

  /**
   * Check if speech synthesis is truly stuck and auto-recover
   */
  autoRecoverIfStuck(): boolean {
    if (!this.isSpeaking) return false;
    
    const timeSinceStart = Date.now() - this.speechStartTime;
    const isActuallySpeaking = this.speechSynthesis?.speaking || false;
    
    // If we think we're speaking but Chrome says we're not, and it's been more than 2 seconds
    if (!isActuallySpeaking && timeSinceStart > 2000) {
      console.warn('🚨 Detected stuck speech state, auto-recovering...');
      this.resetSpeechState();
      return true;
    }
    
    return false;
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
      availableVoicesCount: this.availableVoices.length,
      speechSynthesisSpeaking: this.speechSynthesis?.speaking,
      speechSynthesisPending: this.speechSynthesis?.pending,
      speechSynthesisPaused: this.speechSynthesis?.paused
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
      
      const voices = this.speechSynthesis.getVoices();
      if (voices.length > 0 && !this.voicesLoaded) {
        this.availableVoices = voices;
        this.voicesLoaded = true;
        console.log(`✅ Loaded ${voices.length} voices via event`);
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
    if (this.voicesLoaded && this.availableVoices.length > 0) return;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkVoices = () => {
        // Try to get voices
        if (this.speechSynthesis) {
          const voices = this.speechSynthesis.getVoices();
          if (voices.length > 0) {
            this.availableVoices = voices;
            this.voicesLoaded = true;
            console.log(`✅ Loaded ${voices.length} voices in waitForVoices`);
            resolve();
            return;
          }
        }

        if (this.voicesLoaded && this.availableVoices.length > 0) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          console.warn('⚠️ Voice loading timeout, continuing anyway');
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
    if (!this.availableVoices || this.availableVoices.length === 0) {
      console.warn('⚠️ No voices available to select from');
      return;
    }

    // Log all available voices for debugging
    console.log('📋 Available voices:');
    this.availableVoices.forEach((voice, index) => {
      console.log(`  ${index}: ${voice.name} (${voice.lang}) ${voice.localService ? '[local]' : '[remote]'}`);
    });

    // Prefer female English voices for LISA
    const femaleEnglishVoices = this.availableVoices.filter(voice => 
      voice.lang.startsWith('en') && (
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('moira') ||
        voice.name.toLowerCase().includes('susan') ||
        voice.name.toLowerCase().includes('victoria') ||
        voice.name.toLowerCase().includes('zira') || // Windows
        voice.name.toLowerCase().includes('helena') // Windows
      )
    );

    // Fallback to any English voice
    const englishVoices = this.availableVoices.filter(voice => 
      voice.lang.startsWith('en')
    );

    // Prefer local voices for better performance
    const preferLocal = (voices: SpeechSynthesisVoice[]) => {
      const localVoices = voices.filter(v => v.localService);
      return localVoices.length > 0 ? localVoices : voices;
    };

    this.preferredVoice = preferLocal(femaleEnglishVoices)[0] || 
                         preferLocal(englishVoices)[0] || 
                         this.availableVoices[0];

    if (this.preferredVoice) {
      console.log(`🎭 Selected voice for LISA: ${this.preferredVoice.name} (${this.preferredVoice.lang})`);
    }
  }

  private async testTTSCapability(): Promise<void> {
    console.log('🧪 Testing TTS capability...');
    
    return new Promise((resolve, reject) => {
      if (!this.speechSynthesis) {
        console.warn('⚠️ speechSynthesis not available for testing');
        resolve();
        return;
      }

      // Chrome-specific: Clear any pending speech
      this.speechSynthesis.cancel();

      // Create a proper test utterance
      const testUtterance = new SpeechSynthesisUtterance('test');
      testUtterance.volume = 0.1; // Low volume but audible
      testUtterance.rate = 2; // Fast rate
      
      if (this.preferredVoice) {
        testUtterance.voice = this.preferredVoice;
      }
      
      let resolved = false;
      const resolveOnce = () => {
        if (!resolved) {
          resolved = true;
          console.log('✅ TTS capability test passed');
          resolve();
        }
      };
      
      testUtterance.onend = resolveOnce;
      testUtterance.onerror = (event) => {
        console.warn('⚠️ TTS test error:', event.error);
        resolveOnce();
      };
      
      // Timeout for test
      setTimeout(resolveOnce, 1000);
      
      try {
        this.speechSynthesis.speak(testUtterance);
      } catch (error) {
        console.warn('⚠️ TTS test exception:', error);
        resolveOnce();
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
      if (this.preferredVoice && this.availableVoices.includes(this.preferredVoice)) {
        utterance.voice = this.preferredVoice;
        console.log(`🎭 Using voice: ${this.preferredVoice.name}`);
      } else if (this.availableVoices.length > 0) {
        // Fallback to first available voice
        utterance.voice = this.availableVoices[0];
        console.log(`🎭 Using fallback voice: ${this.availableVoices[0].name}`);
      } else {
        console.warn('⚠️ No voices available, using browser default');
      }

      // Use reasonable defaults for Chrome
      utterance.rate = options.rate ?? 1.0; // Chrome works better with 1.0
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0; // Full volume by default
      utterance.lang = options.lang || utterance.voice?.lang || 'en-US';

      console.log(`🎚️ Speech params - rate: ${utterance.rate}, pitch: ${utterance.pitch}, volume: ${utterance.volume}, lang: ${utterance.lang}`);

      // Set up timeout - Chrome-specific: Use shorter, more realistic timeouts
      const wordsCount = text.split(' ').length;
      const estimatedDuration = Math.max(2000, (wordsCount * 600) / utterance.rate); // 600ms per word
      const timeoutDuration = Math.min(estimatedDuration + 3000, 15000); // Max 15 seconds
      
      console.log(`⏱️ Setting speech timeout: ${timeoutDuration}ms for ${wordsCount} words`);
      
      this.speechTimeout = setTimeout(() => {
        console.warn('⚠️ Speech timeout - Chrome may have failed to start speech');
        
        // Check if speech actually started
        if (this.speechSynthesis?.speaking) {
          console.log('🔄 Speech is still active, extending timeout...');
          // Extend timeout if speech is actually running
          this.speechTimeout = setTimeout(() => {
            this.forceSpeechReset();
            reject(new Error('Speech timeout - utterance took too long'));
            this.processQueue();
          }, 10000); // Additional 10 seconds
        } else {
          console.log('🚨 Speech never started, resetting immediately');
          this.forceSpeechReset();
          reject(new Error('Speech failed to start - Chrome audio issue'));
          this.processQueue();
        }
      }, timeoutDuration);

      let callbackFired = false;

      // Handle completion
      utterance.onend = () => {
        if (callbackFired) return;
        callbackFired = true;
        
        const duration = Date.now() - this.speechStartTime;
        console.log(`✅ Speech completed in ${duration}ms`);
        this.clearSpeechTimeout();
        this.isSpeaking = false;
        this.currentUtterance = null;
        resolve();
        this.processQueue();
      };

      // Handle errors
      utterance.onerror = (event) => {
        if (callbackFired) return;
        callbackFired = true;
        
        console.error('❌ Speech error:', event.error, 'at time:', event.elapsedTime);
        this.clearSpeechTimeout();
        this.isSpeaking = false;
        this.currentUtterance = null;
        
        // Handle specific Chrome errors
        if (event.error === 'not-allowed') {
          reject(new Error('Audio blocked by browser - user interaction required'));
        } else if (event.error === 'canceled' || event.error === 'interrupted') {
          // This is often normal, don't treat as error
          console.log('🔄 Speech was interrupted/canceled');
          resolve();
        } else if (event.error === 'audio-busy') {
          // Chrome-specific: Audio system is busy
          console.log('🔄 Audio busy, will retry');
          resolve();
        } else {
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        }
        
        this.processQueue();
      };

      // Handle start
      utterance.onstart = () => {
        console.log('🎤 Speech started');
      };

      // Additional event handlers for debugging
      utterance.onpause = () => {
        console.log('⏸️ Speech paused');
      };

      utterance.onresume = () => {
        console.log('▶️ Speech resumed');
      };

      this.currentUtterance = utterance;
      
      // Speak!
      console.log('🚀 Calling speechSynthesis.speak()...');
      this.speechSynthesis.speak(utterance);
      
      // Chrome-specific: Monitor speech state to catch stuck conditions
      let checkAttempts = 0;
      const maxCheckAttempts = 30; // 3 seconds worth of checks
      
      const monitorSpeech = () => {
        checkAttempts++;
        
        if (callbackFired) {
          return; // Speech completed normally
        }
        
        if (checkAttempts >= maxCheckAttempts) {
          if (!this.speechSynthesis.speaking && !this.speechSynthesis.pending) {
            console.warn('⚠️ Speech appears stuck - forcing completion');
            if (!callbackFired) {
              callbackFired = true;
              this.clearSpeechTimeout();
              this.isSpeaking = false;
              this.currentUtterance = null;
              resolve(); // Treat as successful completion
              this.processQueue();
            }
          }
          return;
        }
        
        // Log state every 10 checks (1 second)
        if (checkAttempts % 10 === 0) {
          console.log('🔍 Speech monitor state:', {
            speaking: this.speechSynthesis.speaking,
            pending: this.speechSynthesis.pending,
            paused: this.speechSynthesis.paused,
            attempts: checkAttempts
          });
        }
        
        setTimeout(monitorSpeech, 100);
      };
      
      // Start monitoring after a brief delay
      setTimeout(monitorSpeech, 200);

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
    
    // Small delay to ensure Chrome is ready
    setTimeout(() => {
      this.performSpeech(text, options, resolve, reject);
    }, 50);
  }
}

// Singleton instance
export const audioService = new AudioService();
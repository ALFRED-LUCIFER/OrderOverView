export interface VoiceActivityConfig {
  threshold: number;
  windowSize: number;
  smoothingFactor: number;
  minSpeechDuration: number;
  maxSilenceDuration: number;
}

export interface VoiceActivityResult {
  isSpeaking: boolean;
  confidence: number;
  volume: number;
  pitch: number;
  spectralCentroid: number;
}

export interface WakeWordConfig {
  enabled: boolean;
  phrase: string;
  sensitivity: number;
  timeoutMs: number;
}

export class VoiceActivityDetection {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isActive = false;
  private volumeHistory: number[] = [];
  private lastSpeechTime = 0;
  private lastSilenceTime = 0;
  private wakeLockSentinel: any = null;

  private config: VoiceActivityConfig = {
    threshold: 0.02,
    windowSize: 512,
    smoothingFactor: 0.8,
    minSpeechDuration: 500,
    maxSilenceDuration: 1500
  };

  private wakeWordConfig: WakeWordConfig = {
    enabled: false,
    phrase: 'hey lisa',
    sensitivity: 0.8,
    timeoutMs: 5000
  };

  private callbacks: {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onVolumeChange?: (volume: number) => void;
    onWakeWord?: () => void;
    onError?: (error: Error) => void;
  } = {};

  constructor(config?: Partial<VoiceActivityConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize voice activity detection
   */
  async initialize(stream: MediaStream): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });

      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create audio source from microphone
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.windowSize * 2;
      this.analyser.smoothingTimeConstant = this.config.smoothingFactor;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // Create script processor for real-time analysis
      this.processor = this.audioContext.createScriptProcessor(this.config.windowSize, 1, 1);
      
      // Connect audio graph
      this.microphone.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Set up audio processing
      this.processor.onaudioprocess = (event) => {
        if (this.isActive) {
          this.processAudioFrame(event);
        }
      };

      // Request wake lock to prevent sleep during voice detection
      await this.requestWakeLock();

      console.log('✅ Voice Activity Detection initialized');

    } catch (error) {
      console.error('❌ VAD initialization failed:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Start voice activity detection
   */
  start(): void {
    this.isActive = true;
    this.volumeHistory = [];
    this.lastSpeechTime = 0;
    this.lastSilenceTime = Date.now();
    console.log('🎤 Voice Activity Detection started');
  }

  /**
   * Stop voice activity detection
   */
  stop(): void {
    this.isActive = false;
    console.log('🛑 Voice Activity Detection stopped');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.releaseWakeLock();
    
    console.log('🧹 Voice Activity Detection destroyed');
  }

  /**
   * Process each audio frame for voice activity
   */
  private processAudioFrame(event: AudioProcessingEvent): void {
    const inputBuffer = event.inputBuffer;
    const inputData = inputBuffer.getChannelData(0);
    const bufferLength = this.analyser!.frequencyBinCount;
    
    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser!.getByteFrequencyData(frequencyData);
    
    // Get time domain data
    const timeData = new Uint8Array(bufferLength);
    this.analyser!.getByteTimeDomainData(timeData);
    
    // Calculate voice activity metrics
    const result = this.analyzeAudioFrame(inputData, frequencyData, timeData);
    
    // Update volume history
    this.volumeHistory.push(result.volume);
    if (this.volumeHistory.length > 10) {
      this.volumeHistory.shift();
    }
    
    // Detect speech state changes
    this.detectSpeechStateChange(result);
    
    // Notify volume changes
    this.callbacks.onVolumeChange?.(result.volume);
  }

  /**
   * Analyze audio frame for voice characteristics
   */
  private analyzeAudioFrame(
    timeData: Float32Array,
    frequencyData: Uint8Array,
    timeDomainData: Uint8Array
  ): VoiceActivityResult {
    // Calculate RMS energy (volume)
    let rmsEnergy = 0;
    for (let i = 0; i < timeData.length; i++) {
      rmsEnergy += timeData[i] * timeData[i];
    }
    const volume = Math.sqrt(rmsEnergy / timeData.length);
    
    // Calculate zero crossing rate (pitch indicator)
    let zeroCrossings = 0;
    for (let i = 1; i < timeDomainData.length; i++) {
      if ((timeDomainData[i] >= 128) !== (timeDomainData[i - 1] >= 128)) {
        zeroCrossings++;
      }
    }
    const pitch = zeroCrossings / timeDomainData.length;
    
    // Calculate spectral centroid (frequency distribution)
    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = frequencyData[i] / 255;
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    
    // Determine if speaking based on multiple factors
    const isSpeaking = this.isSpeechDetected(volume, pitch, spectralCentroid);
    const confidence = this.calculateConfidence(volume, pitch, spectralCentroid);
    
    return {
      isSpeaking,
      confidence,
      volume: volume * 100, // Convert to percentage
      pitch,
      spectralCentroid
    };
  }

  /**
   * Determine if speech is detected based on audio characteristics
   */
  private isSpeechDetected(volume: number, pitch: number, spectralCentroid: number): boolean {
    // Multi-factor speech detection
    const volumeCheck = volume > this.config.threshold;
    const pitchCheck = pitch > 0.02 && pitch < 0.8; // Typical speech range
    const frequencyCheck = spectralCentroid > 10 && spectralCentroid < 100; // Speech frequency range
    
    // Require at least volume + one other factor
    return volumeCheck && (pitchCheck || frequencyCheck);
  }

  /**
   * Calculate confidence score for speech detection
   */
  private calculateConfidence(volume: number, pitch: number, spectralCentroid: number): number {
    const volumeScore = Math.min(volume / this.config.threshold, 1.0);
    const pitchScore = (pitch > 0.02 && pitch < 0.8) ? 1.0 : 0.0;
    const frequencyScore = (spectralCentroid > 10 && spectralCentroid < 100) ? 1.0 : 0.0;
    
    return (volumeScore + pitchScore + frequencyScore) / 3;
  }

  /**
   * Detect speech state changes and trigger callbacks
   */
  private detectSpeechStateChange(result: VoiceActivityResult): void {
    const now = Date.now();
    
    if (result.isSpeaking) {
      // Speech detected
      if (now - this.lastSpeechTime > this.config.minSpeechDuration) {
        // Speech started
        if (now - this.lastSilenceTime > this.config.maxSilenceDuration) {
          this.callbacks.onSpeechStart?.();
          console.log('🗣️ Speech started');
        }
      }
      this.lastSpeechTime = now;
    } else {
      // Silence detected
      if (now - this.lastSilenceTime > this.config.maxSilenceDuration) {
        // Silence period ended speech
        if (this.lastSpeechTime > 0) {
          this.callbacks.onSpeechEnd?.();
          console.log('🤐 Speech ended');
        }
      }
      this.lastSilenceTime = now;
    }
  }

  /**
   * Configure wake word detection
   */
  configureWakeWord(config: Partial<WakeWordConfig>): void {
    this.wakeWordConfig = { ...this.wakeWordConfig, ...config };
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onVolumeChange?: (volume: number) => void;
    onWakeWord?: () => void;
    onError?: (error: Error) => void;
  }): void {
    this.callbacks = callbacks;
  }

  /**
   * Get current voice activity status
   */
  getStatus(): {
    isActive: boolean;
    currentVolume: number;
    averageVolume: number;
    isSpeaking: boolean;
  } {
    const currentVolume = this.volumeHistory[this.volumeHistory.length - 1] || 0;
    const averageVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length || 0;
    
    return {
      isActive: this.isActive,
      currentVolume,
      averageVolume,
      isSpeaking: currentVolume > this.config.threshold
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceActivityConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('📝 VAD configuration updated:', this.config);
  }

  /**
   * Request wake lock to prevent device sleep
   */
  private async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        console.log('🔒 Wake lock acquired');
      }
    } catch (error) {
      console.log('⚠️ Wake lock not supported or failed:', error);
    }
  }

  /**
   * Release wake lock
   */
  private releaseWakeLock(): void {
    if (this.wakeLockSentinel) {
      this.wakeLockSentinel.release();
      this.wakeLockSentinel = null;
      console.log('🔓 Wake lock released');
    }
  }
}

import { VoiceActivityDetection, VoiceActivityConfig } from './VoiceActivityDetection';
import { elevenLabsService, ElevenLabsService } from './ElevenLabsService';

export interface EnhancedVoiceConfig {
  sttProvider: 'browser' | 'whisper' | 'deepgram';
  ttsProvider: 'browser' | 'elevenlabs' | 'openai';
  enableVAD: boolean;
  enableInterruption: boolean;
  enableWakeWord: boolean;
  autoRestart: boolean;
  vadConfig?: Partial<VoiceActivityConfig>;
}

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  currentVolume: number;
  isConnected: boolean;
  hasPermission: boolean;
  error?: string;
}

export class EnhancedVoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private vad: VoiceActivityDetection | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;
  private isInterrupted = false;
  private recordingTimeout: NodeJS.Timeout | null = null;

  private config: EnhancedVoiceConfig = {
    sttProvider: 'browser',
    ttsProvider: 'browser',
    enableVAD: true,
    enableInterruption: true,
    enableWakeWord: false,
    autoRestart: true
  };

  private state: VoiceState = {
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    currentVolume: 0,
    isConnected: false,
    hasPermission: false
  };

  private callbacks: {
    onTranscript?: (text: string, isInterim: boolean) => void;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onVolumeChange?: (volume: number) => void;
    onStateChange?: (state: VoiceState) => void;
    onError?: (error: Error) => void;
    onWakeWord?: () => void;
  } = {};

  constructor(config?: Partial<EnhancedVoiceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.speechSynthesis = window.speechSynthesis;
    this.setupVAD();
  }

  /**
   * Initialize the enhanced voice service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🎤 Initializing Enhanced Voice Service...');
      
      // Request microphone permission
      await this.requestMicrophonePermission();
      
      // Setup voice activity detection if enabled
      if (this.config.enableVAD && this.mediaStream) {
        await this.vad?.initialize(this.mediaStream);
      }
      
      this.updateState({ isConnected: true, hasPermission: true });
      console.log('✅ Enhanced Voice Service initialized');
      
    } catch (error) {
      console.error('❌ Voice service initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ error: errorMessage });
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Start listening for voice input with advanced features
   */
  async startListening(options?: {
    timeout?: number;
    continuous?: boolean;
    interimResults?: boolean;
  }): Promise<void> {
    try {
      if (this.state.isListening) {
        console.log('⚠️ Already listening');
        return;
      }

      console.log('🎤 Starting enhanced voice listening...');
      
      this.audioChunks = [];
      this.isInterrupted = false;
      this.updateState({ isListening: true, isProcessing: false, error: undefined });

      // Start VAD if enabled
      if (this.config.enableVAD && this.vad) {
        this.vad.start();
      }

      // Setup media recorder for high-quality audio capture
      await this.setupMediaRecorder();
      
      // Start recording
      this.mediaRecorder?.start(100); // Capture in 100ms chunks
      
      // Set timeout if specified
      if (options?.timeout) {
        this.recordingTimeout = setTimeout(() => {
          this.stopListening();
        }, options.timeout);
      }

      this.callbacks.onSpeechStart?.();
      
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ isListening: false, error: errorMessage });
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Stop listening and process audio
   */
  async stopListening(): Promise<string> {
    try {
      if (!this.state.isListening) {
        return '';
      }

      console.log('🎤 Stopping enhanced voice listening...');
      this.updateState({ isListening: false, isProcessing: true });

      // Clear timeout
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
        this.recordingTimeout = null;
      }

      // Stop VAD
      if (this.config.enableVAD && this.vad) {
        this.vad.stop();
      }

      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }

      // Wait for processing to complete
      return new Promise((resolve, reject) => {
        if (this.mediaRecorder) {
          this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              this.audioChunks.push(event.data);
            }
          };

          this.mediaRecorder.onstop = async () => {
            try {
              const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
              const transcript = await this.transcribeAudio(audioBlob);
              
              this.updateState({ isProcessing: false });
              this.callbacks.onSpeechEnd?.();
              
              resolve(transcript);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              this.updateState({ isProcessing: false, error: errorMessage });
              this.callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error'));
              reject(error);
            }
          };
        } else {
          resolve('');
        }
      });

    } catch (error) {
      console.error('❌ Failed to stop listening:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ isListening: false, isProcessing: false, error: errorMessage });
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error'));
      return '';
    }
  }

  /**
   * Speak text with interruption handling
   */
  async speak(
    text: string, 
    options?: {
      voice?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
      interruptible?: boolean;
    }
  ): Promise<void> {
    try {
      console.log('🔊 Speaking with enhanced TTS:', text.substring(0, 50) + '...');
      
      // Stop current speech if interruption is enabled
      if (this.config.enableInterruption && this.state.isSpeaking) {
        await this.stopSpeaking();
      }

      this.updateState({ isSpeaking: true });

      // Use configured TTS provider
      switch (this.config.ttsProvider) {
        case 'elevenlabs':
          await this.speakWithElevenLabs(text, options);
          break;
        case 'openai':
          await this.speakWithOpenAI(text, options);
          break;
        default:
          await this.speakWithBrowser(text, options);
          break;
      }

      this.updateState({ isSpeaking: false });
      
    } catch (error) {
      console.error('❌ Speech failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ isSpeaking: false, error: errorMessage });
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Stop current speech
   */
  async stopSpeaking(): Promise<void> {
    console.log('🛑 Stopping speech...');
    
    this.isInterrupted = true;
    
    // Stop current audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    
    // Stop browser speech synthesis
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
    
    this.updateState({ isSpeaking: false });
  }

  /**
   * Handle user interruption
   */
  handleInterruption(): void {
    if (!this.config.enableInterruption) {
      return;
    }

    console.log('⚡ User interruption detected');
    
    // Stop current speech
    this.stopSpeaking();
    
    // Restart listening if auto-restart is enabled
    if (this.config.autoRestart && !this.state.isListening) {
      setTimeout(() => {
        this.startListening({ continuous: true, interimResults: true });
      }, 100);
    }
  }

  /**
   * Setup media recorder for audio capture
   */
  private async setupMediaRecorder(): Promise<void> {
    if (!this.mediaStream) {
      throw new Error('Media stream not available');
    }

    try {
      // Configure media recorder with optimal settings
      let mimeType = 'audio/webm;codecs=opus';
      
      // Try different mime types if the preferred one isn't supported
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 128000,
        ...(mimeType && { mimeType })
      };

      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
      console.log('✅ Media recorder setup with:', options);

    } catch (error) {
      console.error('❌ Failed to setup media recorder:', error);
      throw new Error('Failed to setup audio recording');
    }
  }

  /**
   * Setup Voice Activity Detection
   */
  private setupVAD(): void {
    if (this.config.enableVAD) {
      this.vad = new VoiceActivityDetection(this.config.vadConfig);
      
      this.vad.setCallbacks({
        onSpeechStart: () => {
          console.log('🎤 Voice activity detected');
          this.callbacks.onSpeechStart?.();
        },
        onSpeechEnd: () => {
          console.log('🎤 Voice activity ended');
          this.callbacks.onSpeechEnd?.();
        },
        onVolumeChange: (volume: number) => {
          this.updateState({ currentVolume: volume });
          this.callbacks.onVolumeChange?.(volume);
        }
      });
    }
  }

  /**
   * Request microphone permission
   */
  private async requestMicrophonePermission(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      console.log('✅ Microphone permission granted');
      
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      throw new Error('Microphone access required for voice features');
    }
  }

  /**
   * Transcribe audio using enhanced backend APIs
   */
  private async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('🔄 Transcribing audio with enhanced backend API...');

      // Convert blob to base64 for API
      const audioBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/voice/transcribe-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          provider: this.config.sttProvider === 'browser' ? 'whisper' : this.config.sttProvider,
          language: 'en'
        }),
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Enhanced transcription result:', result);

      if (result.transcript) {
        this.callbacks.onTranscript?.(result.transcript, false);
        return result.transcript;
      }

      return '';

    } catch (error) {
      console.error('❌ Enhanced transcription failed:', error);
      
      // Fallback to browser speech recognition if available
      if (this.config.sttProvider === 'browser' && 'webkitSpeechRecognition' in window) {
        console.log('🔄 Falling back to browser speech recognition...');
        return await this.fallbackToWebSpeechAPI();
      }
      
      throw error;
    }
  }

  /**
   * Fallback to Web Speech API
   */
  private async fallbackToWebSpeechAPI(): Promise<string> {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      
      if (!SpeechRecognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.start();
    });
  }

  /**
   * Detect voice activity in audio
   */
  async detectVoiceActivity(audioBlob: Blob): Promise<{
    isSpeaking: boolean;
    confidence: number;
    volume: number;
  }> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/voice/voice-activity`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Voice activity detection failed: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Voice activity detection failed:', error);
      // Return default values
      return {
        isSpeaking: false,
        confidence: 0,
        volume: 0
      };
    }
  }

  /**
   * Detect intent using enhanced backend APIs
   */
  async detectIntent(
    transcript: string,
    conversationContext: string[] = [],
    provider: 'gpt4' | 'claude' | 'ensemble' = 'ensemble'
  ): Promise<{
    intent: string;
    confidence: number;
    entities: any;
    emotion: string;
  }> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/voice/detect-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          conversationContext,
          provider,
        }),
      });

      if (!response.ok) {
        throw new Error(`Intent detection failed: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Intent detection failed:', error);
      // Return fallback intent
      return {
        intent: 'unknown',
        confidence: 0,
        entities: {},
        emotion: 'neutral'
      };
    }
  }

  /**
   * Speak with ElevenLabs using the enhanced service
   */
  private async speakWithElevenLabs(text: string, options?: any): Promise<void> {
    try {
      console.log('🎤 Using ElevenLabs TTS via backend service');
      
      // Use the enhanced ElevenLabs service
      await elevenLabsService.speak(text, options?.voiceConfig);
      
    } catch (error) {
      console.error('❌ ElevenLabs TTS failed, falling back to browser TTS:', error);
      // Fallback to browser TTS if ElevenLabs fails
      await this.speakWithBrowser(text, options);
    }
  }

  /**
   * Speak with OpenAI TTS
   */
  private async speakWithOpenAI(text: string, options?: any): Promise<void> {
    try {
      const response = await fetch('/api/voice/tts/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, options })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI TTS error: ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      await this.playAudioBlob(audioBlob);
      
    } catch (error) {
      console.error('❌ OpenAI TTS failed:', error);
      await this.speakWithBrowser(text, options);
    }
  }

  /**
   * Speak with browser Speech Synthesis (fallback)
   */
  private async speakWithBrowser(text: string, options?: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = options?.rate || 1.0;
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = options?.volume || 1.0;
      
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));
      
      this.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Play audio blob
   */
  private async playAudioBlob(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(audioUrl);
      
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };
      
      this.currentAudio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        reject(error);
      };
      
      this.currentAudio.play().catch(reject);
    });
  }

  /**
   * Update voice state and notify callbacks
   */
  private updateState(updates: Partial<VoiceState>): void {
    this.state = { ...this.state, ...updates };
    this.callbacks.onStateChange?.(this.state);
  }

  /**
   * Get current voice state
   */
  getState(): VoiceState {
    return { ...this.state };
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: Partial<typeof this.callbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EnhancedVoiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get available voice capabilities from backend
   */
  async getCapabilities(): Promise<any> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/voice/capabilities`);
      
      if (!response.ok) {
        throw new Error(`Failed to get capabilities: ${response.statusText}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('❌ Failed to get voice capabilities:', error);
      return null;
    }
  }

  /**
   * Test connection to enhanced voice services
   */
  async testConnection(): Promise<{
    backend: boolean;
    stt: boolean;
    intent: boolean;
    vad: boolean;
  }> {
    const results = {
      backend: false,
      stt: false,
      intent: false,
      vad: false
    };

    try {
      // Test backend connection
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const healthResponse = await fetch(`${apiUrl}/voice/health`);
      results.backend = healthResponse.ok;

      if (results.backend) {
        // Test capabilities
        const capabilities = await this.getCapabilities();
        if (capabilities) {
          results.stt = capabilities.stt?.providers?.length > 0;
          results.intent = capabilities.intent?.providers?.length > 0;
          results.vad = capabilities.vad?.features?.length > 0;
        }
      }

    } catch (error) {
      console.error('❌ Connection test failed:', error);
    }

    return results;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopListening();
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.vad) {
      this.vad.stop();
      this.vad = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.updateState({ isConnected: false, hasPermission: false });
  }
}

// Create and export singleton instance
export const enhancedVoiceService = new EnhancedVoiceService();

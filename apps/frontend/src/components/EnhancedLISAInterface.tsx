import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  IconButton, 
  Paper, 
  Typography, 
  Chip,
  Alert,
  LinearProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Collapse,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
  CircularProgress
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ChatIcon from '@mui/icons-material/Chat';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { io, Socket } from 'socket.io-client';
import { audioService } from '../services/AudioService';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  error?: string;
}

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
}

interface AIStatus {
  openai: boolean;
  anthropic: boolean;
  deepgram: boolean;
  elevenlabs: boolean;
}

export const EnhancedLISAInterface: React.FC = () => {
  // Voice State
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    isConnected: false
  });

  // Conversation State
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastError, setLastError] = useState<string>('');
  const [isInConversationMode, setIsInConversationMode] = useState(false);

  // UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [permissionError, setPermissionError] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // AI Status
  const [aiStatus, setAiStatus] = useState<AIStatus>({
    openai: false,
    anthropic: false,
    deepgram: false,
    elevenlabs: false
  });

  // Audio State
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Initialize connection
  useEffect(() => {
    initializeLISA();
    return cleanup;
  }, []);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  const initializeLISA = async () => {
    try {
      console.log('🚀 Initializing Enhanced LISA...');
      
      const socket = io('http://localhost:3001', {
        transports: ['websocket'],
        autoConnect: true,
      });

      socket.on('connect', () => {
        console.log('✅ Enhanced LISA connected');
        setVoiceState(prev => ({ ...prev, isConnected: true }));
        setLastError('');
        checkAIStatus();
      });

      socket.on('disconnect', () => {
        console.log('❌ Enhanced LISA disconnected');
        setVoiceState(prev => ({ ...prev, isConnected: false }));
      });

      socket.on('voice-response', handleVoiceResponse);

      socketRef.current = socket;

    } catch (error) {
      console.error('❌ Failed to initialize Enhanced LISA:', error);
      setLastError('Failed to initialize Enhanced LISA');
      showNotification('Failed to initialize Enhanced LISA', 'error');
    }
  };

  const checkAIStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/voice/ai-health');
      if (response.ok) {
        const status = await response.json();
        setAiStatus(status);
        console.log('🔍 AI Provider Status:', status);
      }
    } catch (error) {
      console.error('❌ Failed to check AI status:', error);
    }
  };

  const checkMicrophonePermissions = async (): Promise<boolean> => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionError('Microphone access is not available. Please use HTTPS or localhost.');
        setShowPermissionDialog(true);
        return false;
      }

      // Check current permission status
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('🔍 Microphone permission status:', permission.state);
        
        if (permission.state === 'denied') {
          setPermissionError('Microphone permission was denied. Please click the microphone icon in your browser address bar and allow access, then refresh the page.');
          setShowPermissionDialog(true);
          return false;
        }
      } catch (permError) {
        console.warn('⚠️ Could not check permission status:', permError);
      }

      // Test microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Clean up
        console.log('✅ Microphone permission granted');
        return true;
      } catch (mediaError: any) {
        console.error('❌ Microphone access test failed:', mediaError);
        
        let errorMessage = 'Microphone access denied';
        if (mediaError?.name === 'NotAllowedError') {
          errorMessage = 'Microphone permission denied. Please click "Allow" when prompted for microphone access.';
        } else if (mediaError?.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (mediaError?.name === 'NotSupportedError') {
          errorMessage = 'Microphone not supported. Please use a modern browser like Chrome or Firefox.';
        } else if (mediaError?.name === 'NotReadableError') {
          errorMessage = 'Microphone is being used by another application. Please close other apps and try again.';
        }
        
        setPermissionError(errorMessage);
        setShowPermissionDialog(true);
        return false;
      }
    } catch (error) {
      console.error('❌ Permission check failed:', error);
      setPermissionError('Failed to check microphone permissions. Please refresh the page and try again.');
      setShowPermissionDialog(true);
      return false;
    }
  };

  const handleVoiceResponse = useCallback(async (data: any) => {
    console.log('🎯 LISA Response:', data);
    
    if (data.response) {
      addToConversation('assistant', data.response, data.confidence);
      
      // Play the AI response using voice synthesis
      try {
        setVoiceState(prev => ({ ...prev, isSpeaking: true }));
        
        // Initialize audio if not already done
        if (!audioInitialized) {
          console.log('🎤 Auto-initializing audio for voice response...');
          await initializeAudio();
        }
        
        await audioService.speak(data.response);
        console.log('🔊 AI voice response played successfully');
        
      } catch (error: any) {
        console.error('❌ Failed to play AI voice response:', error);
        if (error?.message?.includes('User interaction required') || error?.message?.includes('autoplay')) {
          showNotification('🔊 Click the speaker button to enable audio output', 'warning');
        } else {
          showNotification('Voice synthesis failed', 'warning');
        }
      } finally {
        setVoiceState(prev => ({ ...prev, isSpeaking: false }));
        
        // Auto-restart listening in conversation mode after speaking is done
        if (isInConversationMode) {
          console.log('🔄 Scheduling auto-restart of listening after speech completion');
          setTimeout(() => {
            console.log('🔄 Auto-restart timer triggered, conversation mode:', isInConversationMode);
            if (isInConversationMode) {
              startContinuousListening();
            }
          }, 2000); // 2 second pause after speaking
        }
      }
    }
    
    setVoiceState(prev => ({ ...prev, isProcessing: false }));
  }, [audioInitialized, isInConversationMode]);

  const addToConversation = (role: 'user' | 'assistant', content: string, confidence?: number, error?: string) => {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
      confidence,
      error
    };
    
    setConversation(prev => [...prev, message]);
  };

  const startListening = async () => {
    // First check permissions before attempting to start listening
    const hasPermissions = await checkMicrophonePermissions();
    if (!hasPermissions) {
      return; // Permission dialog will be shown
    }

    try {
      setVoiceState(prev => ({ ...prev, isListening: true }));
      setLastError('');
      console.log('🎤 Starting Enhanced LISA listening...');

      // Check if microphone is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not available. Please use HTTPS or localhost.');
      }

      // Check permissions first
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('🔍 Microphone permission status:', permissionStatus.state);
        
        if (permissionStatus.state === 'denied') {
          throw new Error('Microphone permission was denied. Please allow microphone access in your browser settings.');
        }
      } catch (permError) {
        console.warn('⚠️ Could not check permission status:', permError);
        // Continue anyway, as some browsers don't support permission query
      }

      // Request microphone access with enhanced error handling
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      }).catch((mediaError) => {
        console.error('❌ getUserMedia error:', mediaError);
        let errorMessage = 'Microphone access denied';
        
        if (mediaError.name === 'NotAllowedError') {
          errorMessage = 'Microphone permission denied. Please click the microphone icon in your browser address bar and allow access.';
        } else if (mediaError.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (mediaError.name === 'NotSupportedError') {
          errorMessage = 'Microphone not supported. Please use a modern browser like Chrome or Firefox.';
        } else if (mediaError.name === 'NotReadableError') {
          errorMessage = 'Microphone is being used by another application. Please close other apps and try again.';
        } else if (mediaError.name === 'OverconstrainedError') {
          errorMessage = 'Microphone constraints not supported. Trying with basic settings...';
        }
        
        throw new Error(errorMessage);
      });

      console.log('✅ Microphone access granted');

      // Try multiple media recorder formats for better compatibility
      let mediaRecorder: MediaRecorder;
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];

      let mimeType = 'audio/webm;codecs=opus';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      console.log('🎙️ Using audio format:', mimeType);

      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
      } catch (recorderError) {
        console.warn('⚠️ MediaRecorder with mimeType failed, using default:', recorderError);
        mediaRecorder = new MediaRecorder(stream);
      }

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('📊 Audio chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🔄 Processing recorded audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('📦 Audio blob created:', audioBlob.size, 'bytes');
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setLastError('Recording failed');
        setVoiceState(prev => ({ ...prev, isListening: false }));
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      console.log('🔴 Recording started');
      showNotification('Listening... Speak now!', 'success');

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (voiceState.isListening) {
          console.log('⏰ Auto-stopping recording after 30 seconds');
          stopListening();
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      const errorMessage = error instanceof Error ? error.message : 'Microphone access denied';
      setLastError(errorMessage);
      addToConversation('assistant', `Error: ${errorMessage}`, undefined, errorMessage);
      setVoiceState(prev => ({ ...prev, isListening: false }));
      showNotification(errorMessage, 'error');
    }
  };

  const stopListening = () => {
    setVoiceState(prev => ({ ...prev, isListening: false }));
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setVoiceState(prev => ({ ...prev, isProcessing: true }));
      console.log('🔄 Processing audio...');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('conversationMode', 'true');

      // Add conversation context
      if (conversation.length > 0) {
        const context = conversation.slice(-6).map(msg => `${msg.role}: ${msg.content}`);
        formData.append('context', JSON.stringify(context));
      }

      const response = await fetch('http://localhost:3001/api/voice/enhanced-process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Audio processing result:', result);
      
      if (result.transcript) {
        setCurrentTranscript(result.transcript);
        addToConversation('user', result.transcript);
        
        // Send to voice gateway for response
        if (socketRef.current) {
          socketRef.current.emit('voice-command', {
            transcript: result.transcript,
            isEndOfSpeech: true,
            useNaturalConversation: true
          });
        }
      }

    } catch (error) {
      console.error('❌ Audio processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      setLastError(errorMessage);
      addToConversation('assistant', `Processing Error: ${errorMessage}`, undefined, errorMessage);
      setVoiceState(prev => ({ ...prev, isProcessing: false }));
      showNotification(`Failed to process audio: ${errorMessage}`, 'error');
    } finally {
      setVoiceState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setCurrentTranscript('');
    setLastError('');
    showNotification('Conversation cleared', 'info');
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, severity });
  };

  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  // AI Status Indicator Component
  const AIStatusIndicator = () => (
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip title={`OpenAI: ${aiStatus.openai ? 'Connected' : 'Disconnected'}`}>
        <Chip 
          icon={<PsychologyIcon />}
          label="GPT-4o" 
          size="small" 
          color={aiStatus.openai ? 'success' : 'default'}
          variant={aiStatus.openai ? 'filled' : 'outlined'}
        />
      </Tooltip>
      <Tooltip title={`Anthropic: ${aiStatus.anthropic ? 'Connected' : 'Disconnected'}`}>
        <Chip 
          icon={<SmartToyIcon />}
          label="Claude" 
          size="small" 
          color={aiStatus.anthropic ? 'success' : 'default'}
          variant={aiStatus.anthropic ? 'filled' : 'outlined'}
        />
      </Tooltip>
      <Tooltip title={`Deepgram: ${aiStatus.deepgram ? 'Connected' : 'Disconnected'}`}>
        <Chip 
          icon={<RecordVoiceOverIcon />}
          label="STT" 
          size="small" 
          color={aiStatus.deepgram ? 'success' : 'default'}
          variant={aiStatus.deepgram ? 'filled' : 'outlined'}
        />
      </Tooltip>
    </Stack>
  );

  // Initialize audio on user interaction
  const initializeAudio = async () => {
    if (audioInitialized) return true;
    
    try {
      console.log('🎤 Initializing audio with user interaction...');
      await audioService.initialize();
      setAudioInitialized(true);
      showNotification('Audio initialized successfully!', 'success');
      return true;
    } catch (error) {
      console.error('❌ Audio initialization failed:', error);
      showNotification('Audio initialization failed. Voice responses may not work.', 'warning');
      return false;
    }
  };

  // Continuous conversation mode
  const startConversationMode = async () => {
    console.log('🗣️ Starting continuous conversation mode...');
    setIsInConversationMode(true);
    
    // Initialize audio first
    if (!audioInitialized) {
      const audioReady = await initializeAudio();
      if (!audioReady) {
        showNotification('Audio initialization required for conversation mode', 'warning');
        return;
      }
    }
    
    // Start listening
    await startListening();
    showNotification('🎙️ Conversation mode active! Speak naturally - LISA will respond automatically', 'success');
    
    // Add initial conversation message to show mode is active
    addToConversation('assistant', '🎙️ Conversation mode started! I\'m listening continuously. Just speak naturally and I\'ll respond to each thing you say.');
  };

  const stopConversationMode = () => {
    console.log('🛑 Stopping continuous conversation mode...');
    setIsInConversationMode(false);
    stopListening();
    showNotification('Conversation mode stopped', 'info');
    
    // Add final conversation message
    addToConversation('assistant', '🛑 Conversation mode stopped. Click the microphone to start again.');
  };

  // Enhanced recording with shorter segments for conversation mode
  const startContinuousListening = async () => {
    console.log('🔄 Starting continuous listening, conversation mode:', isInConversationMode);
    if (!isInConversationMode) {
      console.log('❌ Not in conversation mode, skipping continuous listening');
      return;
    }
    
    try {
      // Only start if not already listening
      if (!voiceState.isListening) {
        await startListening();
        
        // Auto-stop recording after shorter interval in conversation mode
        setTimeout(() => {
          console.log('⏰ Auto-processing timer triggered');
          // Check current state at execution time
          setVoiceState(currentState => {
            if (currentState.isListening && isInConversationMode) {
              console.log('🔄 Auto-processing speech segment...');
              stopListening();
            }
            return currentState;
          });
        }, 5000); // 5-second segments for natural conversation
      } else {
        console.log('🎤 Already listening, skipping start');
      }
      
    } catch (error) {
      console.error('❌ Continuous listening failed:', error);
      showNotification('Failed to restart listening', 'error');
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1300,
      }}
    >
      {/* Main LISA Interface */}
      <Paper
        elevation={8}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          minWidth: isExpanded ? 450 : 320,
          maxWidth: isExpanded ? 600 : 350,
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge 
              badgeContent={conversation.length} 
              color="secondary"
              sx={{ '& .MuiBadge-badge': { fontSize: '10px' } }}
            >
              <SmartToyIcon sx={{ fontSize: 28 }} />
            </Badge>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                Enhanced LISA
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                AI Voice Assistant
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Clear Conversation">
              <IconButton 
                size="small" 
                sx={{ color: 'white' }}
                onClick={clearConversation}
                disabled={conversation.length === 0}
              >
                <ChatIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Help & Troubleshooting">
              <IconButton 
                size="small" 
                sx={{ color: 'white' }}
                onClick={() => setShowHelpDialog(true)}
              >
                <HelpIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton 
                size="small" 
                sx={{ color: 'white' }}
                onClick={() => setShowSettings(!showSettings)}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={isExpanded ? "Collapse" : "Expand"}>
              <IconButton 
                size="small" 
                sx={{ color: 'white' }}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <AutoAwesomeIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* AI Status Panel */}
        <Collapse in={isExpanded}>
          <Box sx={{ px: 2, pb: 1 }}>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 1 }}>
              AI Providers Status
            </Typography>
            <AIStatusIndicator />
          </Box>
        </Collapse>

        {/* Error Display */}
        {lastError && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Alert 
              severity="error" 
              icon={<ErrorIcon />}
              sx={{ 
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                color: 'white',
                '& .MuiAlert-icon': { color: '#ff6b6b' }
              }}
            >
              {lastError}
            </Alert>
          </Box>
        )}

        {/* Conversation Display */}
        <Collapse in={isExpanded && conversation.length > 0}>
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid rgba(255,255,255,0.1)', 
            maxHeight: 300, 
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }
          }}>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 1 }}>
              Conversation ({conversation.length} messages)
            </Typography>
            {conversation.map((msg, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="caption" sx={{ 
                    opacity: 0.8,
                    fontWeight: 'bold',
                    color: msg.role === 'user' ? '#90caf9' : '#a5d6a7'
                  }}>
                    {msg.role === 'user' ? '👤 You' : '🤖 LISA'}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.7rem' }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </Typography>
                  {msg.confidence && (
                    <Chip 
                      label={`${(msg.confidence * 100).toFixed(0)}%`} 
                      size="small" 
                      sx={{ fontSize: '0.6rem', height: 16 }}
                    />
                  )}
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontSize: '0.85rem',
                    backgroundColor: msg.error 
                      ? 'rgba(244, 67, 54, 0.1)' 
                      : msg.role === 'user' 
                        ? 'rgba(255,255,255,0.1)' 
                        : 'rgba(255,255,255,0.05)',
                    p: 1,
                    borderRadius: 1,
                    border: msg.error ? '1px solid rgba(244, 67, 54, 0.3)' : 'none'
                  }}
                >
                  {msg.content}
                </Typography>
              </Box>
            ))}
            <div ref={conversationEndRef} />
          </Box>
        </Collapse>

        {/* Current Processing State */}
        {(voiceState.isListening || voiceState.isProcessing || currentTranscript || isInConversationMode) && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {isInConversationMode && !voiceState.isListening && !voiceState.isProcessing && !voiceState.isSpeaking && (
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', color: '#90caf9' }}>
                🔄 Conversation mode: Ready for your next message...
              </Typography>
            )}
            {voiceState.isListening && (
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                🎤 Listening... (speak now)
              </Typography>
            )}
            {voiceState.isProcessing && (
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                🔄 Processing your speech...
              </Typography>
            )}
            {voiceState.isSpeaking && (
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', color: '#a5d6a7' }}>
                🔊 LISA is speaking...
              </Typography>
            )}
            {currentTranscript && !voiceState.isProcessing && (
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Last transcript:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                  "{currentTranscript}"
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Progress Indicator */}
        {voiceState.isProcessing && (
          <LinearProgress sx={{ height: 2 }} />
        )}

        {/* Control Buttons */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Main microphone button - toggles conversation mode */}
          <Tooltip title={isInConversationMode ? "Stop Conversation" : "Start Conversation Mode"}>
            <IconButton
              onClick={isInConversationMode ? stopConversationMode : startConversationMode}
              disabled={!voiceState.isConnected}
              sx={{
                bgcolor: isInConversationMode ? 'error.main' : 'success.main',
                color: 'white',
                border: isInConversationMode ? '3px solid #ff5722' : '3px solid #4caf50',
                '&:hover': {
                  bgcolor: isInConversationMode ? 'error.dark' : 'success.dark',
                },
                '&:disabled': {
                  bgcolor: 'grey.500',
                },
              }}
            >
              {isInConversationMode ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
          </Tooltip>

          {/* Manual listen button for single interactions */}
          {!isInConversationMode && (
            <Tooltip title={voiceState.isListening ? "Stop Listening" : "Listen Once"}>
              <IconButton
                onClick={voiceState.isListening ? stopListening : startListening}
                disabled={!voiceState.isConnected || voiceState.isProcessing}
                sx={{
                  bgcolor: voiceState.isListening ? 'warning.main' : 'info.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: voiceState.isListening ? 'warning.dark' : 'info.dark',
                  },
                  '&:disabled': {
                    bgcolor: 'grey.500',
                  },
                }}
              >
                {voiceState.isListening ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
            </Tooltip>
          )}

          {!audioInitialized && (
            <Tooltip title="Enable Audio Output (Click first to hear LISA's voice)">
              <IconButton
                onClick={initializeAudio}
                sx={{
                  bgcolor: 'warning.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'warning.dark',
                  },
                }}
              >
                <VolumeUpIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Quick test button for conversation flow */}
          <Tooltip title="Quick Test: Send test message">
            <IconButton
              onClick={() => {
                addToConversation('user', 'I would like to place an order');
                if (socketRef.current) {
                  socketRef.current.emit('voice-command', {
                    transcript: 'I would like to place an order',
                    isEndOfSpeech: true,
                    useNaturalConversation: true
                  });
                }
              }}
              sx={{
                bgcolor: 'info.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'info.dark',
                },
              }}
            >
              <PlayArrowIcon />
            </IconButton>
          </Tooltip>

          {voiceState.isProcessing && (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          )}

          <Chip 
            label={voiceState.isConnected ? 'Connected' : 'Disconnected'}
            size="small"
            color={voiceState.isConnected ? 'success' : 'error'}
            sx={{ color: 'white' }}
          />
          
          {isInConversationMode && (
            <Chip 
              label="Conversation Mode"
              size="small"
              color="warning"
              sx={{ color: 'white', bgcolor: 'warning.main' }}
            />
          )}
        </Box>

        {/* Help Text */}
        {!isExpanded && conversation.length === 0 && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)', opacity: 0.8 }}>
            <Typography variant="caption" display="block" sx={{ mb: 1, fontWeight: 'bold' }}>
              🎤 Conversation Mode: Natural chat with LISA
            </Typography>
            <Typography variant="caption" display="block">
              💬 "Hi LISA, I'd like to place an order"
            </Typography>
            <Typography variant="caption" display="block">
              🔍 "Show me orders for customer Smith"
            </Typography>
            <Typography variant="caption" display="block">
              📊 "Generate quarterly reports"
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.severity}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      {/* Permission Dialog */}
      <Dialog
        open={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
        aria-labelledby="permission-dialog-title"
        aria-describedby="permission-dialog-description"
      >
        <DialogTitle id="permission-dialog-title" sx={{ color: '#1976d2' }}>
          🎤 Microphone Permission Required
        </DialogTitle>
        <DialogContent>
          <Typography id="permission-dialog-description" sx={{ mb: 2 }}>
            LISA needs access to your microphone to understand your voice commands.
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>How to enable microphone access:</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              1. Look for a 🎤 microphone icon in your browser's address bar
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              2. Click on it and select "Always allow"
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              3. Refresh the page and try again
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Microphone access is required for voice conversation. 
              Your voice data is only processed for speech recognition and is not stored.
            </Typography>
          </Alert>

          {permissionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>Error:</strong> {permissionError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPermissionDialog(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={async () => {
              setShowPermissionDialog(false);
              // Retry initializing LISA
              initializeLISA();
            }} 
            color="primary"
            autoFocus
          >
            Retry
          </Button>
        </DialogActions>
      </Dialog>

      {/* Help Dialog */}
      <Dialog
        open={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="help-dialog-title"
      >
        <DialogTitle id="help-dialog-title" sx={{ color: '#1976d2' }}>
          🎤 LISA Voice Assistant - Help & Troubleshooting
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Quick Start Guide</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              1. Click the green microphone button to start listening
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              2. Speak clearly when you see "🎤 Listening... (speak now)"
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              3. LISA will process your speech and respond with voice
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Example Commands</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • "Hi LISA, show me all orders"
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • "Find orders for customer Smith"
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • "Generate quarterly reports"
              </Typography>
              <Typography variant="body2">
                • "What's the status of order 12345?"
              </Typography>
            </Alert>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>🔧 Troubleshooting Common Issues</Typography>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                <strong>Problem:</strong> "Permission denied" or microphone not working
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Solution:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                1. Look for a 🎤 icon in your browser's address bar
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                2. Click it and select "Always allow"
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                3. Refresh the page (F5 or Cmd+R)
              </Typography>
              <Typography variant="body2">
                4. Make sure no other apps are using your microphone
              </Typography>
            </Alert>

            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                <strong>Problem:</strong> "Failed to process audio" errors
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Solutions:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                1. Check your internet connection
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                2. Verify AI providers are connected (green chips)
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                3. Try speaking more clearly and loudly
              </Typography>
              <Typography variant="body2">
                4. Refresh the page if issues persist
              </Typography>
            </Alert>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                <strong>Browser Requirements:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Chrome, Firefox, Edge, Safari (latest versions)
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • HTTPS connection (or localhost for development)
              </Typography>
              <Typography variant="body2">
                • Microphone access permissions enabled
              </Typography>
            </Alert>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Status Indicators</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              🟢 <strong>Connected:</strong> LISA is ready to listen
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              🔴 <strong>Disconnected:</strong> Check backend connection
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              🎤 <strong>Listening:</strong> Speak now
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              🔄 <strong>Processing:</strong> AI is analyzing your speech
            </Typography>
            <Typography variant="body2">
              🔊 <strong>Speaking:</strong> LISA is responding
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelpDialog(false)} color="primary">
            Close
          </Button>
          <Button 
            onClick={() => {
              setShowHelpDialog(false);
              setShowPermissionDialog(true);
            }} 
            color="primary"
            variant="contained"
          >
            Check Microphone
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedLISAInterface;

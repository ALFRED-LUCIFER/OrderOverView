import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  IconButton, 
  Paper, 
  Typography, 
  Chip,
  Collapse,
  Alert,
  LinearProgress,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import SettingsIcon from '@mui/icons-material/Settings';
import { io, Socket } from 'socket.io-client';
import { enhancedVoiceService, EnhancedVoiceConfig, VoiceState } from '../services/EnhancedVoiceService';

export const EnhancedVoiceInterface: React.FC = () => {
  // Enhanced Voice Service State
  const [voiceState, setVoiceState] = useState<VoiceState>(enhancedVoiceService.getState());
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Configuration State
  const [config, setConfig] = useState<EnhancedVoiceConfig>({
    sttProvider: 'whisper',
    ttsProvider: 'elevenlabs', // Use ElevenLabs as default for better voice quality
    enableVAD: true,
    enableInterruption: true,
    enableWakeWord: false,
    autoRestart: true
  });

  // Conversation State
  const [isInConversation, setIsInConversation] = useState(false);
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  const [useNaturalConversation, setUseNaturalConversation] = useState(true);

  // Connection State
  const [capabilities, setCapabilities] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const socketRef = useRef<Socket | null>(null);

  // Initialize Enhanced Voice Service
  useEffect(() => {
    const initializeEnhancedVoice = async () => {
      try {
        console.log('🎤 Initializing Enhanced Voice Interface...');
        
        // Set up callbacks
        enhancedVoiceService.setCallbacks({
          onTranscript: (text: string, isInterim: boolean) => {
            if (isInterim) {
              setInterimTranscript(text);
              // Send interim results for natural conversation
              if (useNaturalConversation && isInConversation) {
                sendVoiceCommand(text, false, true);
              }
            } else {
              setTranscript(text);
              setInterimTranscript('');
              sendVoiceCommand(text, true, false);
            }
          },
          onSpeechStart: () => {
            console.log('🎤 Speech started');
          },
          onSpeechEnd: () => {
            console.log('🎤 Speech ended');
          },
          onVolumeChange: (volume: number) => {
            // Could show volume indicator here
          },
          onStateChange: (state: VoiceState) => {
            setVoiceState(state);
          },
          onError: (error: Error) => {
            console.error('Enhanced Voice Error:', error);
          }
        });

        // Update configuration
        enhancedVoiceService.updateConfig(config);
        
        // Initialize the service
        await enhancedVoiceService.initialize();
        
        // Test connection and get capabilities
        const connectionTest = await enhancedVoiceService.testConnection();
        setConnectionStatus(connectionTest);
        
        const caps = await enhancedVoiceService.getCapabilities();
        setCapabilities(caps);

        console.log('✅ Enhanced Voice Interface initialized');
        
      } catch (error) {
        console.error('❌ Enhanced Voice Interface initialization failed:', error);
      }
    };

    initializeEnhancedVoice();

    // Cleanup on unmount
    return () => {
      enhancedVoiceService.dispose();
    };
  }, []);

  // Initialize WebSocket Connection
  useEffect(() => {
    let wsUrl: string;
    
    if (window.location.hostname.includes('vercel.app')) {
      wsUrl = 'wss://orderoverview-dkro.onrender.com';
    } else if (import.meta.env.VITE_WEBSOCKET_URL) {
      wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
    } else {
      wsUrl = 'ws://localhost:3001';
    }
    
    console.log('🔌 Enhanced Voice connecting to WebSocket:', wsUrl);
    socketRef.current = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
    });
    
    socketRef.current.on('connected', (data) => {
      console.log('Enhanced Voice connected with session:', data.sessionId);
      if (data.message) {
        setResponse(data.message);
        enhancedVoiceService.speak(data.message);
      }
    });

    socketRef.current.on('voice-response', async (data) => {
      // Handle filler words
      if (data.fillerWord && data.shouldSpeak) {
        await enhancedVoiceService.speak(data.fillerWord, { volume: 0.7 });
        return;
      }
      
      // Handle main response
      if (data.response && data.shouldSpeak) {
        setResponse(data.response);
        
        // Add to conversation context
        setConversationContext(prev => [...prev.slice(-10), data.response]);
        
        // Speak the response
        await enhancedVoiceService.speak(data.response);
      }
      
      // Handle actions (orders found, PDF generated, etc.)
      // These would trigger UI updates as needed
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Enhanced Voice WebSocket connection error:', error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Voice Control Functions
  const startListening = async () => {
    try {
      await enhancedVoiceService.startListening({
        continuous: isInConversation,
        interimResults: useNaturalConversation,
        timeout: isInConversation ? undefined : 10000 // 10s timeout for single commands
      });
      setIsExpanded(true);
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  };

  const stopListening = async () => {
    try {
      await enhancedVoiceService.stopListening();
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
  };

  const startConversation = async () => {
    setIsInConversation(true);
    await startListening();
    
    if (socketRef.current) {
      socketRef.current.emit('start-conversation');
    }
  };

  const endConversation = async () => {
    setIsInConversation(false);
    await stopListening();
    
    if (socketRef.current) {
      socketRef.current.emit('end-conversation');
    }
  };

  const handleInterruption = () => {
    enhancedVoiceService.handleInterruption();
    
    if (socketRef.current) {
      socketRef.current.emit('voice-interruption');
    }
  };

  const sendVoiceCommand = async (text: string, isEndOfSpeech: boolean, interimResults: boolean) => {
    if (socketRef.current && text.trim()) {
      // Use enhanced intent detection
      const intentResult = await enhancedVoiceService.detectIntent(
        text, 
        conversationContext, 
        'ensemble'
      );
      
      console.log('🧠 Enhanced Intent:', intentResult);
      
      socketRef.current.emit('voice-command', { 
        transcript: text,
        isEndOfSpeech,
        interimResults,
        useNaturalConversation,
        enhancedIntent: intentResult
      });
    }
  };

  // Configuration Updates
  const updateConfig = (updates: Partial<EnhancedVoiceConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    enhancedVoiceService.updateConfig(newConfig);
  };

  // UI Status Functions
  const getStatusColor = () => {
    if (voiceState.error) return 'error';
    if (voiceState.isListening) return 'warning';
    if (voiceState.isProcessing) return 'info';
    if (voiceState.isSpeaking) return 'success';
    return 'default';
  };

  const getStatusText = () => {
    if (voiceState.error) return `Error: ${voiceState.error}`;
    if (voiceState.isListening) return 'Enhanced LISA is listening...';
    if (voiceState.isProcessing) return 'Enhanced LISA is processing...';
    if (voiceState.isSpeaking) return 'Enhanced LISA is speaking...';
    return 'Enhanced LISA - Ready';
  };

  // Don't render if voice is disabled
  if (import.meta.env.VITE_ENABLE_VOICE !== 'true') {
    return null;
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
      <Paper 
        elevation={8} 
        sx={{ 
          p: 2, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          minWidth: 300,
          maxWidth: 400
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SmartToyIcon sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Enhanced LISA
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              size="small"
              onClick={() => setShowSettings(!showSettings)}
              sx={{ color: 'white', mr: 1 }}
            >
              <SettingsIcon />
            </IconButton>
            
            <IconButton
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
              sx={{ color: 'white' }}
            >
              {isExpanded ? '−' : '+'}
            </IconButton>
          </Box>
        </Box>

        {/* Status and Connection Info */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={getStatusText()}
            color={getStatusColor()}
            size="small"
            sx={{ mb: 1 }}
          />
          
          {connectionStatus && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Chip 
                label={`Backend: ${connectionStatus.backend ? '✅' : '❌'}`}
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
              <Chip 
                label={`STT: ${connectionStatus.stt ? '✅' : '❌'}`}
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
              <Chip 
                label={`Intent: ${connectionStatus.intent ? '✅' : '❌'}`}
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
              <Chip 
                label={`VAD: ${connectionStatus.vad ? '✅' : '❌'}`}
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>
          )}
        </Box>

        {/* Voice Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton
            size="large"
            color={isInConversation ? 'warning' : (voiceState.isListening ? 'error' : 'primary')}
            onClick={isInConversation ? endConversation : (voiceState.isListening ? stopListening : startConversation)}
            onDoubleClick={handleInterruption}
            disabled={voiceState.isProcessing || !voiceState.isConnected}
            sx={{
              border: '2px solid',
              borderColor: 'white',
              bgcolor: 'rgba(255,255,255,0.1)'
            }}
          >
            {isInConversation ? <MicIcon /> : (voiceState.isListening ? <MicOffIcon /> : <MicIcon />)}
          </IconButton>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">
              {isInConversation 
                ? 'In Conversation - Click to end' 
                : (voiceState.isListening ? 'Click to stop' : 'Click to start conversation')}
            </Typography>
            
            {voiceState.isSpeaking && (
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Double-click mic to interrupt
              </Typography>
            )}
          </Box>
        </Box>

        {/* Processing Indicator */}
        {voiceState.isProcessing && (
          <LinearProgress sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
        )}

        {/* Volume Indicator */}
        {voiceState.currentVolume > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption">Volume: {Math.round(voiceState.currentVolume)}%</Typography>
            <LinearProgress 
              variant="determinate" 
              value={voiceState.currentVolume} 
              sx={{ bgcolor: 'rgba(255,255,255,0.3)' }}
            />
          </Box>
        )}

        {/* Expanded Content */}
        <Collapse in={isExpanded}>
          {/* Transcript Display */}
          {(transcript || interimTranscript) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                You said:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  p: 1,
                  borderRadius: 1,
                  mt: 0.5,
                  fontStyle: 'italic'
                }}
              >
                "{transcript || interimTranscript}"
                {interimTranscript && (
                  <Typography component="span" sx={{ opacity: 0.6 }}>
                    {' (speaking...)'}
                  </Typography>
                )}
              </Typography>
            </Box>
          )}

          {/* Response Display */}
          {response && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Enhanced LISA:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  p: 1,
                  borderRadius: 1,
                  mt: 0.5
                }}
              >
                {response}
              </Typography>
            </Box>
          )}

          {/* Settings Panel */}
          <Collapse in={showSettings}>
            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
            
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Enhanced Settings
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enableVAD}
                    onChange={(e) => updateConfig({ enableVAD: e.target.checked })}
                    size="small"
                  />
                }
                label="Voice Activity Detection"
                sx={{ color: 'white' }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enableInterruption}
                    onChange={(e) => updateConfig({ enableInterruption: e.target.checked })}
                    size="small"
                  />
                }
                label="Interruption Handling"
                sx={{ color: 'white' }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={useNaturalConversation}
                    onChange={(e) => setUseNaturalConversation(e.target.checked)}
                    size="small"
                  />
                }
                label="Natural Conversation"
                sx={{ color: 'white' }}
              />
              
              {/* TTS Provider Selection */}
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5 }}>
                  Voice Provider:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label="Browser"
                    size="small"
                    onClick={() => updateConfig({ ttsProvider: 'browser' })}
                    color={config.ttsProvider === 'browser' ? 'primary' : 'default'}
                    variant={config.ttsProvider === 'browser' ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label="ElevenLabs"
                    size="small"
                    onClick={() => updateConfig({ ttsProvider: 'elevenlabs' })}
                    color={config.ttsProvider === 'elevenlabs' ? 'primary' : 'default'}
                    variant={config.ttsProvider === 'elevenlabs' ? 'filled' : 'outlined'}
                  />
                </Box>
              </Box>
              
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Status: STT {config.sttProvider} | TTS {config.ttsProvider}
                </Typography>
              </Box>
            </Box>
          </Collapse>

          {/* Usage Tips */}
          <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid rgba(255,255,255,0.3)' }}>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
              Enhanced Features:
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
              • Advanced speech recognition with {config.sttProvider}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
              • AI-powered intent detection
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
              • Voice activity detection
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
              • Intelligent interruption handling
            </Typography>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default EnhancedVoiceInterface;

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

  // UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // AI Status
  const [aiStatus, setAiStatus] = useState<AIStatus>({
    openai: false,
    anthropic: false,
    deepgram: false,
    elevenlabs: false
  });

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
      const response = await fetch('http://localhost:3001/voice/ai-health');
      if (response.ok) {
        const status = await response.json();
        setAiStatus(status);
        console.log('🔍 AI Provider Status:', status);
      }
    } catch (error) {
      console.error('❌ Failed to check AI status:', error);
    }
  };

  const handleVoiceResponse = useCallback((data: any) => {
    console.log('🎯 LISA Response:', data);
    
    if (data.response) {
      addToConversation('assistant', data.response, data.confidence);
    }
    
    setVoiceState(prev => ({ ...prev, isProcessing: false }));
  }, []);

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
    try {
      setVoiceState(prev => ({ ...prev, isListening: true }));
      setLastError('');
      console.log('🎤 Starting Enhanced LISA listening...');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (voiceState.isListening) {
          stopListening();
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      const errorMessage = error instanceof Error ? error.message : 'Microphone access denied';
      setLastError(errorMessage);
      addToConversation('assistant', `Error: ${errorMessage}`, undefined, errorMessage);
      setVoiceState(prev => ({ ...prev, isListening: false }));
      showNotification('Failed to start voice recognition', 'error');
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

      const response = await fetch('http://localhost:3001/voice/enhanced-process', {
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
        {(voiceState.isListening || voiceState.isProcessing || currentTranscript) && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', gap: 2, alignItems: 'center' }}>
          <Tooltip title={voiceState.isListening ? "Stop Listening" : "Start Listening"}>
            <IconButton
              onClick={voiceState.isListening ? stopListening : startListening}
              disabled={!voiceState.isConnected || voiceState.isProcessing}
              sx={{
                bgcolor: voiceState.isListening ? 'error.main' : 'success.main',
                color: 'white',
                '&:hover': {
                  bgcolor: voiceState.isListening ? 'error.dark' : 'success.dark',
                },
                '&:disabled': {
                  bgcolor: 'grey.500',
                },
              }}
            >
              {voiceState.isListening ? <MicOffIcon /> : <MicIcon />}
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
        </Box>

        {/* Help Text */}
        {!isExpanded && conversation.length === 0 && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)', opacity: 0.8 }}>
            <Typography variant="caption" display="block">
              💬 Say: "Hi LISA, show me all orders"
            </Typography>
            <Typography variant="caption" display="block">
              🔍 "Find orders for customer Smith"
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
    </Box>
  );
};

export default EnhancedLISAInterface;

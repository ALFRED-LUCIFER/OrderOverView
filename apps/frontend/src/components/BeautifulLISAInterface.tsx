import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  IconButton, 
  Paper, 
  Typography, 
  Chip,
  Alert,
  Snackbar,
  Fab,
  Card,
  CardContent,
  Tooltip,
  Zoom,
  Slide,
  alpha
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import CloseIcon from '@mui/icons-material/Close';
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

export const BeautifulLISAInterface: React.FC = () => {
  // Core state
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    isConnected: false
  });
  
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInConversationMode, setIsInConversationMode] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  
  // Refs
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize LISA connection
  useEffect(() => {
    initializeLISA();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const initializeLISA = async () => {
    try {
      const socket = io('http://localhost:3001', {
        transports: ['websocket'],
        autoConnect: true,
      });

      socket.on('connect', () => {
        setVoiceState(prev => ({ ...prev, isConnected: true }));
        showNotification('LISA connected!', 'success');
      });

      socket.on('disconnect', () => {
        setVoiceState(prev => ({ ...prev, isConnected: false }));
      });

      socket.on('voice-response', handleVoiceResponse);
      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to initialize LISA:', error);
      showNotification('Failed to connect to LISA', 'error');
    }
  };

  const handleVoiceResponse = useCallback(async (data: any) => {
    if (data.response) {
      addToConversation('assistant', data.response);
      
      // Play AI response
      try {
        setVoiceState(prev => ({ ...prev, isSpeaking: true }));
        if (!audioInitialized) {
          await initializeAudio();
        }
        await audioService.speak(data.response);
      } catch (error) {
        console.error('Speech failed:', error);
      } finally {
        setVoiceState(prev => ({ ...prev, isSpeaking: false }));
        
        // Auto-restart listening in conversation mode
        if (isInConversationMode) {
          setTimeout(() => {
            if (isInConversationMode) {
              startListening();
            }
          }, 1500);
        }
      }
    }
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

  const initializeAudio = async () => {
    if (audioInitialized) return true;
    try {
      await audioService.initialize();
      setAudioInitialized(true);
      showNotification('Audio enabled!', 'success');
      return true;
    } catch (error) {
      showNotification('Audio setup failed', 'warning');
      return false;
    }
  };

  const startListening = async () => {
    try {
      setVoiceState(prev => ({ ...prev, isListening: true }));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      const mediaRecorder = new MediaRecorder(stream);
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
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (voiceState.isListening) {
          stopListening();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Microphone access failed:', error);
      showNotification('Microphone access denied', 'error');
      setVoiceState(prev => ({ ...prev, isListening: false }));
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
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('conversationMode', 'true');

      if (conversation.length > 0) {
        const context = conversation.slice(-4).map(msg => `${msg.role}: ${msg.content}`);
        formData.append('context', JSON.stringify(context));
      }

      const response = await fetch('http://localhost:3001/api/voice/enhanced-process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.transcript) {
        addToConversation('user', result.transcript);
        
        if (socketRef.current) {
          socketRef.current.emit('voice-command', {
            transcript: result.transcript,
            isEndOfSpeech: true,
            useNaturalConversation: true
          });
        }
      }
    } catch (error) {
      console.error('Audio processing failed:', error);
      showNotification('Failed to process speech', 'error');
    } finally {
      setVoiceState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const toggleConversationMode = async () => {
    if (isInConversationMode) {
      setIsInConversationMode(false);
      stopListening();
      showNotification('Conversation mode stopped', 'info');
    } else {
      setIsInConversationMode(true);
      if (!audioInitialized) {
        await initializeAudio();
      }
      await startListening();
      showNotification('Conversation mode active!', 'success');
      addToConversation('assistant', '🎙️ Conversation mode started! I\'m listening continuously.');
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, severity });
  };

  // Get status color
  const getStatusColor = () => {
    if (!voiceState.isConnected) return '#f44336'; // red
    if (voiceState.isListening) return '#4caf50'; // green
    if (voiceState.isProcessing) return '#ff9800'; // orange
    if (voiceState.isSpeaking) return '#2196f3'; // blue
    return '#9e9e9e'; // grey
  };

  // Get status text
  const getStatusText = () => {
    if (!voiceState.isConnected) return 'Disconnected';
    if (voiceState.isListening) return 'Listening...';
    if (voiceState.isProcessing) return 'Processing...';
    if (voiceState.isSpeaking) return 'Speaking...';
    return isInConversationMode ? 'Ready to listen' : 'Ready';
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
      {/* Beautiful Main Button */}
      <Zoom in={!isExpanded}>
        <Fab
          size="large"
          onClick={() => setIsExpanded(true)}
          sx={{
            background: `linear-gradient(135deg, ${getStatusColor()}, ${alpha(getStatusColor(), 0.7)})`,
            color: 'white',
            width: 72,
            height: 72,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            '&:hover': {
              transform: 'scale(1.1)',
              transition: 'all 0.3s ease',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <SmartToyIcon sx={{ fontSize: 32 }} />
        </Fab>
      </Zoom>

      {/* Expanded Interface */}
      <Slide direction="up" in={isExpanded} mountOnEnter unmountOnExit>
        <Card
          sx={{
            width: 350,
            maxHeight: 500,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <Box sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            background: alpha('#000', 0.1) 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                  LISA
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  AI Voice Assistant
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isInConversationMode && (
                <Chip 
                  label="Live"
                  size="small"
                  sx={{ 
                    bgcolor: '#4caf50', 
                    color: 'white',
                    animation: 'pulse 2s infinite'
                  }}
                />
              )}
              <Chip 
                label={voiceState.isConnected ? 'Connected' : 'Offline'}
                size="small"
                color={voiceState.isConnected ? 'success' : 'error'}
              />
              <IconButton 
                size="small" 
                sx={{ color: 'white' }}
                onClick={() => setIsExpanded(false)}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Status */}
          <Box sx={{ px: 2, py: 1, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {getStatusText()}
            </Typography>
          </Box>

          {/* Conversation */}
          {conversation.length > 0 && (
            <Box sx={{ 
              maxHeight: 200, 
              overflowY: 'auto',
              px: 2,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { 
                backgroundColor: alpha('#fff', 0.3), 
                borderRadius: 2 
              }
            }}>
              {conversation.slice(-3).map((msg, index) => (
                <Box key={index} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ 
                    opacity: 0.8,
                    color: msg.role === 'user' ? '#90caf9' : '#a5d6a7'
                  }}>
                    {msg.role === 'user' ? '👤 You' : '🤖 LISA'}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: '0.9rem',
                      backgroundColor: alpha('#fff', msg.role === 'user' ? 0.15 : 0.1),
                      p: 1,
                      borderRadius: 2,
                      mt: 0.5
                    }}
                  >
                    {msg.content}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Controls */}
          <Box sx={{ 
            p: 2, 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 2,
            borderTop: `1px solid ${alpha('#fff', 0.1)}`
          }}>
            {/* Main Voice Button */}
            <Tooltip title={isInConversationMode ? "Stop Conversation" : "Start Conversation"}>
              <IconButton
                onClick={toggleConversationMode}
                disabled={!voiceState.isConnected}
                sx={{
                  bgcolor: isInConversationMode ? '#f44336' : '#4caf50',
                  color: 'white',
                  width: 56,
                  height: 56,
                  border: `3px solid ${isInConversationMode ? '#f44336' : '#4caf50'}`,
                  '&:hover': {
                    transform: 'scale(1.1)',
                    bgcolor: isInConversationMode ? '#d32f2f' : '#388e3c',
                  },
                  transition: 'all 0.3s ease',
                  '&:disabled': {
                    bgcolor: '#666',
                  },
                }}
              >
                {isInConversationMode ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
            </Tooltip>

            {/* Single Listen Button */}
            {!isInConversationMode && (
              <Tooltip title={voiceState.isListening ? "Stop" : "Listen Once"}>
                <IconButton
                  onClick={voiceState.isListening ? stopListening : startListening}
                  disabled={!voiceState.isConnected || voiceState.isProcessing}
                  sx={{
                    bgcolor: voiceState.isListening ? '#ff9800' : '#2196f3',
                    color: 'white',
                    '&:hover': {
                      bgcolor: voiceState.isListening ? '#f57c00' : '#1976d2',
                    },
                    '&:disabled': {
                      bgcolor: '#666',
                    },
                  }}
                >
                  {voiceState.isListening ? <MicOffIcon /> : <MicIcon />}
                </IconButton>
              </Tooltip>
            )}

            {/* Audio Button */}
            {!audioInitialized && (
              <Tooltip title="Enable Audio">
                <IconButton
                  onClick={initializeAudio}
                  sx={{
                    bgcolor: '#ff9800',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#f57c00',
                    },
                  }}
                >
                  <VolumeUpIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Quick Help */}
          {conversation.length === 0 && (
            <Box sx={{ 
              p: 2, 
              textAlign: 'center', 
              borderTop: `1px solid ${alpha('#fff', 0.1)}`,
              bgcolor: alpha('#000', 0.1)
            }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                💬 Say: "Hi LISA, show me all orders"
              </Typography>
            </Box>
          )}
        </Card>
      </Slide>

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
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

      {/* CSS for animations */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

export default BeautifulLISAInterface;

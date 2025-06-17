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
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { io, Socket } from 'socket.io-client';
import { audioService } from '../services/AudioService';
import { AudioPermissionManager } from './AudioPermissionManager';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

export const VoiceInterface: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [useNaturalConversation, setUseNaturalConversation] = useState(true);
  const [conversationMode, setConversationMode] = useState<'single' | 'conversation'>('single');
  const [isInConversation, setIsInConversation] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  
  // Audio-related state
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioPermissionOpen, setAudioPermissionOpen] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Check if voice is enabled
    const voiceEnabled = import.meta.env.VITE_ENABLE_VOICE === 'true';
    if (!voiceEnabled) return;

    // Reset any stuck speech state when component mounts
    audioService.resetSpeechState();

    // Load speech synthesis voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('🎤 Available voices:', voices.length);
      if (voices.length > 0) {
        voices.forEach(voice => {
          console.log(`Voice: ${voice.name} (${voice.lang})`);
        });
      }
    };

    // Load voices immediately and on voices changed event
    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      // Note: Don't initialize speech here as it requires user interaction
      console.log('🎤 Speech synthesis available, waiting for user interaction');
    }

    // Initialize WebSocket connection ONCE - with explicit production URLs
    let wsUrl: string;
    
    // Force production URL for Vercel deployments
    if (window.location.hostname.includes('vercel.app')) {
      wsUrl = 'wss://orderoverview-dkro.onrender.com';
      console.log('🌐 Detected Vercel deployment, using production backend');
    } else if (import.meta.env.VITE_WEBSOCKET_URL) {
      wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
      console.log('🔧 Using environment variable VITE_WEBSOCKET_URL');
    } else {
      wsUrl = 'ws://localhost:3001';
      console.log('🏠 Using local development URL');
    }
    
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    socketRef.current = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
    });
    
    socketRef.current.on('connected', (data) => {
      console.log('LISA connected with session:', data.sessionId);
      setError(null);
      
      // Show LISA's welcome message
      if (data.message) {
        setResponse(data.message);
        setStatus('speaking');
        speakResponse(data.message);
      }
    });

    socketRef.current.on('voice-response', (data) => {
      // Handle different types of responses
      if (data.fillerWord && data.shouldSpeak) {
        speakResponse(data.fillerWord, true); // Speak filler word quietly
        return;
      }
      
      if (data.response && data.shouldSpeak) {
        setResponse(data.response);
        setStatus('speaking');
        speakResponse(data.response);
      }
      
      // Handle different actions with enhanced feedback
      if (data.action === 'ORDERS_FOUND' || data.action === 'search_results') {
        console.log('Orders found:', data.data);
        if (data.data?.orders) {
          setSearchResults(data.data.orders);
          setTotalCost(data.data.totalCost || 0);
          setSearchDialogOpen(true);
        }
      } else if (data.action === 'PDF_GENERATED') {
        console.log('PDF generated:', data.data.url);
        window.open(data.data.url, '_blank');
      } else if (data.action === 'CREATE_ORDER' || data.action === 'order_created') {
        console.log('Order creation:', data.data);
        if (data.data?.id) {
          setSnackbarMessage(`✅ Order successfully created with ID: ${data.data.id}`);
          setSnackbarOpen(true);
        }
      } else if (data.action === 'customer_created') {
        if (data.data?.id) {
          setSnackbarMessage(`✅ Customer successfully created with ID: ${data.data.id}`);
          setSnackbarOpen(true);
        }
      } else if (data.action === 'end_conversation') {
        // LISA detected conversation ending
        endConversation();
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      console.error('Error type:', (error as any).type);
      console.error('Error message:', error.message);
      console.error('Error description:', (error as any).description);
      
      let errorMessage = 'Unable to connect to voice service';
      if (error.message?.includes('xhr poll error')) {
        errorMessage = 'Connection failed - backend may be offline';
        console.log('🔧 XHR polling failed, trying direct WebSocket...');
      } else if (error.message?.includes('websocket error')) {
        errorMessage = 'WebSocket connection failed, falling back to polling';
      }
      
      setError(errorMessage);
      setStatus('error');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setError('Connection lost');
      setStatus('error');
      
      // Auto-reconnect after a delay unless it was intentional
      if (reason !== 'io client disconnect') {
        setTimeout(() => {
          if (!socketRef.current?.connected) {
            console.log('Attempting to reconnect...');
            socketRef.current?.connect();
          }
        }, 3000);
      }
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket reconnected');
      setError(null);
      setStatus('idle');
    });

    // Set up heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 30000); // Send ping every 30 seconds

    return () => {
      console.log('Cleaning up WebSocket connection');
      clearInterval(heartbeat);
      socketRef.current?.disconnect();
    };
  }, []); // Only run once on mount

  // Separate useEffect for Speech Recognition initialization
  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Enable continuous listening
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.results[event.results.length - 1];
        const transcriptText = current[0].transcript;
        
        if (current.isFinal) {
          setTranscript(transcriptText);
          setInterimTranscript('');
          sendVoiceCommand(transcriptText, true, false); // Final result
        } else {
          setInterimTranscript(transcriptText);
          // Send interim results for natural conversation in conversation mode
          if (useNaturalConversation && isInConversation) {
            sendVoiceCommand(transcriptText, false, true); // Interim result
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        setStatus('error');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (status === 'listening') {
          setStatus('processing');
        }
        
        // Auto-restart listening in conversation mode
        if (isInConversation && !error) {
          setTimeout(() => {
            if (recognitionRef.current && status !== 'error' && isInConversation) {
              setIsListening(true);
              setStatus('listening');
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.warn('Could not restart speech recognition:', e);
              }
            }
          }, 1000); // Brief pause before restarting
        }
      };
    } else {
      setError('Speech recognition not supported in this browser');
      setStatus('error');
    }
  }, []); // Only run once on mount

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setStatus('listening');
      setTranscript('');
      setError(null);
      setIsExpanded(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const startConversation = async () => {
    // Initialize audio service on user interaction
    const audioReady = await initializeAudio();
    if (!audioReady) {
      console.warn('Audio initialization failed, continuing without audio');
    }
    
    setIsInConversation(true);
    setConversationMode('conversation');
    startListening();
    if (socketRef.current) {
      socketRef.current.emit('start-conversation');
    }
  };

  const endConversation = () => {
    setIsInConversation(false);
    setConversationMode('single');
    stopListening();
    setStatus('idle');
    if (socketRef.current) {
      socketRef.current.emit('end-conversation');
    }
  };

  const sendVoiceCommand = (
    text: string, 
    isEndOfSpeech: boolean = true, 
    interimResults: boolean = false
  ) => {
    if (socketRef.current && text.trim()) {
      setStatus('processing');
      socketRef.current.emit('voice-command', { 
        transcript: text,
        isEndOfSpeech,
        interimResults,
        useNaturalConversation
      });
    }
  };

  const initializeAudio = async () => {
    try {
      console.log('🎤 Initializing LISA audio service with user interaction...');
      
      // Initialize audioService with user interaction
      await audioService.initialize();
      
      // Test with a silent utterance to ensure Chrome allows audio
      await audioService.speak('', { volume: 0 });
      
      setAudioInitialized(true);
      setAudioEnabled(true);
      
      console.log('🎤 LISA audio service initialized successfully');
      return true;
    } catch (error) {
      console.error('🎤 Audio initialization failed:', error);
      
      // Show user-friendly error based on the issue
      if (error instanceof Error) {
        if (error.message.includes('autoplay') || error.message.includes('not-allowed')) {
          setError('Audio blocked by Chrome - click the "Enable Audio" button first');
        } else if (error.message.includes('interaction')) {
          setError('User interaction required - click any button to enable audio');
        } else {
          setError(`Audio setup failed: ${error.message}`);
        }
      }
      
      setAudioPermissionOpen(true);
      return false;
    }
  };

  const speakResponse = async (text: string, isFillerWord: boolean = false) => {
    if (!audioEnabled) {
      console.log('🔇 Audio disabled, skipping speech:', text);
      return;
    }

    try {
      // Configure audio options for LISA's voice
      const options = {
        rate: useNaturalConversation ? 0.9 : 1.0,
        pitch: 1.0,
        volume: isFillerWord ? 0.7 : 0.9,
        lang: 'en-US'
      };

      // Set status to speaking before starting
      setStatus('speaking');
      if (socketRef.current) {
        socketRef.current.emit('voice-status', { status: 'speaking' });
      }

      // Use audioService to speak
      await audioService.speak(text, options);

      // Update status when done
      setStatus('idle');
      if (socketRef.current) {
        socketRef.current.emit('voice-status', { status: 'idle' });
      }

    } catch (error) {
      console.error('🎤 LISA speech error:', error);
      setStatus('idle');
      
      // Handle specific Chrome autoplay errors
      if (error instanceof Error) {
        if (error.message.includes('autoplay') || error.message.includes('permission')) {
          setError('Audio blocked by browser - please enable audio permissions');
          setAudioPermissionOpen(true);
        } else {
          setError(`Speech error: ${error.message}`);
        }
      }
    }
  };

  const handleInterruption = () => {
    // Use audioService to stop speech
    audioService.stopSpeaking();
    setStatus('idle');
    
    // Notify backend of interruption
    if (socketRef.current) {
      socketRef.current.emit('voice-interruption');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening': return 'error';
      case 'processing': return 'warning';
      case 'speaking': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'LISA is listening...';
      case 'processing': return 'LISA is thinking...';
      case 'speaking': return 'LISA is speaking...';
      case 'error': return 'LISA encountered an error';
      default: return 'LISA - Voice Assistant';
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Don't render if voice is not enabled
  if (import.meta.env.VITE_ENABLE_VOICE !== 'true') {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        transition: 'all 0.3s ease-in-out',
      }}
    >
      {/* Small Circular LISA Tab */}
      {!isExpanded && (
        <Paper
          elevation={6}
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: status === 'speaking' 
              ? 'linear-gradient(45deg, #4CAF50 30%, #81C784 90%)'
              : status === 'listening' 
              ? 'linear-gradient(45deg, #f44336 30%, #e57373 90%)'
              : status === 'processing'
              ? 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)'
              : 'linear-gradient(45deg, #2196F3 30%, #64B5F6 90%)',
            '&:hover': { 
              transform: 'scale(1.1)',
              boxShadow: 8
            },
            animation: status === 'speaking' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.05)' },
              '100%': { transform: 'scale(1)' }
            }
          }}
          onClick={toggleExpanded}
        >
          <VolumeUpIcon 
            sx={{ 
              fontSize: 28, 
              color: 'white',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }} 
          />
          
          {/* Status indicator dot */}
          <Box
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: status === 'error' ? '#f44336' : '#4CAF50',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </Paper>
      )}

      {/* Expanded Interface */}
      {isExpanded && (
        <Paper
          elevation={8}
          sx={{
            width: 380,
            maxHeight: 500,
            borderRadius: 2,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
        >
          {/* Header Bar */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 2,
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              '&:hover': { background: 'rgba(255,255,255,0.15)' }
            }}
            onClick={toggleExpanded}
          >
            <VolumeUpIcon sx={{ mr: 1 }} />
            <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              LISA - Voice Assistant
            </Typography>
            <Chip
              label={status.toUpperCase()}
              size="small"
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>
          
          {/* Main Content */}
          <Box sx={{ p: 3, backgroundColor: 'rgba(255,255,255,0.05)' }}>
            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2, 
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  color: 'white',
                  '& .MuiAlert-icon': { color: '#ff6b6b' }
                }}
              >
                {error}
              </Alert>
            )}

          {/* Microphone Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton
              size="large"
              color={isInConversation ? 'warning' : (isListening ? 'error' : 'primary')}
              onClick={isInConversation ? endConversation : (isListening ? stopListening : startConversation)}
              onDoubleClick={handleInterruption} // Double-click to interrupt AI speech
              disabled={status === 'processing' || status === 'error'}
              sx={{
                mr: 2,
                border: '2px solid',
                borderColor: isInConversation ? 'warning.main' : (isListening ? 'error.main' : 'primary.main'),
              }}
            >
              {isInConversation ? <MicIcon /> : (isListening ? <MicOffIcon /> : <MicIcon />)}
            </IconButton>
            
            {/* Audio Control Button */}
            <IconButton
              size="medium"
              color={audioEnabled ? 'success' : 'default'}
              onClick={() => setAudioPermissionOpen(true)}
              sx={{ mr: 1 }}
              title={audioEnabled ? 'Audio enabled - click to adjust settings' : 'Audio disabled - click to enable'}
            >
              {audioEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
            </IconButton>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                {isInConversation 
                  ? 'Click to end conversation' 
                  : (isListening ? 'Click to stop' : 'Click to start conversation')}
              </Typography>
              {status === 'speaking' && (
                <Typography variant="caption" color="warning.main">
                  Double-click mic to interrupt
                </Typography>
              )}
              {!audioEnabled && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Audio disabled - click speaker icon to enable
                </Typography>
              )}
            </Box>
          </Box>

          {/* Progress Bar for Processing */}
          {status === 'processing' && (
            <LinearProgress sx={{ mb: 2 }} />
          )}

          {/* Transcript Display */}
          {(transcript || interimTranscript) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                You said:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontStyle: 'italic',
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  p: 1,
                  borderRadius: 1,
                  mt: 0.5
                }}
              >
                "{transcript || interimTranscript}"
                {interimTranscript && (
                  <Typography 
                    component="span" 
                    sx={{ opacity: 0.6, fontStyle: 'normal' }}
                  >
                    {' (speaking...)'}
                  </Typography>
                )}
              </Typography>
            </Box>
          )}

          {/* AI Response Display */}
          {response && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                LISA:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  backgroundColor: 'rgba(76, 175, 80, 0.08)',
                  p: 1,
                  borderRadius: 1,
                  mt: 0.5,
                  maxHeight: 150,
                  overflow: 'auto'
                }}
              >
                {response}
              </Typography>
            </Box>
          )}

          {/* Help Text */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              💬 Chat with LISA - Your natural conversation examples:
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              • "Hi LISA, I need to create a new glass order"
            </Typography>
            <Typography variant="caption" display="block">
              • "LISA, can you show me orders from this week?"
            </Typography>
            <Typography variant="caption" display="block">
              • "I'm looking for customer Smith's orders"
            </Typography>
            <Typography variant="caption" display="block">
              • "Generate a PDF report for order 123"
            </Typography>
            {isInConversation && (
              <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic', color: 'warning.main' }}>
                🎙️ LISA is actively listening in conversation mode - say "stop" or "finish" to end
              </Typography>
            )}
            {useNaturalConversation && !isInConversation && (
              <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic', color: 'success.main' }}>
                🎙️ LISA is in natural conversation mode - start a conversation to chat continuously
              </Typography>
            )}
            
            {/* Settings Toggle */}
            <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Settings:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={useNaturalConversation ? "Natural Mode" : "Simple Mode"}
                  size="small"
                  color={useNaturalConversation ? "success" : "default"}
                  onClick={() => setUseNaturalConversation(!useNaturalConversation)}
                  variant="outlined"
                />
                <Chip
                  label={isInConversation ? "In Conversation" : "Ready to Chat"}
                  size="small"
                  color={isInConversation ? "warning" : "default"}
                  onClick={() => isInConversation ? endConversation() : startConversation()}
                  variant="outlined"
                />
                <Chip
                  label="Test LISA Voice"
                  size="small"
                  color="info"
                  onClick={async () => {
                    const audioReady = await initializeAudio();
                    if (audioReady) {
                      speakResponse("Hello! I am LISA, your Language Intelligence Support Assistant. I am ready to help you with your glass manufacturing orders.");
                    }
                  }}
                  variant="outlined"
                />
                <Chip
                  label="Reset Speech"
                  size="small"
                  color="warning"
                  onClick={() => {
                    console.log('🔄 Manually resetting speech state...');
                    audioService.resetSpeechState();
                    setStatus('idle');
                    setError('');
                  }}
                  variant="outlined"
                />
              </Box>              </Box>
            </Box>
          </Box>
        </Paper>
      )}
      
      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
      
      {/* Search Results Dialog */}
      <Dialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Search Results
          <Typography variant="subtitle2" color="text.secondary">
            Found {searchResults.length} orders • Total Cost: ${totalCost.toFixed(2)}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Glass Type</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Dimensions</TableCell>
                  <TableCell>Cost</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.customer?.name || order.customerName || 'N/A'}</TableCell>
                    <TableCell>{order.glassType}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      {order.width && order.height 
                        ? `${order.width}×${order.height}mm` 
                        : 'N/A'}
                    </TableCell>
                    <TableCell>${(order.cost || order.totalPrice || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={order.status} 
                        size="small" 
                        color={order.status === 'completed' ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Audio Permission Manager */}
      <AudioPermissionManager 
        open={audioPermissionOpen}
        onClose={() => setAudioPermissionOpen(false)}
        onPermissionGranted={() => {
          setAudioEnabled(true);
          setAudioInitialized(true);
        }}
      />
    </Box>
  );
};

export default VoiceInterface;

import React, { useState, useEffect, useRef } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { io, Socket } from 'socket.io-client';
import { audioService } from '../services/AudioService';

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

// Error Boundary for LISA Voice Interface
class LISAErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('LISA Error Boundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LISA Error Boundary details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1300,
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 2,
              maxWidth: 300,
              bgcolor: 'error.light',
              color: 'error.contrastText',
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              LISA Voice Assistant Error
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Voice interface temporarily unavailable
            </Typography>
            <Button
              size="small"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              sx={{ color: 'inherit' }}
            >
              Restart LISA
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export const LISAInterface: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [useNaturalConversation, setUseNaturalConversation] = useState(true);
  const [isInConversation, setIsInConversation] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [audioInitialized, setAudioInitialized] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Check if voice is enabled
    const voiceEnabled = import.meta.env.VITE_ENABLE_VOICE === 'true';
    if (!voiceEnabled) return;

    // Reset any stuck speech state when component mounts
    audioService.resetSpeechState();

    // Initialize WebSocket connection
    let wsUrl: string;
    
    if (window.location.hostname.includes('vercel.app')) {
      wsUrl = 'wss://orderoverview-dkro.onrender.com';
    } else if (import.meta.env.VITE_WEBSOCKET_URL) {
      wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
    } else {
      wsUrl = 'ws://localhost:3001';
    }
    
    console.log('🔌 LISA connecting to:', wsUrl);
    socketRef.current = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
    });
    
    socketRef.current.on('connected', (data) => {
      console.log('LISA connected with session:', data.sessionId);
      setError(null);
      if (data.message) {
        setResponse(data.message);
        setStatus('speaking');
        speakResponse(data.message);
      }
    });

    socketRef.current.on('voice-response', (data) => {
      if (data.fillerWord && data.shouldSpeak) {
        speakResponse(data.fillerWord, true);
        return;
      }
      
      if (data.response && data.shouldSpeak) {
        setResponse(data.response);
        setStatus('speaking');
        speakResponse(data.response);
      }
      
      // Handle actions
      if (data.action === 'ORDERS_FOUND' || data.action === 'search_results') {
        if (data.data?.orders) {
          setSearchResults(data.data.orders);
          setTotalCost(data.data.totalCost || 0);
          setSearchDialogOpen(true);
        }
      } else if (data.action === 'CREATE_ORDER' || data.action === 'order_created') {
        if (data.data?.id) {
          setSnackbarMessage(`✅ Order created with ID: ${data.data.id}`);
          setSnackbarOpen(true);
        }
      } else if (data.action === 'end_conversation') {
        endConversation();
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket error:', error);
      setError('Unable to connect to LISA voice service');
      setStatus('error');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setError('Connection lost');
      setStatus('error');
      
      if (reason !== 'io client disconnect') {
        setTimeout(() => {
          if (!socketRef.current?.connected) {
            socketRef.current?.connect();
          }
        }, 3000);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    
    if (SpeechRecognition) {
      try {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          try {
            const current = event.results[event.results.length - 1];
            const transcriptText = current[0].transcript;
            
            if (current.isFinal) {
              setTranscript(transcriptText);
              setInterimTranscript('');
              sendVoiceCommand(transcriptText, true, false);
            } else {
              setInterimTranscript(transcriptText);
              if (useNaturalConversation && isInConversation) {
                sendVoiceCommand(transcriptText, false, true);
              }
            }
          } catch (resultError) {
            console.error('Error processing speech recognition result:', resultError);
          }
        };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Safely handle error without causing React issues
        try {
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
          setStatus('error');
          
          // Reset recognition if needed
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (stopError) {
              console.warn('Error stopping recognition:', stopError);
            }
          }
        } catch (handlerError) {
          console.error('Error in speech recognition error handler:', handlerError);
          // Fallback error handling
          setStatus('error');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (status === 'listening') {
          setStatus('processing');
        }
        
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
          }, 1000);
        }
      };
      } catch (initError) {
        console.error('Error initializing speech recognition:', initError);
        setError('Failed to initialize speech recognition');
        setStatus('error');
      }
    } else {
      setError('Speech recognition not supported in this browser');
      setStatus('error');
    }
  }, []);

  const initializeAudio = async () => {
    try {
      await audioService.initialize();
      await audioService.speak('', { volume: 0 });
      setAudioInitialized(true);
      console.log('🎤 LISA audio initialized');
      return true;
    } catch (error) {
      console.error('🎤 Audio initialization failed:', error);
      return false;
    }
  };

  const speakResponse = async (text: string, isFillerWord: boolean = false) => {
    try {
      const options = {
        rate: 0.9,
        pitch: 1.0,
        volume: isFillerWord ? 0.7 : 0.9,
        lang: 'en-US'
      };

      setStatus('speaking');
      await audioService.speak(text, options);
      setStatus('idle');
    } catch (error) {
      console.error('🎤 LISA speech error:', error);
      setStatus('idle');
    }
  };

  const startConversation = async () => {
    if (!audioInitialized) {
      const audioReady = await initializeAudio();
      if (!audioReady) {
        setError('Audio initialization failed - continuing without voice');
      }
    }
    
    setIsInConversation(true);
    startListening();
    if (socketRef.current) {
      socketRef.current.emit('start-conversation');
    }
  };

  const endConversation = () => {
    setIsInConversation(false);
    stopListening();
    setStatus('idle');
    if (socketRef.current) {
      socketRef.current.emit('end-conversation');
    }
  };

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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'center' }}>
              <IconButton
                size="large"
                onClick={isInConversation ? endConversation : startConversation}
                disabled={status === 'processing' || status === 'error'}
                sx={{
                  width: 80,
                  height: 80,
                  border: '3px solid',
                  borderColor: isInConversation ? 'warning.main' : (isListening ? 'error.main' : 'white'),
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    transform: 'scale(1.05)'
                  }
                }}
              >
                {isInConversation ? (
                  <MicIcon sx={{ fontSize: 40, color: 'white' }} />
                ) : (
                  <MicOffIcon sx={{ fontSize: 40, color: 'white' }} />
                )}
              </IconButton>
            </Box>

            {/* Status Text */}
            <Typography 
              variant="body1" 
              align="center" 
              sx={{ mb: 2, fontWeight: 'bold' }}
            >
              {isInConversation 
                ? 'LISA is listening...' 
                : 'Click microphone to start conversation'}
            </Typography>

            {/* Progress Bar for Processing */}
            {status === 'processing' && (
              <LinearProgress 
                sx={{ 
                  mb: 2,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'white'
                  }
                }} 
              />
            )}

            {/* Transcript Display */}
            {(transcript || interimTranscript) && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  You said:
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontStyle: 'italic',
                    backgroundColor: 'rgba(255,255,255,0.1)',
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
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  LISA:
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    p: 1,
                    borderRadius: 1,
                    mt: 0.5,
                    maxHeight: 100,
                    overflow: 'auto'
                  }}
                >
                  {response}
                </Typography>
              </Box>
            )}

            {/* Help Text */}
            <Box sx={{ mt: 2, opacity: 0.8 }}>
              <Typography variant="caption" display="block">
                💬 Try saying:
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                • "Hi LISA, show me all orders"
              </Typography>
              <Typography variant="caption" display="block">
                • "Create a new glass order"
              </Typography>
              <Typography variant="caption" display="block">
                • "Find orders for customer Smith"
              </Typography>
              
              {isInConversation && (
                <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic', color: 'yellow' }}>
                  🎙️ Say "stop" or "finish" to end conversation
                </Typography>
              )}
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
        sx={{
          '& .MuiDialog-paper': {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>
          Search Results
          <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
            Found {searchResults.length} orders • Total Cost: ${totalCost.toFixed(2)}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table sx={{ '& .MuiTableCell-root': { color: 'white' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Glass Type</TableCell>
                  <TableCell>Quantity</TableCell>
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
                    <TableCell>${(order.cost || order.totalPrice || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={order.status} 
                        size="small" 
                        sx={{ 
                          backgroundColor: order.status === 'completed' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.2)',
                          color: 'white'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchDialogOpen(false)} sx={{ color: 'white' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Wrapped component with error boundary
const LISAInterfaceWithErrorBoundary: React.FC = () => {
  return (
    <LISAErrorBoundary>
      <LISAInterface />
    </LISAErrorBoundary>
  );
};

export default LISAInterfaceWithErrorBoundary;

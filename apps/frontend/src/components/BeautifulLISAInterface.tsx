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
  
  // Missing transcript states - add these back!
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [currentLISAResponse, setCurrentLISAResponse] = useState('');
  const [lisaTranscript, setLisaTranscript] = useState('');
  const [isLISASpeaking, setIsLISASpeaking] = useState(false);
  
  // Speech recognition ref for cleanup
  const speechRecognitionRef = useRef<any>(null);
  const conversationHeartbeatRef = useRef<NodeJS.Timeout | null>(null);
  
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
      // Cleanup speech recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      // Clear conversation heartbeat
      if (conversationHeartbeatRef.current) {
        clearInterval(conversationHeartbeatRef.current);
      }
    };
  }, []);

  const initializeLISA = async () => {
    try {
      const socket = io('http://localhost:3001', {
        transports: ['websocket'],
        autoConnect: true,
        timeout: 5000, // 5 second timeout
        forceNew: true,
      });

      socket.on('connect', () => {
        setVoiceState(prev => ({ ...prev, isConnected: true }));
        showNotification('🤖 LISA connected!', 'success');
        console.log('✅ LISA connected successfully');
      });

      socket.on('disconnect', () => {
        setVoiceState(prev => ({ ...prev, isConnected: false }));
        showNotification('LISA disconnected', 'warning');
        console.log('⚠️ LISA disconnected');
      });

      socket.on('connect_error', (error) => {
        console.error('❌ LISA connection error:', error);
        setVoiceState(prev => ({ ...prev, isConnected: false }));
        showNotification('LISA backend unavailable - using offline mode', 'warning');
      });

      socket.on('voice-response', handleVoiceResponse);
      socket.on('streaming-transcript', handleStreamingTranscript);
      socket.on('streaming-status', handleStreamingStatus);
      socket.on('streaming-error', handleStreamingError);

      socketRef.current = socket;
      
      // Test connection after a short delay
      setTimeout(() => {
        if (!socket.connected) {
          console.warn('⚠️ LISA backend appears to be offline');
          showNotification('LISA backend offline - voice features limited', 'warning');
        }
      }, 3000);
      
    } catch (error) {
      console.error('Failed to initialize LISA:', error);
      showNotification('Failed to connect to LISA', 'error');
    }
  };

  const handleVoiceResponse = useCallback(async (data: any) => {
    if (data.response) {
      console.log('🤖 LISA Response received:', data.response);
      console.log('📋 Current transcript states before update:', {
        currentTranscript,
        interimTranscript,
        currentLISAResponse,
        isLISASpeaking
      });
      
      setCurrentLISAResponse(data.response);
      setLisaTranscript(data.response);
      addToConversation('assistant', data.response);
      
      // Play AI response
      try {
        setVoiceState(prev => ({ ...prev, isSpeaking: true }));
        setIsLISASpeaking(true);
        console.log('🔊 Starting to play LISA audio...');
        
        if (!audioInitialized) {
          await initializeAudio();
        }
        
        console.log('🎵 Calling audioService.speak...');
        await audioService.speak(data.response);
        console.log('✅ Audio playback completed');
        
      } catch (error) {
        console.error('❌ Speech failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown audio error';
        showNotification('Audio playback failed: ' + errorMessage, 'error');
      } finally {
        console.log('🔄 LISA finished speaking (backend), clearing speaking state...');
        setVoiceState(prev => ({ ...prev, isSpeaking: false }));
        setIsLISASpeaking(false);
        
        // Directly restart listening if in conversation mode - check current mode in callback
        setTimeout(() => {
          // Use a state callback to get the current mode to avoid closure issues
          setIsInConversationMode(currentMode => {
            if (currentMode) {
              console.log('🔄 Restarting listening directly after LISA finished speaking (backend)...');
              startBrowserSpeechRecognition().catch((error) => {
                console.error('❌ Failed to restart after LISA speech (backend):', error);
              });
            }
            return currentMode; // Don't change the state, just check it
          });
        }, 300); // Short delay to ensure state is updated
      }
    }
  }, [audioInitialized, isInConversationMode, currentTranscript, interimTranscript, currentLISAResponse, isLISASpeaking]);

  const handleStreamingTranscript = useCallback((data: any) => {
    console.log('🎤 Real-time transcript:', data);
    console.log('📋 Current transcript states before streaming update:', {
      currentTranscript,
      interimTranscript,
      isFinal: data.isFinal
    });
    
    if (data.isFinal) {
      // Final transcript - show and process
      console.log('✅ Setting final transcript:', data.transcript);
      setCurrentTranscript(data.transcript);
      setLastSpokenText(data.transcript);
      setInterimTranscript('');
      addToConversation('user', data.transcript, data.confidence);
      console.log('✅ Final transcript processed:', data.transcript);
    } else {
      // Interim transcript - show in real-time
      console.log('⏳ Setting interim transcript:', data.transcript);
      setInterimTranscript(data.transcript);
      setCurrentTranscript(data.transcript);
      console.log('⏳ Interim transcript:', data.transcript);
    }
  }, [currentTranscript, interimTranscript]);

  const handleStreamingStatus = useCallback((data: any) => {
    console.log('📡 Streaming status:', data.status);
    
    if (data.status === 'connected') {
      showNotification('🎤 Real-time streaming active!', 'success');
    } else if (data.status === 'disconnected') {
      showNotification('Streaming disconnected', 'info');
    }
  }, []);

  const handleStreamingError = useCallback((data: any) => {
    console.error('❌ Streaming error:', data.error);
    showNotification(`Streaming error: ${data.error}`, 'error');
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
      console.log('🎤 Starting speech recognition...');
      setVoiceState(prev => ({ ...prev, isListening: true }));
      
      // Clear previous transcripts
      setCurrentTranscript('');
      setInterimTranscript('');
      setCurrentLISAResponse('');
      
      // Try browser speech recognition first (always prefer this)
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        console.log('🎤 Using browser speech recognition');
        try {
          await startBrowserSpeechRecognition();
          return; // Exit if browser speech recognition started successfully
        } catch (speechError) {
          console.warn('❌ Browser speech recognition failed:', speechError);
          setVoiceState(prev => ({ ...prev, isListening: false }));
          showNotification('Speech recognition failed', 'error');
          return;
        }
      } else {
        console.warn('❌ Browser speech recognition not supported');
        showNotification('Speech recognition not supported in this browser', 'error');
        setVoiceState(prev => ({ ...prev, isListening: false }));
        return;
      }
      
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      showNotification('Failed to start listening', 'error');
      setVoiceState(prev => ({ ...prev, isListening: false }));
    }
  };

  const startBrowserSpeechRecognition = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        reject(new Error('Speech recognition not supported in this browser'));
        return;
      }

      // Stop any existing recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      speechRecognitionRef.current = recognition;

      let finalTranscriptReceived = false;

      recognition.onstart = () => {
        console.log('🎤 Browser speech recognition started');
        setVoiceState(prev => ({ ...prev, isListening: true }));
        showNotification('🎤 Listening...', 'info');
        resolve();
      };

      recognition.onresult = (event: any) => {
        let interimTranscriptText = '';
        let finalTranscriptText = '';

        console.log('📝 Speech recognition results:', event.results);

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log(`Result ${i}: "${transcript}" (final: ${event.results[i].isFinal})`);
          
          if (event.results[i].isFinal) {
            finalTranscriptText += transcript;
            finalTranscriptReceived = true;
          } else {
            interimTranscriptText += transcript;
          }
        }

        // Update states immediately
        if (interimTranscriptText) {
          console.log('⏳ Setting interim transcript:', interimTranscriptText);
          setInterimTranscript(interimTranscriptText);
          setCurrentTranscript(interimTranscriptText);
        }

        if (finalTranscriptText && finalTranscriptReceived) {
          console.log('✅ Setting final transcript:', finalTranscriptText);
          setCurrentTranscript(finalTranscriptText);
          setLastSpokenText(finalTranscriptText);
          setInterimTranscript('');
          addToConversation('user', finalTranscriptText);
          
          // Generate offline response
          const response = getOfflineResponse(finalTranscriptText);
          if (response) {
            setTimeout(async () => {
              console.log('🤖 Generating offline response:', response);
              setCurrentLISAResponse(response);
              setLisaTranscript(response);
              setIsLISASpeaking(true);
              addToConversation('assistant', response);
              
              try {
                await audioService.speak(response);
                console.log('✅ Offline response spoken successfully');
              } catch (error) {
                console.error('❌ Failed to speak offline response:', error);
              } finally {
                console.log('🔄 LISA finished speaking (offline), clearing speaking state...');
                setIsLISASpeaking(false);
                
                // Directly restart listening if in conversation mode - check current mode in callback
                setTimeout(() => {
                  // Use a state callback to get the current mode to avoid closure issues
                  setIsInConversationMode(currentMode => {
                    if (currentMode) {
                      console.log('🔄 Restarting listening directly after LISA finished speaking...');
                      startBrowserSpeechRecognition().catch((error) => {
                        console.error('❌ Failed to restart after LISA speech:', error);
                      });
                    }
                    return currentMode; // Don't change the state, just check it
                  });
                }, 300); // Short delay to ensure state is updated
              }
            }, 500);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error);
        setVoiceState(prev => ({ ...prev, isListening: false }));
        
        if (event.error === 'no-speech') {
          showNotification('No speech detected, try again', 'warning');
        } else if (event.error === 'not-allowed') {
          showNotification('Microphone permission denied', 'error');
        } else {
          showNotification(`Speech recognition error: ${event.error}`, 'error');
        }
        
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        console.log('🛑 Speech recognition ended');
        setVoiceState(prev => ({ ...prev, isListening: false }));
        speechRecognitionRef.current = null;
        
        // Don't restart here - let the conversation heartbeat handle it
        // This prevents timing conflicts and double restarts
        if (!finalTranscriptReceived && !isInConversationMode) {
          showNotification('No speech detected', 'info');
        }
      };

      try {
        recognition.start();
      } catch (error) {
        console.error('❌ Failed to start speech recognition:', error);
        reject(error);
      }
    });
  };

  const getOfflineResponse = (transcript: string): string | null => {
    const text = transcript.toLowerCase().trim();
    
    console.log('🤖 Generating offline response for:', text);
    
    // Greetings
    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
      return "Hello! I'm LISA, your glass order assistant. How can I help you today?";
    }
    
    // Help requests
    if (text.includes('help') || text.includes('what can you do')) {
      return "I can help you with glass orders, customer information, and general inquiries. Try saying 'show me orders' or 'tell me about glass types'.";
    }
    
    // Order-related queries
    if (text.includes('order') || text.includes('orders')) {
      if (text.includes('show') || text.includes('display') || text.includes('list')) {
        return "I'd love to show you the orders, but I need to connect to the backend system to access the database. The backend appears to be offline right now.";
      }
      return "I can help you with glass orders! However, I need to connect to the backend system to access current order information.";
    }
    
    // Glass-related queries
    if (text.includes('glass') && (text.includes('type') || text.includes('kind') || text.includes('what'))) {
      return "We work with various types of glass including tempered glass, laminated glass, and custom cut glass. For current inventory, I'd need to check our backend system.";
    }
    
    // Customer queries
    if (text.includes('customer') || text.includes('client')) {
      return "I can help with customer information and management, but I need access to the backend database which appears to be offline.";
    }
    
    // Status queries
    if (text.includes('status') || text.includes('working') || text.includes('online')) {
      return "I'm running in offline mode using browser speech recognition. The backend server appears to be unavailable, so I have limited functionality right now.";
    }
    
    // Test phrases
    if (text.includes('test') || text.includes('testing')) {
      return "Voice recognition is working perfectly! I can hear you clearly using browser speech recognition.";
    }
    
    // Farewell
    if (text.includes('bye') || text.includes('goodbye') || text.includes('see you')) {
      return "Goodbye! Feel free to come back anytime. I'm always here to help with your glass orders!";
    }
    
    // Default response
    return `I heard you say "${transcript}". I'm currently in offline mode, so I have limited functionality. I can respond to basic queries about orders, glass types, and general help.`;
  };

  const stopListening = () => {
    console.log('🛑 Stopping speech recognition...');
    setVoiceState(prev => ({ ...prev, isListening: false }));
    
    // Stop browser speech recognition
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    
    // Stop media recorder (fallback)
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
        console.log('📝 Setting transcript states from processAudio:', result.transcript);
        setCurrentTranscript(result.transcript);
        setLastSpokenText(result.transcript);
        setInterimTranscript(''); // Clear interim when we have final
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

  // Simple direct restart approach - no complex heartbeat needed

  const toggleConversationMode = async () => {
    if (isInConversationMode) {
      // Stop conversation mode
      console.log('🛑 Stopping conversation mode');
      setIsInConversationMode(false);
      stopListening();
      
      // Clear conversation heartbeat
      if (conversationHeartbeatRef.current) {
        clearInterval(conversationHeartbeatRef.current);
        conversationHeartbeatRef.current = null;
      }
      
      // Stop streaming if active
      if (socketRef.current) {
        socketRef.current.emit('stop-streaming');
      }
      
      showNotification('Conversation mode stopped', 'info');
    } else {
      // Start conversation mode
      console.log('🎤 Starting conversation mode');
      setIsInConversationMode(true);
      
      if (!audioInitialized) {
        try {
          await initializeAudio();
        } catch (error) {
          console.warn('Audio initialization failed:', error);
        }
      }
      
      // Always use browser speech recognition for conversation mode
      showNotification('🎤 Conversation mode active! (Browser speech recognition)', 'success');
      addToConversation('assistant', '🎙️ Conversation mode started! I\'m listening continuously with browser speech recognition.');
      
      // Start listening immediately
      await startListening();
    }
  };

  const startStreamingMode = async (): Promise<boolean> => {
    try {
      console.log('🎤 Attempting to start real-time streaming mode...');
      
      if (!socketRef.current) {
        console.warn('No socket connection available for streaming');
        return false;
      }

      // Get audio stream for streaming
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        } 
      });

      // Start Deepgram streaming connection
      socketRef.current.emit('start-streaming');
      
      // Create MediaRecorder for real-time streaming
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current) {
          // Convert blob to base64 and stream to backend
          const reader = new FileReader();
          reader.onload = () => {
            const base64Audio = (reader.result as string).split(',')[1];
            socketRef.current?.emit('streaming-audio', { audio: base64Audio });
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Start recording in small chunks for real-time streaming
      mediaRecorder.start(100); // 100ms chunks for real-time processing
      mediaRecorderRef.current = mediaRecorder;
      setVoiceState(prev => ({ ...prev, isListening: true }));
      
      console.log('✅ Real-time streaming mode started successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start streaming mode:', error);
      console.log('🔄 Will fallback to batch mode');
      return false;
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, severity });
  };

  const handleLISAIconClick = async () => {
    try {
      setIsExpanded(true);
      
      // Initialize audio if not done already
      if (!audioInitialized) {
        try {
          await initializeAudio();
        } catch (audioError) {
          console.warn('❌ Audio initialization failed, will use browser TTS:', audioError);
          showNotification('Audio setup issue, using fallback voice', 'warning');
        }
      }
      
      // Play LISA greeting
      const greetingMessage = "I am LISA, how can I help you with glass orders?";
      console.log('🎙️ Playing LISA greeting...');
      
      setCurrentLISAResponse(greetingMessage);
      setLisaTranscript(greetingMessage);
      setIsLISASpeaking(true);
      addToConversation('assistant', greetingMessage);
      
      try {
        await audioService.speak(greetingMessage);
        console.log('✅ LISA greeting played successfully');
        showNotification('🎙️ LISA is ready to help!', 'success');
      } catch (error) {
        console.error('❌ Failed to play LISA greeting:', error);
        showNotification('LISA is ready (audio issue detected)', 'info');
      } finally {
        setIsLISASpeaking(false);
      }
      
    } catch (error) {
      console.error('❌ Error in handleLISAIconClick:', error);
      showNotification('LISA interface opened', 'info');
    }
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
    if (voiceState.isSpeaking || isLISASpeaking) return 'Speaking...';
    if (isInConversationMode) return '🎤 Ready to listen - Say something!';
    return 'Ready';
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
          onClick={handleLISAIconClick}
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
            width: 380,
            maxHeight: '80vh', // Use viewport height instead of fixed height
            minHeight: 400,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            bottom: 100, // Position relative to bottom to avoid going off screen
            right: 24,
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
                label={voiceState.isConnected ? 'Online' : 'Offline Mode'}
                size="small"
                color={voiceState.isConnected ? 'success' : 'warning'}
                sx={{ 
                  bgcolor: voiceState.isConnected ? undefined : '#ff9800',
                  color: voiceState.isConnected ? undefined : 'white'
                }}
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

          {/* Status and Transcript Section */}
          <Box sx={{ 
            px: 2, 
            py: 1, 
            textAlign: 'center',
            flex: '0 0 auto' // Don't grow, but maintain size
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.9,
                animation: (isInConversationMode && !voiceState.isListening && !isLISASpeaking) 
                  ? 'pulse 2s infinite' : 'none'
              }}
            >
              {getStatusText()}
            </Typography>
            
            {/* Real-time transcript display */}
            {(interimTranscript || currentTranscript) && (
              <Box sx={{ mt: 1, p: 1, bgcolor: alpha('#fff', 0.1), borderRadius: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                  {interimTranscript ? '⏳ You\'re saying:' : '✅ You said:'}
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontStyle: interimTranscript ? 'italic' : 'normal',
                  opacity: interimTranscript ? 0.8 : 1,
                  wordBreak: 'break-word', // Prevent text overflow
                  maxHeight: '60px',
                  overflowY: 'auto'
                }}>
                  "{interimTranscript || currentTranscript}"
                </Typography>
              </Box>
            )}
            
            {/* Debug info for transcript states */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 1, p: 1, bgcolor: alpha('#ff0000', 0.1), borderRadius: 1, fontSize: '0.7rem' }}>
                <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', wordBreak: 'break-all' }}>
                  🐛 Debug: transcript="{currentTranscript}", interim="{interimTranscript}", speaking={isLISASpeaking.toString()}, listening={voiceState.isListening.toString()}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', wordBreak: 'break-all' }}>
                  🔊 Response: "{currentLISAResponse}", Connection: {voiceState.isConnected ? 'online' : 'offline'}
                </Typography>
              </Box>
            )}
            
            {/* LISA's current response */}
            {(isLISASpeaking && currentLISAResponse) && (
              <Box sx={{ mt: 1, p: 1, bgcolor: alpha('#4caf50', 0.2), borderRadius: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', color: '#a5d6a7' }}>
                  🤖 LISA is saying:
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#a5d6a7',
                  wordBreak: 'break-word',
                  maxHeight: '60px',
                  overflowY: 'auto'
                }}>
                  "{currentLISAResponse}"
                </Typography>
              </Box>
            )}
          </Box>

          {/* Conversation */}
          {conversation.length > 0 && (
            <Box sx={{ 
              flex: '1 1 auto', // Allow this section to grow and shrink
              minHeight: 0, // Allow shrinking below content size
              overflowY: 'auto',
              px: 2,
              pb: 1,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { 
                backgroundColor: alpha('#fff', 0.3), 
                borderRadius: 2 
              }
            }}>
              {conversation.slice(-4).map((msg, index) => (
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
                      mt: 0.5,
                      wordBreak: 'break-word'
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
            borderTop: `1px solid ${alpha('#fff', 0.1)}`,
            flex: '0 0 auto' // Fixed size, don't grow or shrink
          }}>
            {/* Main Voice Button */}
            <Tooltip title={isInConversationMode ? "Stop Conversation" : "Start Conversation"}>
              <IconButton
                onClick={toggleConversationMode}
                disabled={false} // Always allow conversation mode, even offline
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
                  disabled={voiceState.isProcessing} // Only disable if processing
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
              bgcolor: alpha('#000', 0.1),
              flex: '0 0 auto' // Fixed size, don't grow or shrink
            }}>
              {voiceState.isConnected ? (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  💬 Say: "Hi LISA, show me all orders"
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  💬 Offline mode: Say "Hello" or "Help" to test voice
                </Typography>
              )}
            </Box>
          )}
        </Card>
      </Slide>

      {/* Debug Panel - Development Mode Only */}
      {process.env.NODE_ENV === 'development' && (
        <Paper
          sx={{
            position: 'fixed',
            top: 20,
            left: 20,
            p: 1,
            bgcolor: 'rgba(0,0,0,0.8)',
            color: 'white',
            fontSize: '0.75rem',
            maxWidth: 250,
            zIndex: 1400,
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', mb: 1 }}>
            🐛 Debug Panel
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Conversation Mode: {isInConversationMode ? '✅' : '❌'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Is Listening: {voiceState.isListening ? '✅' : '❌'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            LISA Speaking: {isLISASpeaking ? '✅' : '❌'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Recognition Active: {speechRecognitionRef.current ? '✅' : '❌'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Audio Init: {audioInitialized ? '✅' : '❌'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Connected: {voiceState.isConnected ? '✅' : '❌'}
          </Typography>
          {currentTranscript && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Last: "{currentTranscript.substring(0, 30)}..."
            </Typography>
          )}
        </Paper>
      )}

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

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import MicIcon from '@mui/icons-material/Mic';
import WarningIcon from '@mui/icons-material/Warning';

export const VoiceDebugPanel: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [testStatus, setTestStatus] = useState<string>('');
  const [lastError, setLastError] = useState<string>('');

  useEffect(() => {
    // Check speech synthesis support
    setSpeechSupported('speechSynthesis' in window);
    
    // Check microphone support
    setMicSupported('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices);
    
    // Load voices
    loadVoices();
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }
    
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, []);

  const loadVoices = () => {
    if ('speechSynthesis' in window) {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      console.log('🎤 Loaded voices:', availableVoices.length);
    }
  };

  const testBasicSpeech = () => {
    if (!speechSupported) {
      setTestStatus('❌ Speech synthesis not supported');
      return;
    }

    try {
      setTestStatus('🎤 Testing basic speech...');
      setLastError('');
      
      const utterance = new SpeechSynthesisUtterance('Hello! This is a basic speech test.');
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      
      utterance.onstart = () => {
        setTestStatus('✅ Basic speech working!');
      };
      
      utterance.onend = () => {
        setTestStatus('✅ Basic speech completed successfully');
      };
      
      utterance.onerror = (event) => {
        setTestStatus('❌ Basic speech failed');
        setLastError(`Error: ${event.error}`);
      };
      
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      setTestStatus('❌ Speech test failed');
      setLastError(`Exception: ${error}`);
    }
  };

  const testLISAVoice = () => {
    if (!speechSupported) {
      setTestStatus('❌ Speech synthesis not supported');
      return;
    }

    try {
      setTestStatus('🎤 Testing LISA voice...');
      setLastError('');
      
      const utterance = new SpeechSynthesisUtterance('Hello! I am LISA, your Language Intelligence Support Assistant. I am ready to help you with your glass manufacturing orders.');
      
      // Select best voice for LISA
      if (voices.length > 0) {
        const preferredVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.toLowerCase().includes('female') || 
           voice.name.toLowerCase().includes('samantha') ||
           voice.name.toLowerCase().includes('karen') ||
           voice.name.toLowerCase().includes('moira'))
        ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        
        utterance.voice = preferredVoice;
        console.log('🎤 LISA using voice:', preferredVoice.name);
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      
      utterance.onstart = () => {
        setTestStatus('✅ LISA voice working!');
      };
      
      utterance.onend = () => {
        setTestStatus('✅ LISA voice test completed successfully');
      };
      
      utterance.onerror = (event) => {
        setTestStatus('❌ LISA voice failed');
        setLastError(`Error: ${event.error}`);
      };
      
      // Ensure no other speech is playing
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      setTestStatus('❌ LISA voice test failed');
      setLastError(`Exception: ${error}`);
    }
  };

  const testMicrophone = async () => {
    if (!micSupported) {
      setTestStatus('❌ Microphone not supported');
      return;
    }

    try {
      setTestStatus('🎤 Testing microphone...');
      setLastError('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setTestStatus('✅ Microphone access granted');
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      setTestStatus('❌ Microphone access failed');
      setLastError(`Error: ${error}`);
    }
  };

  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const isHTTPS = window.location.protocol === 'https:';
  const browser = getBrowserInfo();

  return (
    <Paper sx={{ p: 2, m: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <VolumeUpIcon />
        LISA Voice Debug Panel
      </Typography>
      
      {/* Browser Info */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Browser Information
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Chip label={`Browser: ${browser}`} size="small" />
          <Chip 
            label={`Protocol: ${window.location.protocol}`} 
            size="small" 
            color={isHTTPS ? 'success' : 'warning'}
          />
          <Chip 
            label={`Voices: ${voices.length}`} 
            size="small" 
            color={voices.length > 0 ? 'success' : 'error'}
          />
        </Box>
      </Box>

      {/* Warnings */}
      {!isHTTPS && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            ⚠️ You're using HTTP. Some browsers require HTTPS for speech synthesis to work properly.
          </Typography>
        </Alert>
      )}

      {browser === 'Safari' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            ℹ️ Safari may require user interaction before speech synthesis works.
          </Typography>
        </Alert>
      )}

      {/* Feature Support */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Feature Support
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Chip 
            label={`Speech Synthesis: ${speechSupported ? '✅' : '❌'}`} 
            size="small" 
            color={speechSupported ? 'success' : 'error'}
          />
          <Chip 
            label={`Microphone: ${micSupported ? '✅' : '❌'}`} 
            size="small" 
            color={micSupported ? 'success' : 'error'}
          />
          <Chip 
            label={`WebRTC: ${'RTCPeerConnection' in window ? '✅' : '❌'}`} 
            size="small" 
            color={'RTCPeerConnection' in window ? 'success' : 'error'}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Test Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          onClick={testBasicSpeech}
          startIcon={<VolumeUpIcon />}
          disabled={!speechSupported}
        >
          Test Basic Speech
        </Button>
        
        <Button 
          variant="contained" 
          color="secondary"
          onClick={testLISAVoice}
          startIcon={<VolumeUpIcon />}
          disabled={!speechSupported}
        >
          Test LISA Voice
        </Button>
        
        <Button 
          variant="outlined"
          onClick={testMicrophone}
          startIcon={<MicIcon />}
          disabled={!micSupported}
        >
          Test Microphone
        </Button>
        
        <Button 
          variant="outlined"
          onClick={() => window.speechSynthesis.cancel()}
        >
          Stop Speech
        </Button>
      </Box>

      {/* Status Display */}
      {testStatus && (
        <Alert 
          severity={testStatus.includes('❌') ? 'error' : testStatus.includes('✅') ? 'success' : 'info'}
          sx={{ mb: 1 }}
        >
          {testStatus}
        </Alert>
      )}

      {lastError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          <Typography variant="body2">
            <strong>Error Details:</strong> {lastError}
          </Typography>
        </Alert>
      )}

      {/* Available Voices */}
      {voices.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Available Voices ({voices.length})
          </Typography>
          <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1, p: 1 }}>
            {voices.slice(0, 10).map((voice, index) => (
              <Typography key={index} variant="caption" display="block">
                {voice.name} ({voice.lang}) {voice.default ? '[Default]' : ''}
              </Typography>
            ))}
            {voices.length > 10 && (
              <Typography variant="caption" color="text.secondary">
                ... and {voices.length - 10} more voices
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Troubleshooting Tips */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          🔧 Troubleshooting Tips
        </Typography>
        <Typography variant="caption" display="block">
          • Make sure your browser audio is not muted
        </Typography>
        <Typography variant="caption" display="block">
          • Try clicking "Test Basic Speech" first to trigger user interaction
        </Typography>
        <Typography variant="caption" display="block">
          • Check browser console for additional error messages
        </Typography>
        <Typography variant="caption" display="block">
          • Some browsers require HTTPS for full speech synthesis features
        </Typography>
      </Box>
    </Paper>
  );
};

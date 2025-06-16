import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  IconButton
} from '@mui/material';
import {
  VolumeUp,
  VolumeOff,
  Mic,
  Warning,
  CheckCircle,
  Settings
} from '@mui/icons-material';
import { audioService, AudioPermissionStatus } from '../services/AudioService';

interface AudioPermissionManagerProps {
  open: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
  autoRequest?: boolean;
}

export const AudioPermissionManager: React.FC<AudioPermissionManagerProps> = ({
  open,
  onClose,
  onPermissionGranted,
  autoRequest = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<AudioPermissionStatus | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [testingAudio, setTestingAudio] = useState(false);

  useEffect(() => {
    if (open) {
      checkPermissions();
      if (autoRequest) {
        handleRequestPermissions();
      }
    }
  }, [open, autoRequest]);

  const checkPermissions = async () => {
    try {
      const status = await audioService.checkPermissions();
      setPermissionStatus(status);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Permission check failed: ${errorMessage}`);
    }
  };

  const handleRequestPermissions = async () => {
    setLoading(true);
    setError(null);

    try {
      const granted = await audioService.requestPermissions();
      
      if (granted) {
        await checkPermissions();
        onPermissionGranted();
        onClose();
      } else {
        setError('Audio permissions could not be granted. Please check your browser settings.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Permission request failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAudio = async () => {
    setTestingAudio(true);
    setError(null);

    try {
      await audioService.speak('Hello! This is LISA testing audio output. Can you hear me?', {
        rate: 0.9,
        pitch: 1.0,
        volume: 0.8
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Audio test failed: ${errorMessage}`);
    } finally {
      setTestingAudio(false);
    }
  };

  const getStatusColor = (granted: boolean) => {
    return granted ? 'success' : 'error';
  };

  const getStatusIcon = (granted: boolean) => {
    return granted ? <CheckCircle /> : <Warning />;
  };

  const renderPermissionStatus = () => {
    if (!permissionStatus) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Audio System Status
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Chip
            icon={getStatusIcon(permissionStatus.speechSynthesisAvailable)}
            label={`Speech Synthesis: ${permissionStatus.speechSynthesisAvailable ? 'Available' : 'Not Available'}`}
            color={getStatusColor(permissionStatus.speechSynthesisAvailable)}
            variant="outlined"
          />
          
          <Chip
            icon={getStatusIcon(!permissionStatus.userInteractionRequired)}
            label={`User Interaction: ${permissionStatus.userInteractionRequired ? 'Required' : 'Completed'}`}
            color={getStatusColor(!permissionStatus.userInteractionRequired)}
            variant="outlined"
          />
          
          <Chip
            icon={getStatusIcon(permissionStatus.audioContextState === 'running')}
            label={`Audio Context: ${permissionStatus.audioContextState}`}
            color={getStatusColor(permissionStatus.audioContextState === 'running')}
            variant="outlined"
          />
          
          <Chip
            icon={getStatusIcon(permissionStatus.granted)}
            label={`Overall Status: ${permissionStatus.granted ? 'Ready' : 'Not Ready'}`}
            color={getStatusColor(permissionStatus.granted)}
            variant="outlined"
          />
        </Box>
      </Box>
    );
  };

  const renderDebugInfo = () => {
    const debugInfo = audioService.getDebugInfo();
    
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Debug Information
        </Typography>
        <pre style={{ fontSize: '12px', margin: 0 }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <VolumeUp color="primary" />
        Enable LISA Voice Output
        <Box sx={{ flexGrow: 1 }} />
        <IconButton 
          size="small" 
          onClick={() => setDebugMode(!debugMode)}
          title="Toggle Debug Mode"
        >
          <Settings />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" paragraph>
          LISA needs permission to speak responses aloud. This requires a one-time setup 
          due to Chrome's audio policy.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {permissionStatus && !permissionStatus.speechSynthesisAvailable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Your browser doesn't support text-to-speech. LISA will work silently.
          </Alert>
        )}

        {permissionStatus && permissionStatus.userInteractionRequired && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Click "Enable Audio" below to activate LISA's voice capabilities.
          </Alert>
        )}

        {renderPermissionStatus()}

        {debugMode && renderDebugInfo()}

        <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={testingAudio ? <CircularProgress size={16} /> : <VolumeUp />}
            onClick={handleTestAudio}
            disabled={loading || testingAudio || !permissionStatus?.granted}
          >
            {testingAudio ? 'Testing...' : 'Test Audio'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<VolumeOff />}
            onClick={audioService.stopSpeaking}
            disabled={loading}
          >
            Stop Audio
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Skip Audio
        </Button>
        
        <Button
          variant="contained"
          onClick={handleRequestPermissions}
          disabled={loading || (permissionStatus?.granted ?? false)}
          startIcon={loading ? <CircularProgress size={16} /> : <Mic />}
        >
          {loading ? 'Enabling...' : 'Enable Audio'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

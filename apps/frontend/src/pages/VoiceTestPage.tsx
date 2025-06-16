import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip, Button } from '@mui/material';
import { io, Socket } from 'socket.io-client';

const VoiceTestPage = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp} - ${message}`;
    setLogs(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  const connectWebSocket = () => {
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';
    addLog(`Attempting to connect to: ${wsUrl}`);
    setConnectionStatus('connecting');

    const newSocket = io(wsUrl, {
      timeout: 10000,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      addLog(`✅ Connected! Socket ID: ${newSocket.id}`);
      setConnectionStatus('connected');
    });

    newSocket.on('connected', (data) => {
      addLog(`🎉 LISA connected: ${data.agent}`);
      addLog(`Session: ${data.sessionId}`);
      setLastMessage(data.message);
    });

    newSocket.on('connect_error', (error) => {
      addLog(`❌ Connection error: ${error.message}`);
      setConnectionStatus('error');
    });

    newSocket.on('disconnect', (reason) => {
      addLog(`🔌 Disconnected: ${reason}`);
      setConnectionStatus('disconnected');
    });

    setSocket(newSocket);
  };

  const disconnectWebSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      addLog('🔌 Manually disconnected');
    }
  };

  const sendTestMessage = () => {
    if (socket && socket.connected) {
      socket.emit('voice-command', { 
        transcript: 'test message', 
        final: true 
      });
      addLog('📤 Sent test voice command');
    }
  };

  useEffect(() => {
    addLog('🚀 Voice Test Page loaded');
    addLog(`Environment: ${import.meta.env.MODE}`);
    addLog(`Voice Enabled: ${import.meta.env.VITE_ENABLE_VOICE}`);
    addLog(`API URL: ${import.meta.env.VITE_API_URL}`);
    addLog(`WebSocket URL: ${import.meta.env.VITE_WEBSOCKET_URL}`);

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🎤 LISA Voice WebSocket Test
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">Connection Status:</Typography>
          <Chip 
            label={connectionStatus} 
            color={getStatusColor()}
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={connectWebSocket}
            disabled={connectionStatus === 'connected'}
          >
            Connect
          </Button>
          <Button 
            variant="outlined" 
            onClick={disconnectWebSocket}
            disabled={connectionStatus !== 'connected'}
          >
            Disconnect
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={sendTestMessage}
            disabled={connectionStatus !== 'connected'}
          >
            Send Test Message
          </Button>
        </Box>

        {lastMessage && (
          <Typography variant="body2" sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            <strong>Last LISA Message:</strong> {lastMessage}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>Connection Logs:</Typography>
        {logs.map((log, index) => (
          <Typography 
            key={index} 
            variant="body2" 
            sx={{ fontFamily: 'monospace', fontSize: '0.8rem', mb: 0.5 }}
          >
            {log}
          </Typography>
        ))}
      </Paper>
    </Box>
  );
};

export default VoiceTestPage;

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { VoiceService } from './voice.service';
import { AIProvidersService } from './ai-providers.service';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173', 
      'https://localhost:5173',
      'https://order-over-view-frontend.vercel.app',
      'https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app',
      /https:\/\/order-over-view-frontend.*\.vercel\.app$/,
      /https:\/\/.*\.vercel\.app$/,
      process.env.CLIENT_URL
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, { 
    connectTime: number, 
    lastActivity: number,
    ipAddress?: string,
    userAgent?: string,
    clientId?: string,
    timestamp?: number,
    isAISpeaking?: boolean,
    isUserSpeaking?: boolean,
    lastSpeechTime?: number,
    deepgramConnection?: any,
  }>();
  private clientsByIP = new Map<string, Set<string>>(); // Track multiple connections from same IP

  constructor(
    private voiceService: VoiceService,
    private aiProvidersService: AIProvidersService,
  ) {}

  handleConnection(client: Socket) {
    const connectTime = Date.now();
    const ipAddress = client.handshake.address;
    const userAgent = client.handshake.headers['user-agent'];
    const clientId = client.handshake.auth?.clientId || 'unknown';
    const timestamp = client.handshake.auth?.timestamp || Date.now();
    
    console.log(`🔌 LISA client connecting: ${client.id} (clientId: ${clientId}) from ${ipAddress}`);
    
    // Track connections by IP for potential deduplication
    if (!this.clientsByIP.has(ipAddress)) {
      this.clientsByIP.set(ipAddress, new Set());
    }
    this.clientsByIP.get(ipAddress)!.add(client.id);
    
    this.connectedClients.set(client.id, { 
      connectTime, 
      lastActivity: connectTime,
      ipAddress,
      userAgent,
      clientId,
      timestamp,
      isAISpeaking: false,
      isUserSpeaking: false,
      lastSpeechTime: connectTime
    });
    
    // Check for multiple connections from same IP (potential duplicate connections)
    const ipConnections = this.clientsByIP.get(ipAddress)!;
    if (ipConnections.size > 1) {
      console.log(`⚠️  Multiple LISA connections from IP ${ipAddress}: ${ipConnections.size} connections`);
      
      // More aggressive cleanup: disconnect older connections from same IP
      if (ipConnections.size > 2) { // Allow max 2 connections per IP (reduced from 3)
        const connectionList = Array.from(ipConnections);
        const oldestConnection = connectionList[0];
        console.log(`🔌 Disconnecting oldest LISA connection ${oldestConnection} to prevent connection overload`);
        this.server.to(oldestConnection).emit('connection_replaced', {
          reason: 'Multiple LISA connections detected, keeping the newest one'
        });
        this.server.sockets.sockets.get(oldestConnection)?.disconnect(true);
      }
    }
    
    console.log(`LISA client connected: ${client.id} from ${ipAddress} (Total: ${this.connectedClients.size})`);
    
    client.emit('connected', { 
      sessionId: client.id, 
      agent: 'LISA',
      message: 'Hi! This is LISA, your glass order assistant. How can I help you today?'
    });
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    const duration = clientInfo ? Date.now() - clientInfo.connectTime : 0;
    
    // Clean up Deepgram connection if exists
    if (clientInfo?.deepgramConnection) {
      try {
        console.log(`🧹 Cleaning up Deepgram connection for client ${client.id}`);
        clientInfo.deepgramConnection.finish();
      } catch (error) {
        console.error(`❌ Error cleaning up Deepgram connection:`, error);
      }
    }
    
    // Remove from IP tracking
    if (clientInfo?.ipAddress) {
      const ipConnections = this.clientsByIP.get(clientInfo.ipAddress);
      if (ipConnections) {
        ipConnections.delete(client.id);
        if (ipConnections.size === 0) {
          this.clientsByIP.delete(clientInfo.ipAddress);
        }
      }
    }
    
    console.log(`LISA client disconnected: ${client.id} (Duration: ${Math.round(duration / 1000)}s, Remaining: ${this.connectedClients.size - 1})`);
    
    this.connectedClients.delete(client.id);
    this.voiceService.clearSession(client.id);
  }

  @SubscribeMessage('voice-command')
  async handleVoiceCommand(
    @MessageBody() data: { 
      transcript: string;
      isEndOfSpeech?: boolean;
      interimResults?: boolean;
      useNaturalConversation?: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Update client activity
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.lastActivity = Date.now();
      clientInfo.lastSpeechTime = Date.now();
    }

    // Check if LISA is currently speaking - prevent feedback loop
    if (clientInfo?.isAISpeaking) {
      console.log(`🚫 LISA: Ignoring voice command while AI is speaking (client: ${client.id})`);
      return;
    }

    // Mark user as speaking
    if (clientInfo) {
      clientInfo.isUserSpeaking = true;
    }

    console.log(`🎤 LISA: Processing voice command from ${client.id}: "${data.transcript.substring(0, 50)}${data.transcript.length > 50 ? '...' : ''}"`);

    const result = await this.voiceService.processVoiceCommand(
      data.transcript,
      client.id,
      {
        isEndOfSpeech: data.isEndOfSpeech,
        interimResults: data.interimResults,
        useNaturalConversation: data.useNaturalConversation,
      }
    );

    // Mark user as done speaking after processing
    if (clientInfo && data.isEndOfSpeech) {
      clientInfo.isUserSpeaking = false;
    }

    // Mark AI as speaking if response should be spoken
    if (result.shouldSpeak && clientInfo) {
      clientInfo.isAISpeaking = true;
      console.log(`🎙️ LISA: Starting to speak to client ${client.id}`);
    }

    client.emit('voice-response', result);
  }

  @SubscribeMessage('voice-interruption')
  async handleVoiceInterruption(
    @ConnectedSocket() client: Socket,
  ) {
    // Handle user interrupting AI speech
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.isAISpeaking = false;
      clientInfo.isUserSpeaking = true;
      clientInfo.lastActivity = Date.now();
      console.log(`✋ LISA: Voice interruption from client ${client.id}`);
    }

    const result = await this.voiceService.naturalConversationService?.handleInterruption(client.id);
    if (result) {
      client.emit('voice-response', result);
    }
  }

  @SubscribeMessage('voice-status')
  async handleVoiceStatus(
    @MessageBody() data: { status: 'speaking' | 'listening' | 'idle' },
    @ConnectedSocket() client: Socket,
  ) {
    // Update client activity
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.lastActivity = Date.now();
      
      // Update speaking state based on status
      if (data.status === 'speaking') {
        clientInfo.isAISpeaking = true;
        console.log(`🎙️ LISA: Client ${client.id} started speaking`);
      } else if (data.status === 'idle') {
        clientInfo.isAISpeaking = false;
        clientInfo.isUserSpeaking = false;
        console.log(`💤 LISA: Client ${client.id} went idle`);
      } else if (data.status === 'listening') {
        clientInfo.isAISpeaking = false;
        clientInfo.isUserSpeaking = false;
        console.log(`👂 LISA: Client ${client.id} started listening`);
      }
    }
    
    // Update conversation state based on voice activity
    console.log(`📊 LISA: Client ${client.id} voice status: ${data.status}`);
  }

  @SubscribeMessage('speech-ended')
  async handleSpeechEnded(
    @ConnectedSocket() client: Socket,
  ) {
    // Handle when AI speech has finished
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.isAISpeaking = false;
      clientInfo.lastActivity = Date.now();
      console.log(`🔚 LISA: Speech ended for client ${client.id}`);
    }
  }

  @SubscribeMessage('ping')
  async handlePing(
    @ConnectedSocket() client: Socket,
  ) {
    // Update client activity on ping
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.lastActivity = Date.now();
    }
    
    client.emit('pong');
  }

  @SubscribeMessage('start-conversation')
  async handleStartConversation(
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Client ${client.id} started conversation mode`);
    // Could initialize conversation state or send welcome message
    client.emit('voice-response', {
      response: "Great! I'm listening continuously now. ",
      shouldSpeak: process.env.AI_RESPONSE_STYLE !== 'text_only',
      action: 'conversation_started'
    });
  }

  @SubscribeMessage('end-conversation')
  async handleEndConversation(
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Client ${client.id} ended conversation mode`);
    // Clear any conversation state
    this.voiceService.naturalConversationService?.clearSession(client.id);
    client.emit('voice-response', {
      response: "Thanks for chatting with me! Feel free to start a new conversation anytime.",
      shouldSpeak: process.env.AI_RESPONSE_STYLE !== 'text_only',
      action: 'conversation_ended'
    });
  }

  // Health monitoring and cleanup methods
  @SubscribeMessage('health-check')
  async handleHealthCheck(
    @ConnectedSocket() client: Socket,
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.lastActivity = Date.now();
    }
    
    client.emit('health-response', {
      status: 'healthy',
      timestamp: Date.now(),
      sessionId: client.id
    });
  }

  // Periodic cleanup of stale connections
  private startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      const staleThreshold = 3 * 60 * 1000; // Reduced to 3 minutes for more aggressive cleanup
      
      this.connectedClients.forEach((clientInfo, clientId) => {
        if (now - clientInfo.lastActivity > staleThreshold) {
          console.log(`🧹 Cleaning up stale LISA connection: ${clientId} (inactive for ${Math.round((now - clientInfo.lastActivity) / 1000)}s)`);
          const socket = this.server.sockets.sockets.get(clientId);
          if (socket) {
            socket.emit('connection_timeout', { reason: 'Inactive for too long' });
            socket.disconnect(true);
          }
          this.connectedClients.delete(clientId);
          
          // Also clean up IP tracking
          if (clientInfo.ipAddress) {
            const ipConnections = this.clientsByIP.get(clientInfo.ipAddress);
            if (ipConnections) {
              ipConnections.delete(clientId);
              if (ipConnections.size === 0) {
                this.clientsByIP.delete(clientInfo.ipAddress);
              }
            }
          }
        }
      });
      
      // Log current connection status every 5 minutes
      if (now % (5 * 60 * 1000) < 60000) {
        console.log(`📊 LISA Connection Status: ${this.connectedClients.size} active connections across ${this.clientsByIP.size} IPs`);
      }
    }, 30000); // Check every 30 seconds for more frequent cleanup
  }

  // Get connection statistics
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      connectionsByIP: {},
      averageSessionDuration: 0,
      activeConnections: 0
    };

    const now = Date.now();
    let totalDuration = 0;
    let activeCount = 0;

    this.connectedClients.forEach((clientInfo, clientId) => {
      const duration = now - clientInfo.connectTime;
      const isActive = now - clientInfo.lastActivity < 60000; // Active in last minute
      
      totalDuration += duration;
      if (isActive) activeCount++;

      const ip = clientInfo.ipAddress || 'unknown';
      stats.connectionsByIP[ip] = (stats.connectionsByIP[ip] || 0) + 1;
    });

    stats.averageSessionDuration = this.connectedClients.size > 0 ? totalDuration / this.connectedClients.size : 0;
    stats.activeConnections = activeCount;

    return stats;
  }

  // Initialize cleanup on gateway start
  onModuleInit() {
    this.startCleanupInterval();
    console.log('🔧 LISA Voice Gateway initialized with connection monitoring');
  }

  @SubscribeMessage('start-streaming')
  async handleStartStreaming(
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`🎤 Client ${client.id} starting real-time streaming...`);
    
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.lastActivity = Date.now();
      
      try {
        // Create Deepgram streaming connection
        const deepgramConnection = this.aiProvidersService.createDeepgramStreamingConnection((data) => {
          // Handle streaming transcription data
          if (data.type === 'transcription') {
            console.log(`🎤 Streaming transcript: "${data.transcript}" (Final: ${data.isFinal})`);
            
            client.emit('streaming-transcript', {
              transcript: data.transcript,
              isFinal: data.isFinal,
              confidence: data.confidence,
              provider: data.provider
            });
            
            // If final transcript, also process it
            if (data.isFinal && data.transcript.trim()) {
              this.processStreamingTranscript(client, data.transcript, data.confidence);
            }
          } else if (data.type === 'connection') {
            client.emit('streaming-status', { status: data.status });
          } else if (data.type === 'error') {
            client.emit('streaming-error', { error: data.error });
          }
        });
        
        // Store the connection for cleanup
        clientInfo.deepgramConnection = deepgramConnection;
        
        console.log(`✅ Deepgram streaming started for client ${client.id}`);
        
      } catch (error) {
        console.error(`❌ Failed to start streaming for client ${client.id}:`, error);
        client.emit('streaming-error', { error: error.message });
      }
    }
  }

  @SubscribeMessage('streaming-audio')
  async handleStreamingAudio(
    @MessageBody() data: { audio: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo && clientInfo.deepgramConnection) {
      try {
        // Convert base64 back to buffer and send to Deepgram
        const audioBuffer = Buffer.from(data.audio, 'base64');
        clientInfo.deepgramConnection.send(audioBuffer);
        clientInfo.lastActivity = Date.now();
      } catch (error) {
        console.error(`❌ Streaming audio error for client ${client.id}:`, error);
        client.emit('streaming-error', { error: 'Audio streaming failed' });
      }
    }
  }

  @SubscribeMessage('stop-streaming')
  async handleStopStreaming(
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`🛑 Client ${client.id} stopping streaming...`);
    
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo && clientInfo.deepgramConnection) {
      try {
        clientInfo.deepgramConnection.finish();
        clientInfo.deepgramConnection = null;
        console.log(`✅ Streaming stopped for client ${client.id}`);
        client.emit('streaming-status', { status: 'disconnected' });
      } catch (error) {
        console.error(`❌ Error stopping streaming for client ${client.id}:`, error);
      }
    }
  }

  private async processStreamingTranscript(client: Socket, transcript: string, confidence: number) {
    try {
      console.log(`🎯 Processing streaming transcript: "${transcript}"`);
      
      // Process the transcript using the voice service
      const result = await this.voiceService.processVoiceCommand(
        transcript,
        client.id,
        {
          isEndOfSpeech: true,
          interimResults: false,
          useNaturalConversation: true,
        }
      );

      // Send the response back to the client
      client.emit('voice-response', result);
      
    } catch (error) {
      console.error(`❌ Error processing streaming transcript:`, error);
      client.emit('streaming-error', { error: 'Failed to process transcript' });
    }
  }
}

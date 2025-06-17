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
    userAgent?: string
  }>();
  private clientsByIP = new Map<string, Set<string>>(); // Track multiple connections from same IP

  constructor(private voiceService: VoiceService) {}

  handleConnection(client: Socket) {
    const connectTime = Date.now();
    const ipAddress = client.handshake.address;
    const userAgent = client.handshake.headers['user-agent'];
    
    // Track connections by IP for potential deduplication
    if (!this.clientsByIP.has(ipAddress)) {
      this.clientsByIP.set(ipAddress, new Set());
    }
    this.clientsByIP.get(ipAddress)!.add(client.id);
    
    this.connectedClients.set(client.id, { 
      connectTime, 
      lastActivity: connectTime,
      ipAddress,
      userAgent
    });
    
    // Check for multiple connections from same IP (potential duplicate connections)
    const ipConnections = this.clientsByIP.get(ipAddress)!;
    if (ipConnections.size > 1) {
      console.log(`⚠️  Multiple LISA connections from IP ${ipAddress}: ${ipConnections.size} connections`);
      
      // Optionally disconnect older connections from same IP
      if (ipConnections.size > 3) { // Allow max 3 connections per IP
        const oldestConnection = Array.from(ipConnections)[0];
        console.log(`🔌 Disconnecting oldest connection ${oldestConnection} to prevent connection overload`);
        this.server.to(oldestConnection).emit('connection_replaced', {
          reason: 'Multiple connections detected, keeping the newest one'
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
    }

    const result = await this.voiceService.processVoiceCommand(
      data.transcript,
      client.id,
      {
        isEndOfSpeech: data.isEndOfSpeech,
        interimResults: data.interimResults,
        useNaturalConversation: data.useNaturalConversation,
      }
    );

    client.emit('voice-response', result);
  }

  @SubscribeMessage('voice-interruption')
  async handleVoiceInterruption(
    @ConnectedSocket() client: Socket,
  ) {
    // Handle user interrupting AI speech
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
    }
    
    // Update conversation state based on voice activity
    console.log(`Client ${client.id} voice status: ${data.status}`);
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
      response: "Great! I'm listening continuously now. Just talk to me naturally, and say 'stop' or 'finish' when you're done.",
      shouldSpeak: true,
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
      shouldSpeak: true,
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
      const staleThreshold = 5 * 60 * 1000; // 5 minutes
      
      this.connectedClients.forEach((clientInfo, clientId) => {
        if (now - clientInfo.lastActivity > staleThreshold) {
          console.log(`🧹 Cleaning up stale connection: ${clientId}`);
          const socket = this.server.sockets.sockets.get(clientId);
          if (socket) {
            socket.emit('connection_timeout', { reason: 'Inactive for too long' });
            socket.disconnect(true);
          }
          this.connectedClients.delete(clientId);
        }
      });
    }, 60000); // Check every minute
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
}

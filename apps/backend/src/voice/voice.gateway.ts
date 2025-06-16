import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { VoiceService } from './voice.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, { connectTime: number, lastActivity: number }>();

  constructor(private voiceService: VoiceService) {}

  handleConnection(client: Socket) {
    const connectTime = Date.now();
    this.connectedClients.set(client.id, { 
      connectTime, 
      lastActivity: connectTime 
    });
    
    console.log(`LISA client connected: ${client.id} (Total: ${this.connectedClients.size})`);
    
    client.emit('connected', { 
      sessionId: client.id, 
      agent: 'LISA',
      message: 'Hi! This is LISA, your glass order assistant. How can I help you today?'
    });
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    const duration = clientInfo ? Date.now() - clientInfo.connectTime : 0;
    
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
}

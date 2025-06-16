import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { VoiceService } from './voice.service';
export declare class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private voiceService;
    server: Server;
    private connectedClients;
    constructor(voiceService: VoiceService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleVoiceCommand(data: {
        transcript: string;
        isEndOfSpeech?: boolean;
        interimResults?: boolean;
        useNaturalConversation?: boolean;
    }, client: Socket): Promise<void>;
    handleVoiceInterruption(client: Socket): Promise<void>;
    handleVoiceStatus(data: {
        status: 'speaking' | 'listening' | 'idle';
    }, client: Socket): Promise<void>;
    handlePing(client: Socket): Promise<void>;
    handleStartConversation(client: Socket): Promise<void>;
    handleEndConversation(client: Socket): Promise<void>;
}

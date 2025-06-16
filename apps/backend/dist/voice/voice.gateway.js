"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const voice_service_1 = require("./voice.service");
let VoiceGateway = class VoiceGateway {
    constructor(voiceService) {
        this.voiceService = voiceService;
        this.connectedClients = new Map();
    }
    handleConnection(client) {
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
    handleDisconnect(client) {
        const clientInfo = this.connectedClients.get(client.id);
        const duration = clientInfo ? Date.now() - clientInfo.connectTime : 0;
        console.log(`LISA client disconnected: ${client.id} (Duration: ${Math.round(duration / 1000)}s, Remaining: ${this.connectedClients.size - 1})`);
        this.connectedClients.delete(client.id);
        this.voiceService.clearSession(client.id);
    }
    async handleVoiceCommand(data, client) {
        const clientInfo = this.connectedClients.get(client.id);
        if (clientInfo) {
            clientInfo.lastActivity = Date.now();
        }
        const result = await this.voiceService.processVoiceCommand(data.transcript, client.id, {
            isEndOfSpeech: data.isEndOfSpeech,
            interimResults: data.interimResults,
            useNaturalConversation: data.useNaturalConversation,
        });
        client.emit('voice-response', result);
    }
    async handleVoiceInterruption(client) {
        const result = await this.voiceService.naturalConversationService?.handleInterruption(client.id);
        if (result) {
            client.emit('voice-response', result);
        }
    }
    async handleVoiceStatus(data, client) {
        const clientInfo = this.connectedClients.get(client.id);
        if (clientInfo) {
            clientInfo.lastActivity = Date.now();
        }
        console.log(`Client ${client.id} voice status: ${data.status}`);
    }
    async handlePing(client) {
        const clientInfo = this.connectedClients.get(client.id);
        if (clientInfo) {
            clientInfo.lastActivity = Date.now();
        }
        client.emit('pong');
    }
    async handleStartConversation(client) {
        console.log(`Client ${client.id} started conversation mode`);
        client.emit('voice-response', {
            response: "Great! I'm listening continuously now. Just talk to me naturally, and say 'stop' or 'finish' when you're done.",
            shouldSpeak: true,
            action: 'conversation_started'
        });
    }
    async handleEndConversation(client) {
        console.log(`Client ${client.id} ended conversation mode`);
        this.voiceService.naturalConversationService?.clearSession(client.id);
        client.emit('voice-response', {
            response: "Thanks for chatting with me! Feel free to start a new conversation anytime.",
            shouldSpeak: true,
            action: 'conversation_ended'
        });
    }
};
exports.VoiceGateway = VoiceGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], VoiceGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice-command'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], VoiceGateway.prototype, "handleVoiceCommand", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice-interruption'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], VoiceGateway.prototype, "handleVoiceInterruption", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice-status'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], VoiceGateway.prototype, "handleVoiceStatus", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], VoiceGateway.prototype, "handlePing", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('start-conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], VoiceGateway.prototype, "handleStartConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('end-conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], VoiceGateway.prototype, "handleEndConversation", null);
exports.VoiceGateway = VoiceGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    }),
    __metadata("design:paramtypes", [voice_service_1.VoiceService])
], VoiceGateway);
//# sourceMappingURL=voice.gateway.js.map
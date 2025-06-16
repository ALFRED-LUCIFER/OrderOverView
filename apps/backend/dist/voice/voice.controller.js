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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceController = void 0;
const common_1 = require("@nestjs/common");
const voice_service_1 = require("./voice.service");
let VoiceController = class VoiceController {
    constructor(voiceService) {
        this.voiceService = voiceService;
    }
    healthCheck() {
        return {
            status: 'LISA voice service is running',
            agent: 'LISA',
            naturalConversation: 'enabled',
            model: 'llama-3.3-70b-versatile'
        };
    }
    async testVoiceCommands() {
        return { message: 'Voice test endpoint - natural conversation ready' };
    }
    getVoiceConfig() {
        return {
            agent: 'LISA',
            model: 'llama-3.3-70b-versatile',
            enableContinuousListening: process.env.ENABLE_CONTINUOUS_LISTENING === 'true',
            voiceActivityThreshold: parseFloat(process.env.VOICE_ACTIVITY_THRESHOLD || '0.3'),
            silenceTimeoutMs: parseInt(process.env.SILENCE_TIMEOUT_MS || '1500'),
            maxConversationLength: parseInt(process.env.MAX_CONVERSATION_LENGTH || '30'),
            aiResponseStyle: process.env.AI_RESPONSE_STYLE || 'conversational_telephonic',
            enableFillerWords: process.env.ENABLE_FILLER_WORDS === 'true',
            enableThinkingSounds: process.env.ENABLE_THINKING_SOUNDS === 'true',
        };
    }
};
exports.VoiceController = VoiceController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VoiceController.prototype, "healthCheck", null);
__decorate([
    (0, common_1.Get)('test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "testVoiceCommands", null);
__decorate([
    (0, common_1.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VoiceController.prototype, "getVoiceConfig", null);
exports.VoiceController = VoiceController = __decorate([
    (0, common_1.Controller)('voice'),
    __metadata("design:paramtypes", [voice_service_1.VoiceService])
], VoiceController);
//# sourceMappingURL=voice.controller.js.map
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
exports.VoiceTestService = void 0;
const common_1 = require("@nestjs/common");
const natural_conversation_service_1 = require("../voice/natural-conversation.service");
let VoiceTestService = class VoiceTestService {
    constructor(naturalConversationService) {
        this.naturalConversationService = naturalConversationService;
    }
    async testVoiceCommands() {
        const testCommands = [
            "Hello, I need help with glass orders",
            "Show me orders from this week",
            "Create a new order for tempered glass",
            "Generate PDF for order 123"
        ];
        console.log('🎤 Testing Natural Conversation Service...\n');
        for (const command of testCommands) {
            try {
                console.log(`User: "${command}"`);
                const response = await this.naturalConversationService.processNaturalSpeech(command, 'test-session', true, false);
                console.log(`Assistant: "${response.text}"`);
                if (response.action) {
                    console.log(`Action: ${response.action}`);
                }
                console.log(`Confidence: ${response.confidence}\n`);
            }
            catch (error) {
                console.error(`Error processing "${command}":`, error.message);
            }
        }
        const stats = this.naturalConversationService.getConversationStats('test-session');
        console.log('Conversation Stats:', stats);
    }
};
exports.VoiceTestService = VoiceTestService;
exports.VoiceTestService = VoiceTestService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [natural_conversation_service_1.NaturalConversationService])
], VoiceTestService);
//# sourceMappingURL=voice-test.service.js.map
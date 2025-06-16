"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceModule = void 0;
const common_1 = require("@nestjs/common");
const voice_controller_1 = require("./voice.controller");
const voice_service_1 = require("./voice.service");
const voice_gateway_1 = require("./voice.gateway");
const natural_conversation_service_1 = require("./natural-conversation.service");
const orders_module_1 = require("../orders/orders.module");
let VoiceModule = class VoiceModule {
};
exports.VoiceModule = VoiceModule;
exports.VoiceModule = VoiceModule = __decorate([
    (0, common_1.Module)({
        imports: [orders_module_1.OrdersModule],
        controllers: [voice_controller_1.VoiceController],
        providers: [voice_service_1.VoiceService, voice_gateway_1.VoiceGateway, natural_conversation_service_1.NaturalConversationService],
        exports: [voice_service_1.VoiceService, natural_conversation_service_1.NaturalConversationService],
    })
], VoiceModule);
//# sourceMappingURL=voice.module.js.map
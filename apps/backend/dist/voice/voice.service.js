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
exports.VoiceService = void 0;
const common_1 = require("@nestjs/common");
const groq_sdk_1 = require("groq-sdk");
const orders_service_1 = require("../orders/orders.service");
const natural_conversation_service_1 = require("./natural-conversation.service");
let VoiceService = class VoiceService {
    constructor(ordersService, naturalConversationService) {
        this.ordersService = ordersService;
        this.naturalConversationService = naturalConversationService;
        this.conversationHistory = new Map();
        this.groq = new groq_sdk_1.default({
            apiKey: process.env.GROQ_API_KEY,
        });
    }
    async processVoiceCommand(transcript, sessionId, options) {
        const { isEndOfSpeech = true, interimResults = false, useNaturalConversation = process.env.AI_RESPONSE_STYLE === 'conversational_telephonic' } = options || {};
        if (useNaturalConversation) {
            const naturalResponse = await this.naturalConversationService.processNaturalSpeech(transcript, sessionId, isEndOfSpeech, interimResults);
            return {
                response: naturalResponse.text,
                action: naturalResponse.action,
                data: naturalResponse.data,
                shouldSpeak: naturalResponse.shouldSpeak,
                fillerWord: naturalResponse.fillerWord,
                isThinking: naturalResponse.isThinking,
                confidence: naturalResponse.confidence,
            };
        }
        return await this.processVoiceCommandOriginal(transcript, sessionId);
    }
    async processVoiceCommandOriginal(transcript, sessionId) {
        const history = this.conversationHistory.get(sessionId) || [];
        const systemPrompt = `You are a helpful glass order management assistant. 
    You can help with:
    1. Creating new orders (ask for: glass type, quantity, dimensions, customer name)
    2. Searching existing orders (by customer, date, order ID)
    3. Generating PDF reports for orders
    
    Parse user intent and respond with:
    - Clear confirmation of what you're doing
    - Questions to gather missing information
    - Results of searches or actions
    
    Current context: ${JSON.stringify(history.slice(-5))}`;
        try {
            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...history,
                    { role: 'user', content: transcript },
                ],
                model: 'llama3-70b-8192',
                temperature: 0.7,
                max_tokens: 500,
            });
            const aiResponse = completion.choices[0]?.message?.content || '';
            history.push({ role: 'user', content: transcript }, { role: 'assistant', content: aiResponse });
            this.conversationHistory.set(sessionId, history);
            const action = await this.parseIntentAndExecute(transcript, aiResponse);
            return {
                response: aiResponse,
                ...action,
            };
        }
        catch (error) {
            console.error('Voice processing error:', error);
            return {
                response: 'I apologize, but I encountered an error processing your request. Please try again.',
            };
        }
    }
    async parseIntentAndExecute(transcript, aiResponse) {
        const lowerTranscript = transcript.toLowerCase();
        if (lowerTranscript.includes('search') || lowerTranscript.includes('find')) {
            const searchCriteria = this.extractSearchCriteria(transcript);
            const orders = await this.ordersService.findAll();
            const filteredOrders = this.filterOrders(orders, searchCriteria);
            return { action: 'ORDERS_FOUND', data: filteredOrders };
        }
        if (lowerTranscript.includes('pdf') || lowerTranscript.includes('report')) {
            const orderId = this.extractOrderId(transcript);
            if (orderId) {
                return { action: 'PDF_REQUESTED', data: { orderId, message: 'PDF generation requested' } };
            }
        }
        return {};
    }
    filterOrders(orders, criteria) {
        return orders.filter(order => {
            if (criteria.customerId && order.customerId !== criteria.customerId) {
                return false;
            }
            if (criteria.orderId && order.id !== criteria.orderId) {
                return false;
            }
            if (criteria.dateRange) {
                const orderDate = new Date(order.orderDate);
                const today = new Date();
                if (criteria.dateRange === 'today') {
                    return orderDate.toDateString() === today.toDateString();
                }
                if (criteria.dateRange === 'week') {
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return orderDate >= weekAgo;
                }
            }
            return true;
        });
    }
    extractSearchCriteria(text) {
        return {
            customerName: text.match(/customer\s+([A-Za-z\s]+)/i)?.[1],
            dateRange: text.includes('today') ? 'today' :
                text.includes('week') ? 'week' : null,
            orderId: text.match(/order\s+#?(\d+)/i)?.[1],
        };
    }
    extractOrderId(text) {
        const match = text.match(/order\s+#?(\d+)/i);
        return match ? match[1] : null;
    }
    clearSession(sessionId) {
        this.conversationHistory.delete(sessionId);
    }
};
exports.VoiceService = VoiceService;
exports.VoiceService = VoiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_service_1.OrdersService,
        natural_conversation_service_1.NaturalConversationService])
], VoiceService);
//# sourceMappingURL=voice.service.js.map
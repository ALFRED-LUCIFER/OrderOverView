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
exports.NaturalConversationService = void 0;
const common_1 = require("@nestjs/common");
const groq_sdk_1 = require("groq-sdk");
const orders_service_1 = require("../orders/orders.service");
let NaturalConversationService = class NaturalConversationService {
    constructor(ordersService) {
        this.ordersService = ordersService;
        this.conversations = new Map();
        this.groq = new groq_sdk_1.default({
            apiKey: process.env.GROQ_API_KEY,
        });
    }
    async processNaturalSpeech(transcript, sessionId, isEndOfSpeech = true, interimResults = false) {
        const state = this.getOrCreateState(sessionId);
        if (!isEndOfSpeech && interimResults) {
            return this.handleInterimSpeech(transcript, state);
        }
        if (!isEndOfSpeech) {
            return this.handleContinuousSpeech(state);
        }
        return await this.processCompleteUtterance(transcript, state, sessionId);
    }
    async processCompleteUtterance(transcript, state, sessionId) {
        state.lastSpeechTime = Date.now();
        state.isUserSpeaking = false;
        state.conversationContext.push(`Human: ${transcript}`);
        if (this.isConversationTooLong(state)) {
            return this.handleLongConversation(state);
        }
        const intent = await this.detectIntent(transcript, state.conversationContext);
        const response = await this.generateNaturalResponse(transcript, state.conversationContext, intent, sessionId);
        state.conversationContext.push(`Assistant: ${response.text}`);
        state.currentTopic = intent.topic;
        state.awaitingUserInput = intent.requiresUserInput;
        if (response.action) {
            const actionResult = await this.executeAction(response.action, intent.parameters, sessionId);
            if (actionResult) {
                response.data = actionResult;
            }
        }
        return response;
    }
    handleInterimSpeech(transcript, state) {
        state.isUserSpeaking = true;
        if (transcript.length > 50 && process.env.ENABLE_THINKING_SOUNDS === 'true') {
            const thinkingSounds = ["Mm-hmm...", "I see...", "Right...", "Uh-huh...", "LISA's listening...", "Go on..."];
            return {
                text: '',
                shouldSpeak: true,
                fillerWord: thinkingSounds[Math.floor(Math.random() * thinkingSounds.length)],
                isThinking: true,
                confidence: 0.5
            };
        }
        return { text: '', shouldSpeak: false, confidence: 0 };
    }
    handleContinuousSpeech(state) {
        const timeSinceLastSpeech = Date.now() - state.lastSpeechTime;
        if (timeSinceLastSpeech > parseInt(process.env.SILENCE_TIMEOUT_MS || '1500')
            && !state.isAISpeaking
            && process.env.ENABLE_FILLER_WORDS === 'true') {
            return {
                text: '',
                shouldSpeak: true,
                fillerWord: this.getContextualFillerWord(state),
                confidence: 0.3
            };
        }
        return { text: '', shouldSpeak: false, confidence: 0 };
    }
    async detectIntent(transcript, context) {
        const intentPrompt = `Analyze this user input for a glass order management system and extract intent:

User: "${transcript}"

Previous context:
${context.slice(-5).join('\n')}

Extract:
1. Primary intent (search_orders, create_order, generate_pdf, get_info, casual_conversation, complaint, end_conversation)
2. Topic (what specifically they're asking about)
3. Parameters (any specific values mentioned)
4. Emotion (neutral, frustrated, excited, confused)
5. Requires user input (true/false)

IMPORTANT: Detect "end_conversation" intent when user says phrases like:
- "stop", "end", "finish", "done", "quit", "exit"
- "goodbye", "bye", "see you later", "talk to you later"
- "that's all", "nothing else", "hang up"
- "thank you lisa, that's all" or similar closing phrases

Respond in JSON format only.`;
        try {
            const completion = await this.groq.chat.completions.create({
                messages: [{ role: 'user', content: intentPrompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.1,
                max_tokens: 200,
            });
            const result = completion.choices[0]?.message?.content || '{}';
            return JSON.parse(result);
        }
        catch (error) {
            return {
                intent: this.fallbackIntentDetection(transcript),
                topic: 'general',
                parameters: {},
                emotion: 'neutral',
                requiresUserInput: false
            };
        }
    }
    fallbackIntentDetection(transcript) {
        const lower = transcript.toLowerCase();
        if (lower.includes('order') && (lower.includes('create') || lower.includes('new')))
            return 'create_order';
        if (lower.includes('search') || lower.includes('find'))
            return 'search_orders';
        if (lower.includes('pdf') || lower.includes('report'))
            return 'generate_pdf';
        if (lower.includes('help') || lower.includes('how'))
            return 'get_info';
        if (lower.includes('stop') || lower.includes('end') || lower.includes('finish') ||
            lower.includes('goodbye') || lower.includes('bye') || lower.includes('done') ||
            lower.includes('quit') || lower.includes('exit') || lower.includes('hang up') ||
            lower.includes('that\'s all') || lower.includes('thank you lisa') && (lower.includes('stop') || lower.includes('done'))) {
            return 'end_conversation';
        }
        return 'casual_conversation';
    }
    async generateNaturalResponse(transcript, context, intent, sessionId) {
        const responseStyle = process.env.AI_RESPONSE_STYLE || 'conversational_telephonic';
        const systemPrompt = `You are LISA, a highly intelligent and naturally conversational AI assistant for a glass order management system. You speak like a skilled customer service representative in a friendly phone call.

LISA'S PERSONALITY:
- Professional yet warm and approachable
- Naturally conversational with perfect phone etiquette
- Efficient but never rushed
- Empathetic and understanding
- Expert in glass industry terminology
- Always introduces herself as "Hi, this is LISA" on first interaction

CRITICAL CONVERSATIONAL RULES:
1. Start responses with natural acknowledgments: "Oh I see", "Got it", "Alright", "Sure thing"
2. Use conversational contractions: I'm, you're, let's, we'll, that's
3. Include occasional natural hesitations: "um", "uh", "well", "you know"
4. Mirror the user's energy and emotion level
5. Ask follow-up questions conversationally
6. Keep responses under 50 words for natural flow

RESPONSE STYLE: ${responseStyle}
- Be warm and helpful like a skilled phone representative
- Use active listening cues
- Handle confusion gracefully
- Show genuine interest

USER INTENT: ${intent.intent}
USER EMOTION: ${intent.emotion}
TOPIC: ${intent.topic}

GLASS ORDER CAPABILITIES:
- Create orders (need: glass type, quantity, dimensions, customer)
- Search existing orders
- Generate PDF reports
- Answer questions about glass types
- End conversations when asked

CONVERSATION CONTEXT:
${context.slice(-8).join('\n')}

USER SAID: "${transcript}"

SPECIAL INSTRUCTION: If the user wants to end the conversation (saying goodbye, stop, finish, done, etc.), respond warmly and add [ACTION:end_conversation] at the end.

Respond naturally and conversationally as LISA. If taking action, add [ACTION:${intent.intent}] at the end.`;
        try {
            const completion = await this.groq.chat.completions.create({
                messages: [{ role: 'system', content: systemPrompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.8,
                max_tokens: 150,
                stream: false,
            });
            let responseText = completion.choices[0]?.message?.content ||
                "Sorry, I didn't quite catch that. Could you say that again?";
            const actionMatch = responseText.match(/\[ACTION:(\w+)\]/);
            let action = actionMatch ? actionMatch[1] : null;
            if (action === 'search_orders') {
                action = 'search_results';
            }
            else if (action === 'create_order') {
                action = 'order_created';
            }
            responseText = this.cleanupResponse(responseText);
            responseText = this.enhanceNaturalSpeech(responseText, intent.emotion);
            return {
                text: responseText,
                action,
                shouldSpeak: true,
                confidence: 0.9
            };
        }
        catch (error) {
            console.error('Error generating natural response:', error);
            return {
                text: this.getErrorResponse(intent.emotion),
                shouldSpeak: true,
                confidence: 0.5
            };
        }
    }
    enhanceNaturalSpeech(text, emotion) {
        switch (emotion) {
            case 'frustrated':
                return `I understand, and I'm here to help. ${text}`;
            case 'excited':
                return `That's great! ${text}`;
            case 'confused':
                return `No worries, let me clarify that. ${text}`;
            default:
                return text;
        }
    }
    cleanupResponse(text) {
        return text
            .replace(/\[ACTION:.*?\]/g, '')
            .replace(/\[.*?\]/g, '')
            .trim();
    }
    getContextualFillerWord(state) {
        const topic = state.currentTopic;
        if (topic === 'order_creation') {
            return ["Got it, so far we have...", "Okay, let me make sure...", "Right, and for the...", "Perfect, so LISA has..."][Math.floor(Math.random() * 4)];
        }
        if (topic === 'search') {
            return ["Let me check that for you...", "LISA's searching now...", "Looking that up...", "One moment while I find that..."][Math.floor(Math.random() * 4)];
        }
        const generalFillers = [
            "Mm-hmm...", "I see...", "Right...", "Okay...", "Sure...", "Uh-huh...", "LISA's thinking...", "Let me help with that..."
        ];
        return generalFillers[Math.floor(Math.random() * generalFillers.length)];
    }
    getErrorResponse(emotion) {
        if (emotion === 'frustrated') {
            return "I apologize for the confusion. Let me try to help you better.";
        }
        return "Sorry about that. Could you repeat what you need help with?";
    }
    async executeAction(action, parameters, sessionId) {
        try {
            switch (action) {
                case 'search_orders':
                    return await this.searchOrders(parameters);
                case 'create_order':
                    return await this.createOrder(parameters);
                case 'generate_pdf':
                    return await this.generatePdf(parameters);
                case 'end_conversation':
                    return await this.endConversation(sessionId);
                default:
                    return null;
            }
        }
        catch (error) {
            console.error(`Error executing action ${action}:`, error);
            return { error: 'Action failed' };
        }
    }
    async searchOrders(parameters) {
        try {
            if (this.ordersService) {
                console.log('🗣️  LISA: Searching orders via database...', parameters);
                const orders = await this.ordersService.findAll();
                const filteredOrders = orders.slice(0, 10);
                const totalCost = filteredOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
                console.log('✅ LISA: Orders found in database!', {
                    count: filteredOrders.length,
                    totalCost,
                    statusCode: 200
                });
                return {
                    orders: filteredOrders,
                    totalCost,
                    count: filteredOrders.length,
                    statusCode: 200,
                    message: 'Orders retrieved successfully from database'
                };
            }
        }
        catch (error) {
            console.error('❌ LISA: Database search failed:', error.message);
        }
        console.log('📝 LISA: Using demo data for orders search');
        const mockOrders = [
            {
                id: '1',
                orderNumber: 'ORD-001',
                customer: { name: 'Acme Glass Co' },
                customerName: 'Acme Glass Co',
                glassType: 'Tempered',
                quantity: 5,
                width: 120,
                height: 80,
                cost: 450.00,
                status: 'PENDING'
            },
            {
                id: '2',
                orderNumber: 'ORD-002',
                customer: { name: 'Glass Solutions Ltd' },
                customerName: 'Glass Solutions Ltd',
                glassType: 'Laminated',
                quantity: 3,
                width: 100,
                height: 60,
                cost: 320.00,
                status: 'DELIVERED'
            },
            {
                id: '3',
                orderNumber: 'ORD-003',
                customer: { name: 'Modern Windows Inc' },
                customerName: 'Modern Windows Inc',
                glassType: 'Clear',
                quantity: 8,
                width: 150,
                height: 90,
                cost: 680.00,
                status: 'PROCESSING'
            }
        ];
        const totalCost = mockOrders.reduce((sum, order) => sum + order.cost, 0);
        return {
            orders: mockOrders,
            totalCost,
            count: mockOrders.length,
            statusCode: 200,
            message: 'Orders retrieved successfully (demo mode)'
        };
    }
    async createOrder(parameters) {
        try {
            if (this.ordersService && parameters.glassType && parameters.quantity) {
                const orderNumber = `ORD-${Date.now()}`;
                console.log('🗣️  LISA: Creating order via database...', { orderNumber, parameters });
                const orderData = {
                    orderNumber,
                    customerId: parameters.customerId || 'default-customer-id',
                    glassType: parameters.glassType.toUpperCase() || 'TEMPERED',
                    glassClass: parameters.glassClass?.toUpperCase() || 'IG_CLASS',
                    thickness: parseFloat(parameters.thickness) || 6.0,
                    width: parseFloat(parameters.width) || 1200,
                    height: parseFloat(parameters.height) || 800,
                    quantity: parseInt(parameters.quantity) || 1,
                    unitPrice: parseFloat(parameters.unitPrice) || 150.0,
                    totalPrice: parseFloat(parameters.totalPrice) || (parseFloat(parameters.unitPrice) || 150.0) * (parseInt(parameters.quantity) || 1),
                    status: 'PENDING',
                    priority: 'MEDIUM',
                    notes: `Voice order: ${parameters.glassType || 'glass'} order via voice assistant LISA`
                };
                const newOrder = await this.ordersService.create(orderData);
                console.log('✅ LISA: Order created successfully!', {
                    id: newOrder.id,
                    orderNumber: newOrder.orderNumber,
                    statusCode: 201
                });
                return {
                    id: newOrder.id,
                    orderNumber: newOrder.orderNumber,
                    success: true,
                    statusCode: 201,
                    message: 'Order created successfully in database'
                };
            }
        }
        catch (error) {
            console.error('❌ LISA: Database order creation failed:', error.message);
            const mockOrderId = `ORD-DEMO-${Date.now()}`;
            return {
                id: mockOrderId,
                orderNumber: mockOrderId,
                success: true,
                statusCode: 200,
                message: 'Order created successfully (demo mode - database unavailable)'
            };
        }
        const mockOrderId = `ORD-DEMO-${Date.now()}`;
        console.log('📝 LISA: Using demo mode for order creation', {
            id: mockOrderId,
            statusCode: 200
        });
        return {
            id: mockOrderId,
            orderNumber: mockOrderId,
            success: true,
            statusCode: 200,
            message: 'Order created successfully (demo mode)'
        };
    }
    async generatePdf(parameters) {
        return { message: 'PDF generation requested', orderId: parameters.orderId };
    }
    async endConversation(sessionId) {
        const state = this.conversations.get(sessionId);
        if (state) {
            this.conversations.delete(sessionId);
            return {
                message: 'Conversation ended successfully',
                action: 'end_conversation',
                sessionId
            };
        }
        return { message: 'No active conversation found' };
    }
    isConversationTooLong(state) {
        const maxLength = parseInt(process.env.MAX_CONVERSATION_LENGTH || '30') * 60 * 1000;
        return Date.now() - state.conversationStartTime > maxLength;
    }
    handleLongConversation(state) {
        return {
            text: "We've been chatting for a while! Is there anything specific I can help you wrap up?",
            shouldSpeak: true,
            confidence: 0.8
        };
    }
    getOrCreateState(sessionId) {
        if (!this.conversations.has(sessionId)) {
            this.conversations.set(sessionId, {
                isUserSpeaking: false,
                isAISpeaking: false,
                lastSpeechTime: Date.now(),
                conversationContext: [],
                pendingResponse: null,
                interruptionCount: 0,
                conversationStartTime: Date.now(),
                currentTopic: null,
                awaitingUserInput: false,
            });
        }
        return this.conversations.get(sessionId);
    }
    handleInterruption(sessionId) {
        const state = this.conversations.get(sessionId);
        if (state) {
            state.isAISpeaking = false;
            state.interruptionCount++;
            const interruptionResponses = [
                "Oh, go ahead!",
                "Sorry, what were you saying?",
                "Yes?",
                "LISA's listening...",
                "Sure, I'm here!",
                "What can I help with?"
            ];
            return {
                text: interruptionResponses[Math.floor(Math.random() * interruptionResponses.length)],
                shouldSpeak: true,
                confidence: 0.7
            };
        }
        return { text: '', shouldSpeak: false, confidence: 0 };
    }
    clearSession(sessionId) {
        this.conversations.delete(sessionId);
    }
    getConversationStats(sessionId) {
        const state = this.conversations.get(sessionId);
        if (!state)
            return null;
        return {
            duration: Date.now() - state.conversationStartTime,
            messageCount: state.conversationContext.length,
            interruptionCount: state.interruptionCount,
            currentTopic: state.currentTopic,
            isActive: Date.now() - state.lastSpeechTime < 30000
        };
    }
};
exports.NaturalConversationService = NaturalConversationService;
exports.NaturalConversationService = NaturalConversationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], NaturalConversationService);
//# sourceMappingURL=natural-conversation.service.js.map
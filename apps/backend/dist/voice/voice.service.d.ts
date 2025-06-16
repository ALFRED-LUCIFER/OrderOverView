import { OrdersService } from '../orders/orders.service';
import { NaturalConversationService } from './natural-conversation.service';
export declare class VoiceService {
    private ordersService;
    naturalConversationService: NaturalConversationService;
    private groq;
    private conversationHistory;
    constructor(ordersService: OrdersService, naturalConversationService: NaturalConversationService);
    processVoiceCommand(transcript: string, sessionId: string, options?: {
        isEndOfSpeech?: boolean;
        interimResults?: boolean;
        useNaturalConversation?: boolean;
    }): Promise<{
        response: string;
        action?: string;
        data?: any;
        shouldSpeak?: boolean;
        fillerWord?: string;
        isThinking?: boolean;
        confidence?: number;
    }>;
    processVoiceCommandOriginal(transcript: string, sessionId: string): Promise<{
        response: string;
        action?: string;
        data?: any;
    }>;
    private parseIntentAndExecute;
    private filterOrders;
    private extractSearchCriteria;
    private extractOrderId;
    clearSession(sessionId: string): void;
}

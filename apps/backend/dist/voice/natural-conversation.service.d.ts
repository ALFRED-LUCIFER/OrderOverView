import { OrdersService } from '../orders/orders.service';
interface NaturalResponse {
    text: string;
    action?: string;
    data?: any;
    shouldSpeak: boolean;
    fillerWord?: string;
    isThinking?: boolean;
    confidence: number;
}
export declare class NaturalConversationService {
    private ordersService?;
    private groq;
    private conversations;
    constructor(ordersService?: OrdersService);
    processNaturalSpeech(transcript: string, sessionId: string, isEndOfSpeech?: boolean, interimResults?: boolean): Promise<NaturalResponse>;
    private processCompleteUtterance;
    private handleInterimSpeech;
    private handleContinuousSpeech;
    private detectIntent;
    private fallbackIntentDetection;
    private generateNaturalResponse;
    private enhanceNaturalSpeech;
    private cleanupResponse;
    private getContextualFillerWord;
    private getErrorResponse;
    private executeAction;
    private searchOrders;
    private createOrder;
    private generatePdf;
    private endConversation;
    private isConversationTooLong;
    private handleLongConversation;
    private getOrCreateState;
    handleInterruption(sessionId: string): NaturalResponse;
    clearSession(sessionId: string): void;
    getConversationStats(sessionId: string): {
        duration: number;
        messageCount: number;
        interruptionCount: number;
        currentTopic: string;
        isActive: boolean;
    };
}
export {};

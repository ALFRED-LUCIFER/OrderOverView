import { VoiceService } from './voice.service';
export declare class VoiceController {
    private readonly voiceService;
    constructor(voiceService: VoiceService);
    healthCheck(): {
        status: string;
        agent: string;
        naturalConversation: string;
        model: string;
    };
    testVoiceCommands(): Promise<{
        message: string;
    }>;
    getVoiceConfig(): {
        agent: string;
        model: string;
        enableContinuousListening: boolean;
        voiceActivityThreshold: number;
        silenceTimeoutMs: number;
        maxConversationLength: number;
        aiResponseStyle: string;
        enableFillerWords: boolean;
        enableThinkingSounds: boolean;
    };
}

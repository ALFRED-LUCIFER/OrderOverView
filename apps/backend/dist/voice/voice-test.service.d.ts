import { NaturalConversationService } from '../voice/natural-conversation.service';
export declare class VoiceTestService {
    private naturalConversationService;
    constructor(naturalConversationService: NaturalConversationService);
    testVoiceCommands(): Promise<void>;
}

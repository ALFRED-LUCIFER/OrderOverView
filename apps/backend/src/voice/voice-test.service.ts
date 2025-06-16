import { Injectable } from '@nestjs/common';
import { NaturalConversationService } from '../voice/natural-conversation.service';

@Injectable()
export class VoiceTestService {
  constructor(private naturalConversationService: NaturalConversationService) {}

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
        const response = await this.naturalConversationService.processNaturalSpeech(
          command,
          'test-session',
          true,
          false
        );
        console.log(`Assistant: "${response.text}"`);
        if (response.action) {
          console.log(`Action: ${response.action}`);
        }
        console.log(`Confidence: ${response.confidence}\n`);
      } catch (error) {
        console.error(`Error processing "${command}":`, error.message);
      }
    }

    // Test conversation stats
    const stats = this.naturalConversationService.getConversationStats('test-session');
    console.log('Conversation Stats:', stats);
  }
}

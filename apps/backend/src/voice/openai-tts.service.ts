import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAITTSService {
  private readonly logger = new Logger(OpenAITTSService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OpenAI API key not found');
      return;
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async generateSpeech(text: string): Promise<Buffer> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      const model = this.configService.get<string>('OPENAI_TTS_MODEL', 'tts-1-hd');
      const voice = this.configService.get<string>('OPENAI_TTS_VOICE', 'nova');

      this.logger.log(`🎤 Generating speech with OpenAI TTS: ${model} voice: ${voice}`);

      const response = await this.openai.audio.speech.create({
        model: model as any,
        voice: voice as any,
        input: text,
        response_format: 'mp3',
        speed: 1.0,
      });

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      this.logger.log(`✅ OpenAI TTS generated ${buffer.length} bytes of audio`);
      return buffer;

    } catch (error) {
      this.logger.error('OpenAI TTS generation failed:', error);
      throw new Error(`OpenAI TTS failed: ${error.message}`);
    }
  }

  async testService(): Promise<boolean> {
    try {
      if (!this.openai) {
        return false;
      }

      const testBuffer = await this.generateSpeech('Hello, this is a test from LISA.');
      return testBuffer && testBuffer.length > 0;
    } catch (error) {
      this.logger.error('OpenAI TTS test failed:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return !!this.openai;
  }
}

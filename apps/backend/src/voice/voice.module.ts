import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { VoiceGateway } from './voice.gateway';
import { NaturalConversationService } from './natural-conversation.service';
import { EnhancedVoiceService } from './enhanced-voice.service';
import { EnhancedIntentService } from './enhanced-intent.service';
import { EnhancedElevenLabsService } from './enhanced-elevenlabs.service';
import { AIProvidersService } from './ai-providers.service';
import { OrdersModule } from '../orders/orders.module';
import { CustomersModule } from '../customers/customers.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    ConfigModule,
    OrdersModule, 
    CustomersModule, 
    MailerModule
  ],
  controllers: [VoiceController],
  providers: [
    VoiceService, 
    VoiceGateway, 
    NaturalConversationService,
    EnhancedVoiceService,
    EnhancedIntentService,
    EnhancedElevenLabsService,
    AIProvidersService
  ],
  exports: [
    VoiceService, 
    NaturalConversationService,
    EnhancedVoiceService,
    EnhancedIntentService,
    EnhancedElevenLabsService
  ],
})
export class VoiceModule {}

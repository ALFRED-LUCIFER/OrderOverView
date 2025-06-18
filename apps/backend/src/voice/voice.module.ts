import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { VoiceGateway } from './voice.gateway';
import { NaturalConversationService } from './natural-conversation.service';
import { OrdersModule } from '../orders/orders.module';
import { CustomersModule } from '../customers/customers.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [OrdersModule, CustomersModule, MailerModule],
  controllers: [VoiceController],
  providers: [VoiceService, VoiceGateway, NaturalConversationService],
  exports: [VoiceService, NaturalConversationService],
})
export class VoiceModule {}

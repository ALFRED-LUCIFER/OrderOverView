import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MailerService } from '../mailer/mailer.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, MailerService],
  exports: [OrdersService],
})
export class OrdersModule {}

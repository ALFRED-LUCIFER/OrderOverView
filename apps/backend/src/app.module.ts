import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { VoiceModule } from './voice/voice.module';
import { ReportsModule } from './reports/reports.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CustomersModule,
    OrdersModule,
    VoiceModule,
    ReportsModule,
    PdfModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { OrdersService } from '../orders/orders.service';
import { CustomersService } from '../customers/customers.service';
import { PdfService } from '../pdf/pdf.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, OrdersService, CustomersService, PdfService],
  exports: [ReportsService],
})
export class ReportsModule {}

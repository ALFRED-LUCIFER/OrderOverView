import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfService } from './pdf.service';

@ApiTags('pdf')
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('test')
  @ApiOperation({ summary: 'Test PDF generation' })
  @ApiResponse({ status: 200, description: 'Test PDF generated' })
  async testPdf(@Res() res: Response) {
    const testData = {
      orderNumber: 'TEST-001',
      customerName: 'Test Customer',
      orderDate: new Date().toISOString(),
      status: 'PENDING',
      totalPrice: 1500,
    };

    const pdfBuffer = await this.pdfService.generateFromTemplate('order', testData);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="test-order.pdf"',
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }
}
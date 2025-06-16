import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import * as path from 'path';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('generate/:orderId')
  async generatePdf(@Param('orderId') orderId: string) {
    const pdfUrl = await this.pdfService.generateOrderPdf(orderId);
    return { pdfUrl };
  }

  @Get(':filename')
  async servePdf(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.join(process.env.PDF_STORAGE_PATH || './temp/pdfs', filename);
    res.sendFile(path.resolve(filePath));
  }
}

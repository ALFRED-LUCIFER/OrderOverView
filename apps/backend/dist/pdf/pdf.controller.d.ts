import { Response } from 'express';
import { PdfService } from './pdf.service';
export declare class PdfController {
    private readonly pdfService;
    constructor(pdfService: PdfService);
    generatePdf(orderId: string): Promise<{
        pdfUrl: string;
    }>;
    servePdf(filename: string, res: Response): Promise<void>;
}

import { Injectable } from '@nestjs/common';
import { jsPDF } from 'jspdf';

@Injectable()
export class PdfService {
  async generatePdf(htmlContent: string): Promise<Buffer> {
    // Create a new jsPDF instance
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Since jsPDF doesn't directly support HTML, we'll extract the content
    // and format it properly for PDF
    const textContent = this.extractTextFromHtml(htmlContent);
    
    // Add content to PDF
    doc.setFontSize(16);
    doc.text('Glass Order Management System', 20, 20);
    
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(textContent, 170);
    doc.text(lines, 20, 40);
    
    // Generate PDF buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  }

  async generateFromTemplate(templateName: string, data: any): Promise<Buffer> {
    // Template-based PDF generation
    const htmlContent = this.renderTemplate(templateName, data);
    
    // Create a new jsPDF instance
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Format content based on template type
    if (templateName === 'order') {
      return this.generateOrderPdf(doc, data);
    } else if (templateName === 'report') {
      return this.generateReportPdf(doc, data);
    } else {
      return this.generatePdf(htmlContent);
    }
  }

  private generateOrderPdf(doc: jsPDF, orderData: any): Buffer {
    // Header
    doc.setFontSize(20);
    doc.text('Glass Order Invoice', 105, 30, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(`Order #${orderData.orderNumber}`, 105, 45, { align: 'center' });
    
    // Order details
    doc.setFontSize(12);
    doc.text('Order Details:', 20, 70);
    doc.text(`Customer: ${orderData.customerName}`, 20, 85);
    doc.text(`Date: ${new Date(orderData.orderDate).toLocaleDateString()}`, 20, 95);
    doc.text(`Status: ${orderData.status}`, 20, 105);
    doc.text(`Total: $${orderData.totalPrice.toLocaleString()}`, 20, 115);
    
    // Additional details if available
    if (orderData.glassType) {
      doc.text(`Glass Type: ${orderData.glassType}`, 20, 130);
    }
    if (orderData.dimensions) {
      doc.text(`Dimensions: ${orderData.dimensions}`, 20, 140);
    }
    
    // Footer
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 280);
    
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  }

  private generateReportPdf(doc: jsPDF, reportData: any): Buffer {
    // Header
    doc.setFontSize(20);
    doc.text('Analytics Report', 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 45, { align: 'center' });
    
    // Metrics
    doc.setFontSize(14);
    doc.text('Key Metrics:', 20, 70);
    
    doc.setFontSize(12);
    let yPos = 85;
    
    if (reportData.totalOrders) {
      doc.text(`Total Orders: ${reportData.totalOrders}`, 20, yPos);
      yPos += 10;
    }
    
    if (reportData.totalRevenue) {
      doc.text(`Total Revenue: $${reportData.totalRevenue.toLocaleString()}`, 20, yPos);
      yPos += 10;
    }
    
    if (reportData.totalCustomers) {
      doc.text(`Total Customers: ${reportData.totalCustomers}`, 20, yPos);
      yPos += 10;
    }
    
    if (reportData.averageOrderValue) {
      doc.text(`Average Order Value: $${reportData.averageOrderValue.toLocaleString()}`, 20, yPos);
      yPos += 10;
    }
    
    // Footer
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 280);
    
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  }

  private extractTextFromHtml(htmlContent: string): string {
    // Simple HTML tag removal for basic text extraction
    return htmlContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private renderTemplate(templateName: string, data: any): string {
    // Simple template rendering - in production use a proper template engine
    switch (templateName) {
      case 'order':
        return this.renderOrderTemplate(data);
      case 'report':
        return this.renderReportTemplate(data);
      default:
        throw new Error(`Template ${templateName} not found`);
    }
  }

  private renderOrderTemplate(orderData: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order ${orderData.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .order-info { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Glass Order Invoice</h1>
            <h2>Order #${orderData.orderNumber}</h2>
          </div>
          <div class="order-info">
            <p><strong>Customer:</strong> ${orderData.customerName}</p>
            <p><strong>Date:</strong> ${new Date(orderData.orderDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${orderData.status}</p>
            <p><strong>Total:</strong> $${orderData.totalPrice.toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
  }

  private renderReportTemplate(reportData: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
            .metric { border: 1px solid #ddd; padding: 15px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; color: #1976d2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Analytics Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">${reportData.totalOrders}</div>
              <div>Total Orders</div>
            </div>
            <div class="metric">
              <div class="metric-value">$${reportData.totalRevenue.toLocaleString()}</div>
              <div>Total Revenue</div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
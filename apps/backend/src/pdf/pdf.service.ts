import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PdfService {
  constructor(private ordersService: OrdersService) {}

  async generateOrderPdf(orderId: string): Promise<string> {
    const order = await this.ordersService.findOne(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    const html = this.generateOrderHtml(order);
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });

      // Save PDF
      const fileName = `order-${orderId}-${Date.now()}.pdf`;
      const filePath = path.join(process.env.PDF_STORAGE_PATH || './temp/pdfs', fileName);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, pdf);

      return `/api/pdf/${fileName}`;
    } finally {
      await browser.close();
    }
  }

  private generateOrderHtml(order: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .order-details { margin: 20px 0; }
            .section { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
            .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
            .status.pending { background-color: #fff3cd; color: #856404; }
            .status.confirmed { background-color: #d4edda; color: #155724; }
            .status.delivered { background-color: #d1ecf1; color: #0c5460; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Glass Order Report</h1>
            <h2>Order #${order.orderNumber || order.id}</h2>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="section">
            <h3>Order Information</h3>
            <table>
              <tr><th>Order Date</th><td>${new Date(order.orderDate).toLocaleDateString()}</td></tr>
              <tr><th>Status</th><td><span class="status ${order.status.toLowerCase()}">${order.status}</span></td></tr>
              <tr><th>Priority</th><td>${order.priority}</td></tr>
              ${order.requiredDate ? `<tr><th>Required Date</th><td>${new Date(order.requiredDate).toLocaleDateString()}</td></tr>` : ''}
            </table>
          </div>

          <div class="section">
            <h3>Customer Information</h3>
            <table>
              ${order.customer ? `
                <tr><th>Name</th><td>${order.customer.name}</td></tr>
                <tr><th>Email</th><td>${order.customer.email}</td></tr>
                <tr><th>Country</th><td>${order.customer.country}</td></tr>
                ${order.customer.city ? `<tr><th>City</th><td>${order.customer.city}</td></tr>` : ''}
              ` : `<tr><td colspan="2">Customer information not available</td></tr>`}
            </table>
          </div>
          
          <div class="section">
            <h3>Glass Specifications</h3>
            <table>
              <tr><th>Glass Type</th><td>${order.glassType}</td></tr>
              <tr><th>Glass Class</th><td>${order.glassClass}</td></tr>
              <tr><th>Dimensions</th><td>${order.width} x ${order.height} mm</td></tr>
              <tr><th>Thickness</th><td>${order.thickness} mm</td></tr>
              <tr><th>Quantity</th><td>${order.quantity} pieces</td></tr>
              <tr><th>Tempered</th><td>${order.tempering ? 'Yes' : 'No'}</td></tr>
              <tr><th>Laminated</th><td>${order.laminated ? 'Yes' : 'No'}</td></tr>
              ${order.edgeWork ? `<tr><th>Edge Work</th><td>${order.edgeWork}</td></tr>` : ''}
              ${order.coating ? `<tr><th>Coating</th><td>${order.coating}</td></tr>` : ''}
            </table>
          </div>

          <div class="section">
            <h3>Pricing</h3>
            <table>
              <tr><th>Unit Price</th><td>$${order.unitPrice}</td></tr>
              <tr><th>Quantity</th><td>${order.quantity}</td></tr>
              <tr><th>Total Price</th><td>$${order.totalPrice}</td></tr>
              <tr><th>Currency</th><td>${order.currency}</td></tr>
            </table>
          </div>

          ${order.notes ? `
            <div class="section">
              <h3>Notes</h3>
              <p>${order.notes}</p>
            </div>
          ` : ''}

          <div class="total">
            Total Amount: $${order.totalPrice} ${order.currency}
          </div>
        </body>
      </html>
    `;
  }
}

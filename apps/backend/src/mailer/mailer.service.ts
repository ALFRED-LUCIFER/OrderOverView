import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { render } from '@react-email/render';
import { OrderEmailData } from './interfaces/email.interface';
import OrderCreatedEmail from './templates/order-created';
import OrderStatusChangeEmail from './templates/order-status-change';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private mailerSend: MailerSend;
  private fromSender: Sender;

  constructor(private configService: ConfigService) {
    this.initializeMailerSend();
  }

  private initializeMailerSend() {
    try {
      
      const apiToken = this.configService.get<string>('MAILERSEND_API_TOKEN');
      if (!apiToken) {
        this.logger.warn('MailerSend API token not configured. Email sending will be disabled.');
        return;
      }

      this.mailerSend = new MailerSend({
        apiKey: apiToken,
      });

      this.fromSender = new Sender(
        this.configService.get<string>('MAILERSEND_FROM_EMAIL', 'noreply@glassoms.com'),
        this.configService.get<string>('MAILERSEND_FROM_NAME', 'GlassOMS')
      );

      this.logger.log('MailerSend initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MailerSend:', error);
    }
  }

  async sendOrderCreatedEmail(orderData: OrderEmailData): Promise<boolean> {
    if (!this.mailerSend) {
      this.logger.warn('MailerSend not initialized. Skipping email send.');
      return false;
    }

    try {
      const htmlContent = await render(OrderCreatedEmail({ orderData }));
      
      const emailParams = new EmailParams()
        .setFrom(this.fromSender)
        .setTo([new Recipient(orderData.customerEmail, orderData.customerName || 'Customer')])
        .setSubject(`Order Confirmation - ${orderData.orderNumber}`)
        .setHtml(htmlContent)
        .setText(`Your order ${orderData.orderNumber} has been created successfully. Total: $${orderData.totalPrice}`);

      await this.mailerSend.email.send(emailParams);
      this.logger.log(`Order created email sent successfully to ${orderData.customerEmail}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send order created email:', error);
      return false;
    }
  }

  async sendOrderUpdatedEmail(orderData: OrderEmailData): Promise<boolean> {
    if (!this.mailerSend) {
      this.logger.warn('MailerSend not initialized. Skipping email send.');
      return false;
    }

    try {
      const htmlContent = await render(OrderStatusChangeEmail({ orderData }));
      
      const emailParams = new EmailParams()
        .setFrom(this.fromSender)
        .setTo([new Recipient(orderData.customerEmail, orderData.customerName || 'Customer')])
        .setSubject(`Order Update - ${orderData.orderNumber}`)
        .setHtml(htmlContent)
        .setText(`Your order ${orderData.orderNumber} has been updated. Status: ${orderData.status}`);

      await this.mailerSend.email.send(emailParams);
      this.logger.log(`Order updated email sent successfully to ${orderData.customerEmail}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send order updated email:', error);
      return false;
    }
  }

  async sendOrderStatusChangeEmail(orderData: OrderEmailData): Promise<boolean> {
    if (!this.mailerSend) {
      this.logger.warn('MailerSend not initialized. Skipping email send.');
      return false;
    }

    try {
      const htmlContent = await render(OrderStatusChangeEmail({ orderData }));
      
      const emailParams = new EmailParams()
        .setFrom(this.fromSender)
        .setTo([new Recipient(orderData.customerEmail, orderData.customerName || 'Customer')])
        .setSubject(`Order Status Update - ${orderData.orderNumber}`)
        .setHtml(htmlContent)
        .setText(`Your order ${orderData.orderNumber} status has changed to: ${orderData.status}`);

      await this.mailerSend.email.send(emailParams);
      this.logger.log(`Order status change email sent successfully to ${orderData.customerEmail}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send order status change email:', error);
      return false;
    }
  }

  async sendTestEmail(to: string): Promise<boolean> {
    if (!this.mailerSend) {
      this.logger.warn('MailerSend not initialized. Skipping test email send.');
      return false;
    }

    try {
      const testOrderData: OrderEmailData = {
        orderNumber: 'TEST-001',
        customerName: 'Test Customer',
        customerEmail: to,
        items: [
          { name: 'Test Product', quantity: 1, price: 99.99 }
        ],
        totalPrice: 99.99,
        status: 'pending',
        createdAt: new Date().toISOString(),
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const htmlContent = await render(OrderCreatedEmail({ orderData: testOrderData }));
      
      const emailParams = new EmailParams()
        .setFrom(this.fromSender)
        .setTo([new Recipient(to, 'Test User')])
        .setSubject('Test Email - Order System')
        .setHtml(htmlContent)
        .setText('This is a test email from the order system.');

      await this.mailerSend.email.send(emailParams);
      this.logger.log(`Test email sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send test email:', error);
      return false;
    }
  }
}
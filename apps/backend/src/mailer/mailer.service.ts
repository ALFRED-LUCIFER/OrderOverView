import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerSend, EmailParams, Recipient, Sender } from 'mailersend';
import { OrderEmailData } from './interfaces/email.interface';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private mailerSend: MailerSend;
  private readonly templateId = 'jpzkmgqqn3vg059v'; // MailerSend template ID
  private readonly defaultRecipients = [
    'alfred.paul@lisec.com',
    'soumitra.mukherjee@lisec.com'
  ];

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

      this.logger.log('MailerSend initialized successfully with template support');
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
      const recipients = this.defaultRecipients.map(email => 
        new Recipient(email, email.includes('alfred') ? 'Alfred Paul' : 'Soumitra Mukherjee')
      );

      const personalization = this.defaultRecipients.map(email => ({
        email: email,
        data: {
          items: orderData.items.map(item => ({
            price: item.price.toString(),
            product: item.name,
            quantity: item.quantity.toString()
          })),
          order: {
            date: new Date(orderData.createdAt).toLocaleDateString(),
            order_number: orderData.orderNumber,
            billing_address: 'Glass Order Management System',
            customer_message: orderData.notes || 'Voice order created via LISA assistant'
          },
          store: {
            name: 'Glass Order Management System'
          },
          invoice: {
            total: orderData.totalPrice.toString(),
            subtotal: orderData.totalPrice.toString(),
            pay_method: 'Company Account'
          },
          customer: {
            name: orderData.customerName || 'Voice Customer',
            email: orderData.customerEmail,
            phone: ''
          },
          account_name: 'Glass OMS Team'
        },
      }));

      const emailParams = new EmailParams()
        .setFrom(new Sender('info@glassoms.com', 'Glass Order Management System'))
        .setTo(recipients)
        .setSubject(`New Order Created - ${orderData.orderNumber}`)
        .setTemplateId(this.templateId)
        .setPersonalization(personalization);

      await this.mailerSend.email.send(emailParams);
      this.logger.log(`Order created email sent successfully to ${this.defaultRecipients.join(', ')}`);
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
      const recipients = this.defaultRecipients.map(email => 
        new Recipient(email, email.includes('alfred') ? 'Alfred Paul' : 'Soumitra Mukherjee')
      );

      const personalization = this.defaultRecipients.map(email => ({
        email: email,
        data: {
          items: orderData.items.map(item => ({
            price: item.price.toString(),
            product: item.name,
            quantity: item.quantity.toString()
          })),
          order: {
            date: new Date(orderData.updatedAt || orderData.createdAt).toLocaleDateString(),
            order_number: orderData.orderNumber,
            billing_address: 'Glass Order Management System',
            customer_message: `Order status updated to: ${orderData.status}`
          },
          store: {
            name: 'Glass Order Management System'
          },
          invoice: {
            total: orderData.totalPrice.toString(),
            subtotal: orderData.totalPrice.toString(),
            pay_method: 'Company Account'
          },
          customer: {
            name: orderData.customerName || 'Voice Customer',
            email: orderData.customerEmail,
            phone: ''
          },
          account_name: 'Glass OMS Team'
        },
      }));

      const emailParams = new EmailParams()
        .setFrom(new Sender('info@glassoms.com', 'Glass Order Management System'))
        .setTo(recipients)
        .setSubject(`Order Status Updated - ${orderData.orderNumber} (${orderData.status})`)
        .setTemplateId(this.templateId)
        .setPersonalization(personalization);

      await this.mailerSend.email.send(emailParams);
      this.logger.log(`Order updated email sent successfully to ${this.defaultRecipients.join(', ')}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send order updated email:', error);
      return false;
    }
  }

  async sendOrderStatusChangeEmail(orderData: OrderEmailData): Promise<boolean> {
    // Use the same logic as sendOrderUpdatedEmail
    return this.sendOrderUpdatedEmail(orderData);
  }

  async sendTestEmail(to?: string): Promise<boolean> {
    if (!this.mailerSend) {
      this.logger.warn('MailerSend not initialized. Skipping test email send.');
      return false;
    }

    try {
      const recipients = this.defaultRecipients.map(email => 
        new Recipient(email, email.includes('alfred') ? 'Alfred Paul' : 'Soumitra Mukherjee')
      );

      const testOrderData = {
        orderNumber: 'TEST-' + Date.now(),
        customerName: 'Test Customer via LISA',
        customerEmail: 'test@glassoms.com',
        items: [
          { name: 'Test Glass Panel', quantity: 1, price: 99.99 }
        ],
        totalPrice: 99.99,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      const personalization = this.defaultRecipients.map(email => ({
        email: email,
        data: {
          items: [{
            price: '99.99',
            product: 'Test Glass Panel',
            quantity: '1'
          }],
          order: {
            date: new Date().toLocaleDateString(),
            order_number: testOrderData.orderNumber,
            billing_address: 'Glass Order Management System Test',
            customer_message: 'This is a test email sent via LISA voice assistant'
          },
          store: {
            name: 'Glass Order Management System (Test)'
          },
          invoice: {
            total: '99.99',
            subtotal: '99.99',
            pay_method: 'Test Account'
          },
          customer: {
            name: 'Test Customer via LISA',
            email: 'test@glassoms.com',
            phone: '+1-555-TEST'
          },
          account_name: 'LISA Voice Assistant'
        },
      }));

      const emailParams = new EmailParams()
        .setFrom(new Sender('info@glassoms.com', 'Glass Order Management System'))
        .setTo(recipients)
        .setSubject(`Test Email from LISA - ${testOrderData.orderNumber}`)
        .setTemplateId(this.templateId)
        .setPersonalization(personalization);

      await this.mailerSend.email.send(emailParams);
            this.logger.log(`Test email sent successfully to ${this.defaultRecipients.join(', ')}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send test email:', error);
      return false;
    }
  }
}
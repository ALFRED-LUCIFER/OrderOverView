import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Link,
} from '@react-email/components';
import { OrderEmailData } from '../interfaces/email.interface';

interface OrderCreatedEmailProps {
  orderData: OrderEmailData;
}

export const OrderCreatedEmail: React.FC<OrderCreatedEmailProps> = ({ orderData }) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>🎉 Order Confirmation</Heading>
            <Text style={headerText}>
              Thank you for your order, {orderData.customerName}!
            </Text>
          </Section>

          <Section style={content}>
            <Text style={text}>Dear {orderData.customerName},</Text>
            
            <Text style={text}>
              We're excited to confirm that we've received your glass order. Here are the details:
            </Text>

            <Section style={orderDetails}>
              <Heading style={h2}>Order Information</Heading>
              <div style={orderItem}>
                <span style={label}>Order Number:</span>
                <span style={value}>{orderData.orderNumber}</span>
              </div>
              <div style={orderItem}>
                <span style={label}>Order Date:</span>
                <span style={value}>{new Date(orderData.createdAt).toLocaleDateString()}</span>
              </div>
              <div style={orderItem}>
                <span style={label}>Status:</span>
                <span style={statusBadge}>{orderData.status}</span>
              </div>
              {orderData.estimatedDelivery && (
                <div style={orderItem}>
                  <span style={label}>Estimated Delivery:</span>
                  <span style={value}>{new Date(orderData.estimatedDelivery).toLocaleDateString()}</span>
                </div>
              )}
            </Section>

            <Section style={orderDetails}>
              <Heading style={h2}>Order Items</Heading>
              {orderData.items.map((item, index) => (
                <div key={index} style={orderItem}>
                  <span style={label}>{item.name}:</span>
                  <span style={value}>{item.quantity} × ${item.price.toFixed(2)}</span>
                </div>
              ))}
              <div style={{...orderItem, ...totalItem}}>
                <span style={label}>Total Amount:</span>
                <span style={value}>${orderData.totalPrice.toFixed(2)}</span>
              </div>
            </Section>

            {orderData.notes && (
              <Section style={orderDetails}>
                <Heading style={h2}>Special Notes</Heading>
                <Text style={text}>{orderData.notes}</Text>
              </Section>
            )}

            <Text style={text}>
              We'll keep you updated on the progress of your order. If you have any questions, 
              please don't hesitate to contact us.
            </Text>
            
            <Text style={text}>
              Best regards,<br />
              Glass Order Management System Team
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              This is an automated message from Glass OMS. Please do not reply to this email.
            </Text>
            <Text style={footerText}>
              © 2024 Glass Order Management System. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
};

const header = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: '30px',
  textAlign: 'center' as const,
  borderRadius: '10px 10px 0 0',
};

const h1 = {
  margin: '0 0 10px 0',
  fontSize: '28px',
  fontWeight: 'bold',
};

const h2 = {
  margin: '0 0 15px 0',
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#333',
};

const headerText = {
  margin: '0',
  fontSize: '16px',
};

const content = {
  backgroundColor: 'white',
  padding: '30px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const text = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#333',
  margin: '0 0 16px 0',
};

const orderDetails = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  borderRadius: '8px',
  margin: '20px 0',
  borderLeft: '4px solid #667eea',
};

const orderItem = {
  display: 'flex',
  justifyContent: 'space-between',
  margin: '8px 0',
  padding: '8px 0',
  borderBottom: '1px solid #eee',
};

const totalItem = {
  fontWeight: 'bold',
  fontSize: '1.2em',
  color: '#667eea',
  borderTop: '2px solid #667eea',
  paddingTop: '10px',
  marginTop: '10px',
  borderBottom: 'none',
};

const label = {
  fontWeight: 'bold',
};

const value = {
  color: '#666',
};

const statusBadge = {
  backgroundColor: '#28a745',
  color: 'white',
  padding: '4px 12px',
  borderRadius: '20px',
  fontSize: '0.9em',
  fontWeight: 'bold',
};

const footer = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  textAlign: 'center' as const,
  borderRadius: '0 0 10px 10px',
};

const footerText = {
  fontSize: '14px',
  color: '#666',
  margin: '5px 0',
};

export default OrderCreatedEmail;

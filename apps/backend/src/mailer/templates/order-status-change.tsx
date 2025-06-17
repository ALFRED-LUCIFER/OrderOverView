import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
} from '@react-email/components';
import { OrderEmailData } from '../interfaces/email.interface';

interface OrderStatusChangeEmailProps {
  orderData: OrderEmailData;
}

export const OrderStatusChangeEmail: React.FC<OrderStatusChangeEmailProps> = ({ orderData }) => {
  const getStatusMessage = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return 'Your order has been confirmed and will begin production soon.';
      case 'IN_PRODUCTION':
        return 'Your glass order is now being manufactured. We\'ll notify you when it\'s ready for quality check.';
      case 'QUALITY_CHECK':
        return 'Your order is currently undergoing our quality assurance process.';
      case 'READY_FOR_DELIVERY':
        return 'Great news! Your order has passed quality check and is ready for delivery or pickup.';
      case 'DELIVERED':
        return '🎉 Your order has been successfully delivered! Thank you for your business.';
      case 'ON_HOLD':
        return 'Your order is temporarily on hold. We\'ll contact you shortly with more information.';
      case 'CANCELLED':
        return 'Your order has been cancelled. If this was unexpected, please contact us immediately.';
      default:
        return 'Your order status has been updated. Please contact us if you have any questions.';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return '#28a745';
      case 'IN_PRODUCTION':
        return '#ffc107';
      case 'QUALITY_CHECK':
        return '#17a2b8';
      case 'READY_FOR_DELIVERY':
        return '#28a745';
      case 'DELIVERED':
        return '#28a745';
      case 'ON_HOLD':
        return '#ffc107';
      case 'CANCELLED':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>📊 Status Update</Heading>
            <Text style={headerText}>Your order status has changed</Text>
          </Section>

          <Section style={content}>
            <Text style={text}>Dear {orderData.customerName},</Text>
            
            <Text style={text}>Great news! Your order status has been updated:</Text>

            <Section style={{...statusBanner, borderColor: getStatusColor(orderData.status)}}>
              <Heading style={h2}>Order {orderData.orderNumber}</Heading>
              <Heading style={h3}>
                Status: {orderData.status.replace('_', ' ').toUpperCase()}
              </Heading>
              <Text style={statusText}>
                Updated on: {new Date().toLocaleString()}
              </Text>
            </Section>

            <Text style={text}>{getStatusMessage(orderData.status)}</Text>
            
            <Text style={text}>Thank you for choosing Glass Order Management System!</Text>
            
            <Text style={text}>
              Best regards,<br />
              Glass Order Management System Team
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              This is an automated message from Glass OMS. Please do not reply to this email.
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
  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
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
  margin: '0 0 10px 0',
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#333',
};

const h3 = {
  margin: '0 0 10px 0',
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

const statusBanner = {
  backgroundColor: '#e8f5e8',
  border: '2px solid #28a745',
  padding: '20px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  margin: '20px 0',
};

const statusText = {
  fontSize: '14px',
  color: '#666',
  margin: '0',
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

export default OrderStatusChangeEmail;

export interface OrderEmailData {
  orderNumber: string;
  customerName?: string;
  customerEmail: string;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  estimatedDelivery?: string;
  notes?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface NotificationPreferences {
  orderCreated: boolean;
  orderUpdated: boolean;
  statusChanged: boolean;
  emailEnabled: boolean;
  smsEnabled?: boolean;
}
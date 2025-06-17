import axios from 'axios';

// Get API URL from environment variables with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface QuarterlyReportData {
  quarter: string;
  year: number;
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  ordersByPriority: Record<string, number>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    orderCount: number;
    totalRevenue: number;
  }>;
  topCountries: Array<{
    country: string;
    orderCount: number;
    totalRevenue: number;
  }>;
  glassTypeDistribution: Record<string, number>;
  monthlyTrend: Array<{
    month: string;
    orders: number;
    revenue: number;
  }>;
}

export interface CustomerReportData {
  customerId: string;
  customerName: string;
  customerEmail: string;
  country: string;
  city: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  firstOrderDate: string;
  lastOrderDate: string;
  ordersByStatus: Record<string, number>;
  ordersByPriority: Record<string, number>;
  glassTypePreferences: Record<string, number>;
  monthlyOrderTrend: Array<{
    month: string;
    orders: number;
    revenue: number;
  }>;
  orders: Array<{
    orderNumber: string;
    orderDate: string;
    status: string;
    priority: string;
    totalPrice: number;
    glassType: string;
    quantity: number;
  }>;
}

export interface AnalyticsOverview {
  current: {
    quarter: string;
    year: number;
    totalOrders: number;
    totalRevenue: number;
    ordersByStatus: Record<string, number>;
    topCountries: Array<{
      country: string;
      orderCount: number;
      totalRevenue: number;
    }>;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      orderCount: number;
      totalRevenue: number;
    }>;
  };
  previous: {
    quarter: string;
    year: number;
    totalOrders: number;
    totalRevenue: number;
  } | null;
  trends: {
    ordersGrowth: number;
    revenueGrowth: number;
  };
}

export interface QuarterOption {
  year: number;
  quarter: number;
  label: string;
  value: string;
}

class ReportsService {
  private baseUrl = `${API_BASE_URL}/reports`;

  async getQuarterlyReport(year: number, quarter: number): Promise<QuarterlyReportData> {
    const response = await axios.get(`${this.baseUrl}/quarterly/${year}/${quarter}`);
    return response.data;
  }

  async downloadQuarterlyReportPdf(year: number, quarter: number): Promise<void> {
    const response = await axios.get(`${this.baseUrl}/quarterly/${year}/${quarter}/pdf`, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quarterly-report-Q${quarter}-${year}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async getCustomerReport(customerId: string): Promise<CustomerReportData> {
    const response = await axios.get(`${this.baseUrl}/customer/${customerId}`);
    return response.data;
  }

  async downloadCustomerReportPdf(customerId: string): Promise<void> {
    const response = await axios.get(`${this.baseUrl}/customer/${customerId}/pdf`, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Get customer name from the response headers or make a separate call
    const customer = await this.getCustomerReport(customerId);
    const filename = `customer-report-${customer.customerName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    link.download = filename;
    
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const response = await axios.get(`${this.baseUrl}/analytics/overview`);
    return response.data;
  }

  async getAvailableQuarters(year?: number): Promise<QuarterOption[]> {
    const params = year ? { year: year.toString() } : {};
    const response = await axios.get(`${this.baseUrl}/analytics/quarters`, { params });
    return response.data;
  }
}

export const reportsService = new ReportsService();

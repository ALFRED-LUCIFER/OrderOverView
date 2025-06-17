import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { CustomersService } from '../customers/customers.service';
import { PdfService } from '../pdf/pdf.service';

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

@Injectable()
export class ReportsService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly customersService: CustomersService,
    private readonly pdfService: PdfService,
  ) {}

  async generateQuarterlyReport(year: number, quarter: number): Promise<QuarterlyReportData> {
    const quarters = {
      1: { start: new Date(year, 0, 1), end: new Date(year, 2, 31) },
      2: { start: new Date(year, 3, 1), end: new Date(year, 5, 30) },
      3: { start: new Date(year, 6, 1), end: new Date(year, 8, 30) },
      4: { start: new Date(year, 9, 1), end: new Date(year, 11, 31) },
    };

    const quarterDates = quarters[quarter];
    if (!quarterDates) {
      throw new Error('Invalid quarter. Must be 1, 2, 3, or 4');
    }

    const orders = await this.ordersService.findAll();
    const customers = await this.customersService.findAll();

    // Filter orders for the quarter
    const quarterOrders = orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= quarterDates.start && orderDate <= quarterDates.end;
    });

    const totalRevenue = quarterOrders.reduce((sum, order) => sum + order.totalPrice, 0);

    // Order statistics by status
    const ordersByStatus = quarterOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Order statistics by priority
    const ordersByPriority = quarterOrders.reduce((acc, order) => {
      acc[order.priority] = (acc[order.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top customers
    const customerStats = quarterOrders.reduce((acc, order) => {
      const customerId = order.customerId;
      if (!acc[customerId]) {
        const customer = customers.find(c => c.id === customerId);
        acc[customerId] = {
          customerId,
          customerName: customer?.name || 'Unknown',
          orderCount: 0,
          totalRevenue: 0,
        };
      }
      acc[customerId].orderCount++;
      acc[customerId].totalRevenue += order.totalPrice;
      return acc;
    }, {} as Record<string, any>);

    const topCustomers = Object.values(customerStats)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Top countries
    const countryStats = quarterOrders.reduce((acc, order) => {
      const customer = customers.find(c => c.id === order.customerId);
      const country = customer?.country || 'Unknown';
      if (!acc[country]) {
        acc[country] = { country, orderCount: 0, totalRevenue: 0 };
      }
      acc[country].orderCount++;
      acc[country].totalRevenue += order.totalPrice;
      return acc;
    }, {} as Record<string, any>);

    const topCountries = Object.values(countryStats)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Glass type distribution
    const glassTypeDistribution = quarterOrders.reduce((acc, order) => {
      acc[order.glassType] = (acc[order.glassType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Monthly trend
    const monthlyTrend = [];
    for (let month = 0; month < 3; month++) {
      const monthStart = new Date(year, (quarter - 1) * 3 + month, 1);
      const monthEnd = new Date(year, (quarter - 1) * 3 + month + 1, 0);
      
      const monthOrders = quarterOrders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'long' }),
        orders: monthOrders.length,
        revenue: monthOrders.reduce((sum, order) => sum + order.totalPrice, 0),
      });
    }

    return {
      quarter: `Q${quarter}`,
      year,
      totalOrders: quarterOrders.length,
      totalRevenue,
      ordersByStatus,
      ordersByPriority,
      topCustomers,
      topCountries,
      glassTypeDistribution,
      monthlyTrend,
    };
  }

  async generateCustomerReport(customerId: string): Promise<CustomerReportData> {
    const customer = await this.customersService.findOne(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const orders = await this.ordersService.findByCustomer(customerId);

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    const orderDates = orders.map(order => new Date(order.orderDate)).sort((a, b) => a.getTime() - b.getTime());
    const firstOrderDate = orderDates[0]?.toISOString() || '';
    const lastOrderDate = orderDates[orderDates.length - 1]?.toISOString() || '';

    // Order statistics by status
    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Order statistics by priority
    const ordersByPriority = orders.reduce((acc, order) => {
      acc[order.priority] = (acc[order.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Glass type preferences
    const glassTypePreferences = orders.reduce((acc, order) => {
      acc[order.glassType] = (acc[order.glassType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Monthly trend for the last 12 months
    const monthlyOrderTrend = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });

      monthlyOrderTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        orders: monthOrders.length,
        revenue: monthOrders.reduce((sum, order) => sum + order.totalPrice, 0),
      });
    }

    // Order details
    const orderDetails = orders.map(order => ({
      orderNumber: order.orderNumber,
      orderDate: order.orderDate.toISOString().split('T')[0], // Convert Date to string
      status: order.status.toString(),
      priority: order.priority.toString(),
      totalPrice: order.totalPrice,
      glassType: order.glassType.toString(),
      quantity: order.quantity,
    }));

    return {
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      country: customer.country,
      city: customer.city,
      totalOrders: orders.length,
      totalRevenue,
      averageOrderValue,
      firstOrderDate,
      lastOrderDate,
      ordersByStatus,
      ordersByPriority,
      glassTypePreferences,
      monthlyOrderTrend,
      orders: orderDetails,
    };
  }

  async generateQuarterlyReportPdf(year: number, quarter: number): Promise<Buffer> {
    const reportData = await this.generateQuarterlyReport(year, quarter);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Quarterly Report Q${quarter} ${year}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin: 20px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #1976d2; }
            .metric-label { font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .status-pending { color: #ed6c02; }
            .status-delivered { color: #2e7d32; }
            .status-cancelled { color: #d32f2f; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Glass Order Management System</h1>
            <h2>Quarterly Report - Q${quarter} ${year}</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="grid">
            <div class="metric-card">
              <div class="metric-value">${reportData.totalOrders}</div>
              <div class="metric-label">Total Orders</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">$${reportData.totalRevenue.toLocaleString()}</div>
              <div class="metric-label">Total Revenue</div>
            </div>
          </div>

          <div class="section">
            <h3>Order Status Distribution</h3>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(reportData.ordersByStatus).map(([status, count]) => `
                  <tr>
                    <td class="status-${status.toLowerCase()}">${status.replace(/_/g, ' ')}</td>
                    <td>${count}</td>
                    <td>${((count / reportData.totalOrders) * 100).toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>Top Customers by Revenue</h3>
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.topCustomers.map(customer => `
                  <tr>
                    <td>${customer.customerName}</td>
                    <td>${customer.orderCount}</td>
                    <td>$${customer.totalRevenue.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>Top Countries by Revenue</h3>
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.topCountries.map(country => `
                  <tr>
                    <td>${country.country}</td>
                    <td>${country.orderCount}</td>
                    <td>$${country.totalRevenue.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>Monthly Trend</h3>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.monthlyTrend.map(month => `
                  <tr>
                    <td>${month.month}</td>
                    <td>${month.orders}</td>
                    <td>$${month.revenue.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    return this.pdfService.generatePdf(htmlContent);
  }

  async generateCustomerReportPdf(customerId: string): Promise<Buffer> {
    const reportData = await this.generateCustomerReport(customerId);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Customer Report - ${reportData.customerName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin: 20px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0; }
            .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .metric-value { font-size: 20px; font-weight: bold; color: #1976d2; }
            .metric-label { font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .customer-info { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Glass Order Management System</h1>
            <h2>Customer Report</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="customer-info">
            <h3>${reportData.customerName}</h3>
            <p><strong>Email:</strong> ${reportData.customerEmail}</p>
            <p><strong>Location:</strong> ${reportData.city}, ${reportData.country}</p>
            <p><strong>Customer Since:</strong> ${new Date(reportData.firstOrderDate).toLocaleDateString()}</p>
            <p><strong>Last Order:</strong> ${new Date(reportData.lastOrderDate).toLocaleDateString()}</p>
          </div>

          <div class="grid">
            <div class="metric-card">
              <div class="metric-value">${reportData.totalOrders}</div>
              <div class="metric-label">Total Orders</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">$${reportData.totalRevenue.toLocaleString()}</div>
              <div class="metric-label">Total Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">$${reportData.averageOrderValue.toLocaleString()}</div>
              <div class="metric-label">Average Order Value</div>
            </div>
          </div>

          <div class="section">
            <h3>Order Status Distribution</h3>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(reportData.ordersByStatus).map(([status, count]) => `
                  <tr>
                    <td>${status.replace(/_/g, ' ')}</td>
                    <td>${count}</td>
                    <td>${((count / reportData.totalOrders) * 100).toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>Glass Type Preferences</h3>
            <table>
              <thead>
                <tr>
                  <th>Glass Type</th>
                  <th>Orders</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(reportData.glassTypePreferences).map(([type, count]) => `
                  <tr>
                    <td>${type}</td>
                    <td>${count}</td>
                    <td>${((count / reportData.totalOrders) * 100).toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>Recent Orders</h3>
            <table>
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Glass Type</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.orders.slice(0, 10).map(order => `
                  <tr>
                    <td>${order.orderNumber}</td>
                    <td>${new Date(order.orderDate).toLocaleDateString()}</td>
                    <td>${order.status.replace(/_/g, ' ')}</td>
                    <td>${order.glassType}</td>
                    <td>${order.quantity}</td>
                    <td>$${order.totalPrice.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    return this.pdfService.generatePdf(htmlContent);
  }
}

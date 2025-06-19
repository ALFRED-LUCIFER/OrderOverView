import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    // Check if customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: createOrderDto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${createOrderDto.customerId} not found`);
    }

    // Check if order number already exists
    const existingOrder = await this.prisma.order.findUnique({
      where: { orderNumber: createOrderDto.orderNumber },
    });

    if (existingOrder) {
      throw new Error(`Order number ${createOrderDto.orderNumber} already exists`);
    }

    return this.prisma.order.create({
      data: {
        ...createOrderDto,
        requiredDate: createOrderDto.requiredDate ? new Date(createOrderDto.requiredDate) : null,
      },
      include: {
        customer: true,
      },
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        orderDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        ...updateOrderDto,
        requiredDate: updateOrderDto.requiredDate ? new Date(updateOrderDto.requiredDate) : undefined,
      },
      include: {
        customer: true,
      },
    });
  }

  async remove(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return this.prisma.order.delete({
      where: { id },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        customer: true,
      },
      orderBy: {
        orderDate: 'desc',
      },
    });
  }

  async findByStatus(status: string) {
    return this.prisma.order.findMany({
      where: { status: status as any },
      include: {
        customer: true,
      },
      orderBy: {
        orderDate: 'desc',
      },
    });
  }

  async search(query: string) {
    return this.prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: query } },
          { notes: { contains: query } },
          { customer: { name: { contains: query } } },
          { customer: { company: { contains: query } } },
        ],
      },
      include: {
        customer: true,
      },
    });
  }

  async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Find the last order number for today
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${year}${month}${day}`,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `ORD-${year}${month}${day}-${String(sequence).padStart(3, '0')}`;
  }

  /**
   * Find the top 10 orders with maximum profit (highest total price)
   */
  async findTopMaximumProfitOrders(limit: number = 10) {
    return this.prisma.order.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        totalPrice: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get profit analytics and top performers
   */
  async getProfitAnalytics() {
    // Get all orders with profit calculation
    const orders = await this.prisma.order.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        totalPrice: 'desc',
      },
    });

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    
    // Get top 10 highest profit orders
    const topProfitOrders = orders.slice(0, 10);
    
    // Calculate average order value
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    // Get orders by status for profit analysis
    const profitByStatus = orders.reduce((acc, order) => {
      const status = order.status || 'UNKNOWN';
      if (!acc[status]) {
        acc[status] = { count: 0, totalRevenue: 0 };
      }
      acc[status].count++;
      acc[status].totalRevenue += order.totalPrice || 0;
      return acc;
    }, {} as Record<string, { count: number; totalRevenue: number }>);

    // Get top customers by revenue
    const customerRevenue = orders.reduce((acc, order) => {
      const customerId = order.customerId;
      const customerName = order.customer?.name || 'Unknown';
      if (!acc[customerId]) {
        acc[customerId] = { 
          customerName, 
          totalRevenue: 0, 
          orderCount: 0,
          customerId 
        };
      }
      acc[customerId].totalRevenue += order.totalPrice || 0;
      acc[customerId].orderCount++;
      return acc;
    }, {} as Record<string, any>);

    const topCustomers = Object.values(customerRevenue)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return {
      totalRevenue,
      totalOrders: orders.length,
      averageOrderValue,
      topProfitOrders,
      profitByStatus,
      topCustomers,
      lastUpdated: new Date().toISOString(),
    };
  }
}

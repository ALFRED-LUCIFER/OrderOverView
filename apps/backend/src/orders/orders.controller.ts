import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { MailerService } from '../mailer/mailer.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly mailerService: MailerService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async create(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    
    // Send order creation email notification
    try {
      await this.mailerService.sendOrderCreatedEmail({
        orderNumber: order.orderNumber,
        customerName: order.customer?.name,
        customerEmail: order.customer?.email || '',
        items: [
          {
            name: `${order.glassType} (${order.width}x${order.height}x${order.thickness}mm)`,
            quantity: order.quantity,
            price: order.unitPrice,
          }
        ],
        totalPrice: order.totalPrice,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        estimatedDelivery: order.requiredDate?.toISOString(),
        notes: order.notes,
      });
    } catch (error) {
      // Log email error but don't fail the order creation
      console.warn('Failed to send order creation email:', error);
    }

    return order;
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'List of all orders' })
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('generate-order-number')
  @ApiOperation({ summary: 'Generate a new order number' })
  @ApiResponse({ status: 200, description: 'Generated order number' })
  async generateOrderNumber() {
    const orderNumber = await this.ordersService.generateOrderNumber();
    return { orderNumber };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search orders' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  search(@Query('q') query: string) {
    return this.ordersService.search(query);
  }

  @Get('top-profit')
  @ApiOperation({ summary: 'Get top maximum profit orders' })
  @ApiQuery({ name: 'limit', description: 'Number of orders to return', required: false })
  @ApiResponse({ status: 200, description: 'Top profit orders' })
  findTopProfitOrders(@Query('limit') limit?: string) {
    const orderLimit = limit ? parseInt(limit, 10) : 10;
    return this.ordersService.findTopMaximumProfitOrders(orderLimit);
  }

  @Get('profit-analytics')
  @ApiOperation({ summary: 'Get comprehensive profit analytics' })
  @ApiResponse({ status: 200, description: 'Profit analytics data' })
  getProfitAnalytics() {
    return this.ordersService.getProfitAnalytics();
  }

  @Get('by-customer/:customerId')
  @ApiOperation({ summary: 'Get orders by customer ID' })
  @ApiResponse({ status: 200, description: 'Orders for the customer' })
  findByCustomer(@Param('customerId') customerId: string) {
    return this.ordersService.findByCustomer(customerId);
  }

  @Get('by-status/:status')
  @ApiOperation({ summary: 'Get orders by status' })
  @ApiResponse({ status: 200, description: 'Orders with the specified status' })
  findByStatus(@Param('status') status: string) {
    return this.ordersService.findByStatus(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    const previousOrder = await this.ordersService.findOne(id);
    const updatedOrder = await this.ordersService.update(id, updateOrderDto);
    
    // Send email notification for order update
    try {
      await this.mailerService.sendOrderUpdatedEmail({
        orderNumber: updatedOrder.orderNumber,
        customerName: updatedOrder.customer?.name,
        customerEmail: updatedOrder.customer?.email || '',
        items: [
          {
            name: `${updatedOrder.glassType} (${updatedOrder.width}x${updatedOrder.height}x${updatedOrder.thickness}mm)`,
            quantity: updatedOrder.quantity,
            price: updatedOrder.unitPrice,
          }
        ],
        totalPrice: updatedOrder.totalPrice,
        status: updatedOrder.status,
        createdAt: updatedOrder.createdAt.toISOString(),
        updatedAt: updatedOrder.updatedAt?.toISOString(),
        estimatedDelivery: updatedOrder.requiredDate?.toISOString(),
        notes: updatedOrder.notes,
      });

      // If status changed, send status change notification
      if (previousOrder.status !== updatedOrder.status) {
        await this.mailerService.sendOrderStatusChangeEmail({
          orderNumber: updatedOrder.orderNumber,
          customerName: updatedOrder.customer?.name,
          customerEmail: updatedOrder.customer?.email || '',
          items: [
            {
              name: `${updatedOrder.glassType} (${updatedOrder.width}x${updatedOrder.height}x${updatedOrder.thickness}mm)`,
              quantity: updatedOrder.quantity,
              price: updatedOrder.unitPrice,
            }
          ],
          totalPrice: updatedOrder.totalPrice,
          status: updatedOrder.status,
          createdAt: updatedOrder.createdAt.toISOString(),
          updatedAt: updatedOrder.updatedAt?.toISOString(),
          estimatedDelivery: updatedOrder.requiredDate?.toISOString(),
          notes: updatedOrder.notes,
        });
      }
    } catch (error) {
      // Log email error but don't fail the order update
      console.warn('Failed to send order update email:', error);
    }

    return updatedOrder;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @Post('test-email')
  @ApiOperation({ summary: 'Test email functionality' })
  @ApiResponse({ status: 200, description: 'Test email sent successfully' })
  async testEmail(@Body() body: { email: string; name?: string }) {
    try {
      const success = await this.mailerService.sendTestEmail(body.email);
      if (success) {
        return { message: 'Test email sent successfully', email: body.email };
      } else {
        return { message: 'Failed to send test email', email: body.email };
      }
    } catch (error) {
      return { message: 'Error sending test email', error: error.message };
    }
  }
}

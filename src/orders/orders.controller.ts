import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { SupabaseGuard } from '../auth/supabase.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateOrderDto } from './dto/create-order.dto'; 

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createOrder(
    @User() user: any, 
    @Body() orderData: CreateOrderDto
  ): Promise<Order> {
    // ✅ FIXED: Pass two arguments - orderData and buyerId
    return this.ordersService.createOrder(orderData, user.id);
  }

  @Get('my-orders')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyOrders(@User() user: any): Promise<Order[]> {
    return this.ordersService.findByBuyer(user.id);
  }

  @Get('my-sales')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user sales' })
  @ApiResponse({ status: 200, description: 'Sales retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMySales(@User() user: any): Promise<Order[]> {
    return this.ordersService.findBySeller(user.id);
  }

  @Get(':id')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(@Param('id') id: string): Promise<Order> {
    return this.ordersService.findById(id);
  }

  @Put(':id/status')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateStatus(
    @Param('id') id: string, 
    @Body() statusData: { status: string },
    @User() user: any // ✅ ADDED: Get user for permission check
  ): Promise<Order> {
    return this.ordersService.updateOrderStatus(id, statusData.status, user.id);
  }

  // ✅ ADDED: Additional endpoints for better UX
  
  @Put(':id/cancel')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel this order' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cancelOrder(
    @Param('id') id: string,
    @Body() cancelData: { reason?: string },
    @User() user: any
  ): Promise<Order> {
    return this.ordersService.cancelOrder(id, user.id, cancelData.reason);
  }

  @Put(':id/tracking')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add tracking information (seller only)' })
  @ApiResponse({ status: 200, description: 'Tracking added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addTracking(
    @Param('id') id: string,
    @Body() trackingData: { 
      tracking_number: string; 
      carrier: string; 
      estimated_delivery?: string; 
    },
    @User() user: any
  ): Promise<Order> {
    // This endpoint would be for sellers to add tracking
    return this.ordersService.addOrderTracking(id, trackingData);
  }

  @Get('stats/my-stats')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user order statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getMyStats(@User() user: any) {
    const [buyerStats, sellerStats] = await Promise.all([
      this.ordersService.getOrderStats(user.id, 'buyer'),
      this.ordersService.getOrderStats(user.id, 'seller'),
    ]);
    
    return {
      buyer: buyerStats,
      seller: sellerStats,
    };
  }
}
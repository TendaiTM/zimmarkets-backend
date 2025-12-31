import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service'; // ✅ ADDED
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly supabaseService: SupabaseService // ✅ ADDED
  ) {}

  async createOrder(orderData: CreateOrderDto, buyerId: string): Promise<Order> {
    const supabase = this.supabaseService.getClient();
    
    // 1. Get listing details to calculate total
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id, price_amount, title')
      .eq('id', orderData.listing_id)
      .eq('status', 'active')
      .single();

    if (listingError || !listing) {
      throw new BadRequestException('Listing not found or not available');
    }

    // 2. Calculate total (price * quantity)
    const quantity = orderData.quantity || 1;
    const totalAmount = listing.price_amount * quantity;

    // 3. Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: buyerId,
        seller_id: listing.seller_id,
        listing_id: orderData.listing_id,
        total_amount: totalAmount,
        currency: orderData.currency || 'USD',
        payment_method: orderData.payment_method,
        shipping_address: orderData.shipping_address,
        status: 'pending',
        order_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        buyer:buyer_id (*),
        seller:seller_id (*),
        listing:listing_id (*)
      `)
      .single();

    if (orderError) {
      throw new BadRequestException(`Failed to create order: ${orderError.message}`);
    }

    return order;
  }

  async findById(id: string): Promise<Order> {
    const supabase = this.supabaseService.getClient();
    
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:buyer_id (*),
        seller:seller_id (*),
        listing:listing_id (*)
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findByBuyer(buyerId: string): Promise<Order[]> {
    const supabase = this.supabaseService.getClient();
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        seller:seller_id (*),
        listing:listing_id (*)
      `)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch buyer orders: ${error.message}`);
    }

    return orders || [];
  }

  async findBySeller(sellerId: string): Promise<Order[]> {
    const supabase = this.supabaseService.getClient();
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:buyer_id (*),
        listing:listing_id (*)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch seller orders: ${error.message}`);
    }

    return orders || [];
  }

  async updateOrderStatus(id: string, status: string, userId?: string): Promise<Order> {
    const supabase = this.supabaseService.getClient();
    
    // First, get the order to check permissions
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('seller_id, buyer_id')
      .eq('id', id)
      .single();

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    // Check if user has permission (seller or buyer)
    if (userId && existingOrder.seller_id !== userId && existingOrder.buyer_id !== userId) {
      throw new BadRequestException('You do not have permission to update this order');
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        buyer:buyer_id (*),
        seller:seller_id (*),
        listing:listing_id (*)
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update order status: ${error.message}`);
    }

    return order;
  }


  async cancelOrder(id: string, userId: string, reason?: string): Promise<Order> {
    const supabase = this.supabaseService.getClient();
    
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending') // Can only cancel pending orders
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to cancel order: ${error.message}`);
    }

    return order;
  }

  async completeOrder(id: string, sellerId: string): Promise<Order> {
    const supabase = this.supabaseService.getClient();
    
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('seller_id', sellerId) // Only seller can mark as delivered
      .eq('status', 'shipped') // Can only complete shipped orders
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to complete order: ${error.message}`);
    }

    return order;
  }

  async getOrderStats(userId: string, userType: 'buyer' | 'seller'): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    totalRevenue: number;
  }> {
    const supabase = this.supabaseService.getClient();
    
    const column = userType === 'buyer' ? 'buyer_id' : 'seller_id';
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, total_amount')
      .eq(column, userId);

    if (error) {
      throw new BadRequestException(`Failed to get order stats: ${error.message}`);
    }

    if (!orders || orders.length === 0) {
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        totalRevenue: 0,
      };
    }

    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0),
    };

    return stats;
  }

  async addOrderTracking(id: string, trackingData: {
    tracking_number: string;
    carrier: string;
    estimated_delivery?: string;
  }): Promise<Order> {
    const supabase = this.supabaseService.getClient();
    
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingData.tracking_number,
        carrier: trackingData.carrier,
        estimated_delivery: trackingData.estimated_delivery,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to add tracking: ${error.message}`);
    }

    return order;
  }
}
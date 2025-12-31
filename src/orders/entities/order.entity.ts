import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Listing } from '../../listings/entities/listing.entity';

export class Order {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Buyer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  buyer_id: string;

  @ApiPropertyOptional({
    description: 'Buyer details',
    type: () => User,
  })
  buyer?: User;

  @ApiProperty({
    description: 'Seller ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  seller_id: string;

  @ApiPropertyOptional({
    description: 'Seller details',
    type: () => User,
  })
  seller?: User;

  @ApiProperty({
    description: 'Listing ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  listing_id: string;

  @ApiPropertyOptional({
    description: 'Listing details',
    type: () => Listing,
  })
  listing?: Listing;

  @ApiProperty({
    description: 'Order date',
    example: '2024-01-01T00:00:00.000Z',
  })
  order_date: string;

  @ApiProperty({
    description: 'Order status',
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    example: 'pending',
  })
  status: string;

  @ApiProperty({
    description: 'Total amount',
    example: 100.50,
  })
  total_amount: number;

  @ApiProperty({
    description: 'Currency',
    example: 'USD',
    default: 'USD',
  })
  currency: string;

  @ApiPropertyOptional({
    description: 'Payment method',
    example: 'ecocash',
  })
  payment_method?: string;

  @ApiPropertyOptional({
    description: 'Shipping address',
    example: '123 Main St, Harare, Zimbabwe',
  })
  shipping_address?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  transaction_id?: string;

  @ApiPropertyOptional({
    description: 'Tracking number',
    example: 'TRK123456789',
  })
  tracking_number?: string;

  @ApiPropertyOptional({
    description: 'Shipping carrier',
    example: 'ZimPost',
  })
  carrier?: string;

  @ApiPropertyOptional({
    description: 'Estimated delivery date',
    example: '2024-01-08T00:00:00.000Z',
  })
  estimated_delivery?: string;

  @ApiPropertyOptional({
    description: 'Actual delivery date',
    example: '2024-01-07T00:00:00.000Z',
  })
  delivered_at?: string;

  @ApiPropertyOptional({
    description: 'Shipment date',
    example: '2024-01-03T00:00:00.000Z',
  })
  shipped_at?: string;

  @ApiPropertyOptional({
    description: 'Cancellation reason',
    example: 'Changed mind',
  })
  cancellation_reason?: string;

  @ApiPropertyOptional({
    description: 'Cancelled by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  cancelled_by?: string;

  @ApiPropertyOptional({
    description: 'Cancellation timestamp',
    example: '2024-01-02T00:00:00.000Z',
  })
  cancelled_at?: string;

  @ApiPropertyOptional({
    description: 'Order notes',
    example: 'Please handle with care',
  })
  notes?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updated_at: string;
}
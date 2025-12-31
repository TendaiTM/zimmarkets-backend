import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, IsUUID } from 'class-validator';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Listing ID to purchase',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  listing_id: string;

  @ApiPropertyOptional({
    description: 'Quantity (defaults to 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({
    description: 'Payment method',
    example: 'ecocash',
    enum: ['ecocash', 'onemoney', 'bank_transfer', 'cash'],
  })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional({
    description: 'Shipping address',
    example: '123 Main St, Harare, Zimbabwe',
  })
  @IsOptional()
  @IsString()
  shipping_address?: string;

  @ApiPropertyOptional({
    description: 'Currency for payment',
    enum: ['USD', 'ZWL'],
    default: 'USD',
  })
  @IsOptional()
  @IsEnum(['USD', 'ZWL'])
  currency?: string = 'USD';

  @ApiPropertyOptional({
    description: 'Notes for the seller',
    example: 'Please package carefully',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New order status',
    enum: OrderStatus,
    example: OrderStatus.CONFIRMED,
  })
  @IsEnum(OrderStatus)
  status: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Changed my mind',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
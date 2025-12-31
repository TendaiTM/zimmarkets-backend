import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

export class Review {
  @ApiProperty({
    description: 'Review ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the user writing the review',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  reviewer_id: string;

  @ApiPropertyOptional({
    description: 'Details of the reviewer',
    type: () => User,
  })
  reviewer?: User;

  @ApiProperty({
    description: 'ID of the user being reviewed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  reviewee_id: string;

  @ApiPropertyOptional({
    description: 'Details of the reviewee',
    type: () => User,
  })
  reviewee?: User;

  @ApiProperty({
    description: 'ID of the order being reviewed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  order_id: string;

  @ApiPropertyOptional({
    description: 'Details of the order',
    type: () => Order,
  })
  order?: Order;

  @ApiProperty({
    description: 'Rating (1-5 stars)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  rating: number;

  @ApiPropertyOptional({
    description: 'Review comment',
    example: 'Great seller! Product arrived quickly and in perfect condition.',
    maxLength: 1000,
  })
  comment?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updated_at: Date;
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export class Bid {
  @ApiProperty({
    description: 'Bid ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Auction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  auction_id: string;

  @ApiProperty({
    description: 'Bidder ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  bidder_id: string;

  @ApiPropertyOptional({
    description: 'Bidder details',
    type: () => User,
  })
  bidder?: User;

  @ApiProperty({
    description: 'Bid amount',
    example: 175.50,
  })
  bid_amount: number;
  
  @ApiProperty({
    description: 'Bid currency',
    example: 'USD',
    default: 'USD',
  })
  bid_currency?: string; // CHANGE: Added to match database

  @ApiProperty({
    description: 'Bid timestamp',
    example: '2024-01-05T14:30:00.000Z',
  })
  bid_time: string; // CHANGE: Using bid_time (not created_at)
  
  @ApiProperty({
    description: 'Is winning bid?',
    example: false,
    default: false,
  })
  is_winning: boolean; // CHANGE: Added to match database

  @ApiPropertyOptional({
    description: 'Bid status (derived from is_winning)',
    enum: ['active', 'outbid', 'winning'],
    example: 'active',
  })
  status?: string; // CHANGE: Optional, can be derived from is_winning
}
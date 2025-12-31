//auction.entity
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Listing } from '../../listings/entities/listing.entity';

export class Auction {
  @ApiProperty({
    description: 'Auction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Listing ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  listing_id: string;

  @ApiProperty({
    description: 'Auction end time',
    example: '2024-01-07T23:59:59.000Z',
  })
  auction_end: string; // CHANGED: from 'end_time' to 'auction_end'

  @ApiProperty({
    description: 'Starting price',
    example: 100.00,
  })
  starting_price: number;

  @ApiPropertyOptional({
    description: 'Current highest bid',
    example: 175.50,
  })
  current_bid?: number; // CHANGED: from 'current_price' to 'current_bid'

  @ApiProperty({
    description: 'Number of bids placed',
    example: 5,
    default: 0,
  })
  bid_count: number;

  @ApiPropertyOptional({
    description: 'Winning bidder ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  winning_bidder_id?: string; // CHANGED: from 'winning_bid_id' to 'winning_bidder_id'

  @ApiProperty({
    description: 'Auction status',
    enum: ['active', 'ended', 'cancelled'],
    example: 'active',
  })
  status: string; // CHANGED: simplified status options

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

  @ApiPropertyOptional({
    description: 'Listing details',
    type: () => Listing,
  })
  listing?: Listing;

  // Calculated fields (added by service)
  @ApiPropertyOptional({
    description: 'Time remaining in milliseconds',
    example: 604800000, // 7 days
  })
  time_remaining?: number;

  @ApiPropertyOptional({
    description: 'Is auction ending soon? (less than 1 hour)',
    example: false,
  })
  ending_soon?: boolean;

  @ApiPropertyOptional({
    description: 'Is auction expired?',
    example: false,
  })
  is_expired?: boolean;

  @ApiPropertyOptional({
    description: 'Minutes remaining',
    example: 10080, // 7 days in minutes
  })
  minutes_remaining?: number;

  @ApiPropertyOptional({
    description: 'Hours remaining',
    example: 168, // 7 days in hours
  })
  hours_remaining?: number;

  @ApiPropertyOptional({
    description: 'Days remaining',
    example: 7,
  })
  days_remaining?: number;
}
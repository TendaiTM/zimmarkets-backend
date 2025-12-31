import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Bid {
  @ApiProperty({
    description: 'Bid ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Listing ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  listing_id: string;

  @ApiProperty({
    description: 'Bidder ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  bidder_id: string;

  @ApiProperty({
    description: 'Bid amount',
    example: 150.50,
  })
  amount: number;

  @ApiProperty({
    description: 'Bid status',
    enum: ['active', 'winning', 'lost', 'withdrawn'],
    example: 'active',
  })
  status: string;

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

  // ❌ REMOVED: @ManyToOne decorators
  // Relationships are handled via foreign keys in Supabase
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '../../categories/entities/category.entity'; // ✅ ADDED: Import Category
import { User } from '../../users/entities/user.entity';
import { Bid } from './bid.entity';

export class Listing {
  @ApiProperty({
    description: 'Listing ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

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
    description: 'Listing title',
    example: 'iPhone 13 Pro Max',
  })
  title: string;

  @ApiProperty({
    description: 'Detailed description',
    example: 'Brand new iPhone 13 Pro Max 256GB',
  })
  description: string;

  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  category: string;


  @ApiProperty({
    description: 'Item condition',
    enum: ['new', 'used', 'refurbished'],
    example: 'new',
  })
  condition: string;

  @ApiProperty({
    description: 'Price amount',
    example: 999.99,
  })
  price_amount: number;

  @ApiProperty({
    description: 'Price currency',
    example: 'USD',
    default: 'USD',
  })
  price_currency: string;

  @ApiProperty({
    description: 'Listing type',
    enum: ['fixed_price', 'auction'],
    example: 'fixed_price',
  })
  listing_type: string;

  @ApiProperty({
    description: 'Listing status',
    enum: ['active', 'sold', 'expired', 'draft'],
    example: 'active',
  })
  status: string;

  @ApiProperty({
    description: 'View count',
    example: 150,
    default: 0,
  })
  view_count: number;

  @ApiPropertyOptional({
    description: 'Auction end date',
    example: '2024-12-31T23:59:59.000Z',
  })
  auction_end?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Gweru',
  })
  city: string;

  @ApiPropertyOptional({
    description: 'Suburb',
    example: 'Mkoba',
  })
  suburb: string[];

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
    description: 'Listing images',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  image_urls:string[];

  @ApiPropertyOptional({
    description: 'Bids (for auction listings)',
    type: () => [Bid],
  })
  bids?: Bid[];

}
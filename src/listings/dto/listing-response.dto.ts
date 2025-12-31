import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

class ListingImageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  alt_text?: string;

  @ApiProperty()
  position: number;

  @ApiProperty()
  created_at: Date;
}

class CategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  slug?: string;
}

class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  avatar_url?: string;
}

export class ListingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  seller_id: string;

  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  seller: UserDto;

  @ApiProperty()
  category: string;

  @ApiProperty({ enum: ['new', 'used', 'refurbished'] })
  condition: string;

  @ApiProperty()
  price_amount: number;

  @ApiProperty()
  price_currency: string;

  @ApiProperty({ enum: ['auction', 'fixed_price'] })
  listing_type: string;

  @ApiPropertyOptional()
  auction_end?: Date;

  @ApiPropertyOptional()
  city: string;

  @ApiPropertyOptional()
  suburb: string;

  @ApiProperty()
  images: string[];

  @ApiProperty()
  views: number;

  @ApiProperty()
  featured: boolean;

  @ApiProperty()
  quantity: number;

  @ApiPropertyOptional()
  brand?: string;

  @ApiPropertyOptional()
  model?: string;

  @ApiProperty({ enum: ['draft', 'active', 'sold', 'expired', 'archived'] })
  status: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiPropertyOptional()
  @Expose()
  get is_auction(): boolean {
    return this.listing_type === 'auction';
  }

  @ApiPropertyOptional()
  @Expose()
  get is_active(): boolean {
    return this.status === 'active';
  }

  @Exclude()
  deleted_at?: Date;
}
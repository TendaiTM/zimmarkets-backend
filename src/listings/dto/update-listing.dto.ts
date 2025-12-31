// update-listing.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';

export class UpdateListingDto {
  @ApiPropertyOptional({ description: 'Listing title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Listing description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Price amount' })
  @IsNumber()
  @IsOptional()
  price_amount?: number;

  @ApiPropertyOptional({ description: 'Price amount' })
  @IsOptional()
  @IsString()
  price_currency?: string;

  @ApiPropertyOptional({ description: 'Product condition', enum: ['new', 'used', 'refurbished'] })
  @IsEnum(['new', 'used', 'refurbished'])
  @IsOptional()
  condition?: string;

  @ApiPropertyOptional({ description: 'Product category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Array of image URLs to replace existing images', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  image_urls?: string[];

  @ApiPropertyOptional({ description: 'Array of image URLs to delete from existing images', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imagesToDelete?: string[];

  @ApiPropertyOptional({ description: 'surburb information' })
  @IsOptional()
  suburb?: any;

  @ApiPropertyOptional({ description: 'surburb information' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Auction end date (for auction listings)' })
  @IsString()
  @IsOptional()
  auction_end?: string;

  @ApiPropertyOptional({ description: 'Listing status', enum: ['active', 'sold', 'expired', 'cancelled', 'draft'] })
  @IsEnum(['active', 'sold', 'expired', 'cancelled', 'draft'])
  @IsOptional()
  status?: 'active' | 'sold' | 'expired' | 'cancelled' | 'draft';

  @ApiPropertyOptional({ 
    description: 'Listing type', 
    enum: ['auction', 'fixed_price'] 
  })
  @IsEnum(['auction', 'fixed_price'])
  @IsOptional()
  listing_type?: 'auction' | 'fixed_price';
}

// pagination.dto.ts
export class PaginationDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
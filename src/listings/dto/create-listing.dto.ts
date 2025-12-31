import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsArray, 
  IsDate, 
  Min, 
  MaxLength,
  ValidateIf,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum Condition {
  NEW = 'new',
  USED = 'used',
  REFURBISHED = 'refurbished'
}

export enum ListingType {
  AUCTION = 'auction',
  FIXED_PRICE = 'fixed_price'
}

export class CreateListingDto {
  @ApiProperty({ 
    description: 'Listing title', 
    example: 'iPhone 13 Pro Max',
    maxLength: 200 
  })
  @IsString()
  @MaxLength(200)
  title: string;


  @ApiProperty({ 
    description: 'Detailed description', 
    example: 'Brand new iPhone 13 Pro Max 256GB',
    maxLength: 5000 
  })
  @IsString()
  @MaxLength(5000)
  description: string;


  @ApiProperty({ 
    description: 'Category ID', 
    example: 'Electronics' 
  })
  @IsString()
  category: string;

  @ApiProperty({ 
    enum: Condition, 
    description: 'Item condition' 
  })
  @IsEnum(Condition)
  condition: Condition;

  @ApiProperty({ 
    description: 'Price amount', 
    example: 999.99 
  })
  @IsNumber()
  price_amount: number;

  @ApiPropertyOptional({ 
    description: 'Currency code (default: USD)', 
    example: 'USD',
    default: 'USD'
  })
  @IsOptional()
  @IsString()
  price_currency?: string = 'USD';

  @ApiProperty({ 
    enum: ListingType, 
    description: 'Listing type(auction or fixed price)' 
  })
  @IsEnum(ListingType)
  listing_type: ListingType;

  @ApiPropertyOptional({ 
    description: 'Auction end date (required for auction listings)', 
    example: '2024-12-31T23:59:59Z' 
  })
  @IsOptional()
  @ValidateIf(o => o.listing_type === ListingType.AUCTION)
  @IsDate()
  @Type(() => Date)
  auction_end?: Date;

  @ApiPropertyOptional({ 
    description: 'City', 
    example: 'Gweru',
    type: [String]
  })
  @IsString({ each: true })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ 
    description: 'subrc ID', 
    example: 'Gweru',
    type: [String]
  })
  @IsString({ each: true })
  @IsOptional()
  suburb?: string;

  @ApiPropertyOptional({
    description: 'images',
    example: "https://example.com/image.jpg",
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  image_urls?: string[];
}
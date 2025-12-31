//create-auction.dto
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';

export class CreateAuctionDto {
  @ApiProperty({
    description: 'Listing ID to auction',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  listing_id: string;

  @ApiProperty({
    description: 'Auction start time (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  start_time: string;

  @ApiProperty({
    description: 'Auction end time (ISO 8601)',
    example: '2024-01-07T23:59:59.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  end_time: string;

  @ApiProperty({
    description: 'Starting price',
    example: 100.00,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  starting_price: number;

  @ApiPropertyOptional({
    description: 'Reserve price (minimum to sell)',
    example: 150.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reserve_price?: number;
}
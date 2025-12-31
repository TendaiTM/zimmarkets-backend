import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class PlaceBidDto {
  @ApiProperty({
    description: 'Bid amount',
    example: 175.50,
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  bid_amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string = 'USD'; // CHANGE: Set default value

  // CHANGE: Removed max_bid_amount if you don't need it
}
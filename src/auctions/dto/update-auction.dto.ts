//update-auction.dto
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';

export class UpdateAuctionDto {
  @ApiPropertyOptional({
    description: 'Auction status',
    enum: ['draft', 'active', 'ended', 'cancelled', 'completed'],
    example: 'active',
  })
  @IsOptional()
  @IsEnum(['draft', 'active', 'ended', 'cancelled', 'completed'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Reserve price',
    example: 200.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reserve_price?: number;

  @ApiPropertyOptional({
    description: 'End time (if extending auction)',
    example: '2024-01-10T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  end_time?: string;
}
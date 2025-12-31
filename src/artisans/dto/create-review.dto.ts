// src/artisans/dto/create-review.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsArray } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @ApiProperty({ example: 'Excellent work! Very professional.' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiPropertyOptional({ example: ['Punctual', 'Quality work', 'Good communication'] })
  @IsArray()
  @IsOptional()
  pros?: string[];

  @ApiPropertyOptional({ example: ['Slightly expensive'] })
  @IsArray()
  @IsOptional()
  cons?: string[];

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsOptional()
  serviceId?: string;
}
// src/artisans/dto/artisan-filter.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { EmploymentType } from './create-artisan.dto';

export class ArtisanFilterDto {
  @ApiPropertyOptional({ example: 'plumbing' })
  @IsString()
  @IsOptional()
  service?: string;

  @ApiPropertyOptional({ example: 'Harare' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Eastlea' })
  @IsString()
  @IsOptional()
  suburb?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsEnum(EmploymentType)
  @IsOptional()
  typeOfEmployment?: EmploymentType;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minExperience?: number;

  @ApiPropertyOptional({ example: 4.0 })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  isVerified?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'rating' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'rating';

  @ApiPropertyOptional({ example: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ example: ['plumbing', 'welding'] })
  @IsArray()
  @IsOptional()
  services?: string[];
}
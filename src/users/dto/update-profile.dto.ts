import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, IsUrl, IsObject } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Full name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  full_name?: string;

  @ApiPropertyOptional({
    description: 'User bio',
    example: 'I am a seller on ZimMarket',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsUrl()
  avatar_url?: string;

  @ApiPropertyOptional({
    description: 'Tax Identification Number (Zimbabwe)',
    example: '123456789A',
  })
  @IsOptional()
  @IsString()
  tax_id?: string;

  @ApiPropertyOptional({
    description: 'Business name (for business users)',
    example: 'John\'s Trading Store',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  business_name?: string;

  @ApiPropertyOptional({
    description: 'Bank details in JSON format',
    example: {
      bank_name: 'CBZ',
      account_number: '1234567890',
      branch_code: '12345',
    },
  })
  @IsOptional()
  @IsObject()
  bank_details?: Record<string, any>;
}
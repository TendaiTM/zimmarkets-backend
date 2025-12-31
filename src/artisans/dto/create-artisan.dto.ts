// src/artisans/dto/create-artisan.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsEnum, 
  IsNumber, 
  IsOptional, 
  IsBoolean, 
  IsEmail, 
  IsPhoneNumber, 
  IsArray, 
  ValidateNested,
  Min,
  Max,
  isString
} from 'class-validator';
import { Type } from 'class-transformer';
import { isStringOneByteRepresentation } from 'v8';

export enum EmploymentType {
  EMPLOYEE = 'employee',
  SELF_EMPLOYED = 'self_employed',
  BUSINESS_OWNER = 'business_owner'
}

export class LocationDto {
  @ApiProperty({ example: -17.824858 })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ example: 31.053028 })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}

export class ServiceDto {
  @ApiProperty({ example: 'Plumbing Installation' })
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @ApiProperty({ example: 'Plumbing' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: 'Expert plumbing installation services' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 25.00 })
  @IsNumber()
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 150.00 })
  @IsNumber()
  @IsOptional()
  fixedRate?: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class PortfolioImageDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiPropertyOptional({ example: 'Kitchen Plumbing Work' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Completed kitchen plumbing installation' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['plumbing', 'kitchen', 'installation'] })
  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class CreateArtisanDto {
  @ApiProperty({ example: 'John Doe Plumbing Services' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({ example: 'Experienced plumber with 10 years in the industry' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: EmploymentType, example: EmploymentType.SELF_EMPLOYED })
  @IsEnum(EmploymentType)
  @IsNotEmpty()
  typeOfEmployment: EmploymentType;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsOfExperience: number;

  @ApiPropertyOptional({ example: "Eastlea" })
  @IsOptional()
  @IsString()
  suburb: string

  @ApiProperty({ example: '123 Main Street, Harare' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Harare' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Zimbabwe' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: '+263771234567' })
  @IsPhoneNumber('ZW')
  phoneNumber: string;

  @ApiPropertyOptional({ example: '+263771234567' })
  @IsPhoneNumber('ZW')
  @IsOptional()
  whatsappNumber?: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ type: [ServiceDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  services?: ServiceDto[];

  @ApiPropertyOptional({ type: [PortfolioImageDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PortfolioImageDto)
  portfolioImages?: PortfolioImageDto[];
}
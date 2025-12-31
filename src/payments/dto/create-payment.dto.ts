import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min, IsString, IsOptional, IsEnum, IsPhoneNumber, Matches } from 'class-validator';

export class CreateMobileMoneyPaymentDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  order_id: string;

  @ApiProperty({
    description: 'Amount',
    example: 100.50,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Payment provider',
    enum: ['ecocash', 'onemoney', 'telecash'],
    example: 'ecocash',
  })
  @IsEnum(['ecocash', 'onemoney', 'telecash'])
  provider: string;

  @ApiProperty({
    description: 'Phone number',
    example: '0771234567',
  })
  @IsString()
  @Matches(/^(077|078|071|073)[0-9]{7}$/, {
    message: 'Please enter a valid Zimbabwean mobile number (077, 078, 071, or 073)',
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Currency',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Payment reference',
    example: 'MM-REF-12345',
  })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateBankTransferDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  order_id: string;

  @ApiProperty({
    description: 'Amount',
    example: 100.50,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Bank transfer reference',
    example: 'BANK-REF-12345',
  })
  @IsString()
  reference: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'CBZ',
  })
  @IsString()
  bankName: string;

  @ApiProperty({
    description: 'Account number',
    example: '1234567890',
  })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({
    description: 'Branch code',
    example: '12345',
  })
  @IsOptional()
  @IsString()
  branchCode?: string;

  @ApiPropertyOptional({
    description: 'Currency',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;
}
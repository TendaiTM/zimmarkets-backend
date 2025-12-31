import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export enum UserType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

export enum VerifiedStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export class CreateUserDto {
  @ApiProperty({
    description: 'Unique username',
    example: 'john_doe',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Username can only contain letters, numbers, dots, underscores, and hyphens',
  })
  username: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number (Zimbabwe format)',
    example: '+263771234567',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+263[0-9]{9}$/, {
    message: 'Phone number must be in Zimbabwe format (+263XXXXXXXXX)',
  })
  phone_number?: string;

  @ApiPropertyOptional({
    description: 'User type',
    enum: UserType,
    default: UserType.INDIVIDUAL,
  })
  @IsOptional()
  @IsEnum(UserType)
  user_type?: UserType;

  @ApiPropertyOptional({
    description: 'Password (for registration)',
    example: 'StrongPassword123!',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @Length(8, 100)
  password?: string;
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';

export class UserProfile {
  @ApiProperty({
    description: 'Profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  user_id: string;

  @ApiPropertyOptional({
    description: 'User entity',
    type: () => User,
  })
  user: User;

  @ApiPropertyOptional({
    description: 'Full name',
    example: 'John Doe',
  })
  full_name: string;

  @ApiPropertyOptional({
    description: 'Biography',
    example: 'I am a seller on ZimMarket',
  })
  bio: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatar_url: string;

  @ApiPropertyOptional({
    description: 'Tax Identification Number',
    example: '123456789A',
  })
  tax_id: string;

  @ApiPropertyOptional({
    description: 'Business name',
    example: 'John\'s Trading Store',
  })
  business_name: string;

  @ApiPropertyOptional({
    description: 'Bank details (JSON)',
    example: {
      bank_name: 'CBZ',
      account_number: '1234567890',
      branch_code: '12345',
    },
  })
  bank_details: any;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updated_at: Date;
}
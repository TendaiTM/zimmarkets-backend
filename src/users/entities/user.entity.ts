import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProfile } from './user-profile.entity';
import { UserType, VerifiedStatus } from '../dto/create-user.dto';


export class User {
  @ApiProperty({
    description: 'User ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Unique username',
    example: 'john_doe',
  })
  username: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+263771234567',
  })
  phone_number: string;

  @ApiProperty({
    description: 'User type',
    enum: UserType,
    example: UserType.INDIVIDUAL,
  })
  user_type: string;

  @ApiProperty({
    description: 'Verification status',
    enum: VerifiedStatus,
    example: VerifiedStatus.PENDING,
  })
  verified_status: string;

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

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  last_login: Date;

  @ApiPropertyOptional({
    description: 'User profile',
    type: () => UserProfile,
  })
  profile: UserProfile;
}
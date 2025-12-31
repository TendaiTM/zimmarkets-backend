import { IsEmail, IsString, MinLength, IsOptional, IsIn, IsUrl, MaxLength, IsNumber, Min, Max, isNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SignUpDto {
  @ApiProperty({ 
    example: 'John',
    description: 'User first name'
  })
  @IsString()
  first_name: string;


  @ApiProperty({ 
    example: 'Doe',
    description: 'User last name'
  })
  @IsString()
  last_name: string;


  @ApiProperty({ 
    example: 'user@example.com',
    description: 'User email address'
  })
  @IsEmail()
  email: string;


  @ApiProperty({ 
    example: 'securePassword123',
    description: 'User password (min 6 characters)'
  })
  @IsString()
  @MinLength(6)
  password: string;


  @ApiProperty({ 
    example: 'john_doe',
    description: 'Unique username'
  })
  @IsString()
  @MinLength(3)
  username: string;


  @ApiProperty({ 
    example: '+263771234567',
    required: false,
    description: 'Phone number (optional)'
  })
  @IsOptional()
  @IsString()
  phone_number?: string;


  @ApiProperty({ 
    example: 'individual',
    enum: ['individual', 'business'],
    required: false,
    description: 'Type of user account'
  })
  @IsOptional()
  @IsIn(['individual', 'business'])
  user_type?: 'individual' | 'business';



  @ApiProperty({ 
    example: 'https://example.com/avatar.jpg',
    required: false,
    description: 'User avatar URL (optional)'
  })
  @IsOptional()
  @IsUrl()
  avatar_url?: string;


  @ApiProperty({ 
    example: 'Software developer from Zimbabwe',
    required: false,
    description: 'User bio (optional)'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({ 
    example: 'Gweru',
    required: false,
    description: 'User city (optional)'
  })
  @IsOptional()
  @IsArray()
  city?: string;


  @ApiProperty({ 
    example: 'Kuwadzana',
    required: false,
    description: 'User suburb (optional)'
  })
  @IsOptional()
  @IsArray()
  suburb?: string;

  @ApiProperty({ 
    example: 'https://example.com',
    required: false,
    description: 'User website URL (optional)'
  })
  @IsOptional()
  @IsUrl()
  website_url?: string;


  @ApiProperty({ 
    example: '058947319X45',
    required: false,
    description: 'National Id (optional)'
  })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiProperty({ 
    example: 'Mukudzei Investment',
    required: false,
    description: 'Business name (optional)'
  })
  @IsOptional()
  @IsString()
  business_name?: string;

}

export class UpdateProfileDto {
  @ApiProperty({ 
    example: 'john_doe_updated',
    required: false,
    description: 'Username (optional)'
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiProperty({ 
    example: '+263771234568',
    required: false,
    description: 'Phone number (optional)'
  })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({ 
    example: 'business',
    enum: ['individual', 'business'],
    required: false,
    description: 'Type of user account (optional)'
  })
  @IsOptional()
  @IsIn(['individual', 'business'])
  user_type?: 'individual' | 'business';

  @ApiProperty({ 
    example: 'https://example.com/new-avatar.jpg',
    required: false,
    description: 'User avatar URL (optional)'
  })
  @IsOptional()
  @IsUrl()
  avatar_url?: string;

  @ApiProperty({ 
    example: 'Updated bio: Full-stack developer',
    required: false,
    description: 'User bio (optional)'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({ 
    example: 'Bulawayo',
    required: false,
    description: 'User  (optional)'
  })
  @IsOptional()
  @IsArray()
  city?: string;

  @ApiProperty({ 
    example: 'Nkulumane',
    required: false,
    description: 'User  (optional)'
  })
  @IsOptional()
  @IsArray()
  suburb?: string;

  @ApiProperty({ 
    example: 'https://myportfolio.com',
    required: false,
    description: 'User website URL (optional)'
  })
  @IsOptional()
  @IsUrl()
  website_url?: string;

  @ApiProperty({ 
    example: { twitter: '@updated_user', linkedin: 'in/updated' },
    required: false,
    description: 'Social media links (optional)'
  })
  @IsOptional()
  social_links?: Record<string, string>;

  @ApiProperty({ 
    example: 4.5,
    required: false,
    description: 'User rating (optional, 0-5)'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  rating?: number;
}
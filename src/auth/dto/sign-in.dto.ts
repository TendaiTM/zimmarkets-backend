import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'Registered email address'
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'securePassword123',
    description: 'Account password'
  })
  @IsNotEmpty()
  @MinLength(6)
  @IsString()
  password: string;
}
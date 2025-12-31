import { Controller, Get, Put, Body, UseGuards, Param, HttpStatus } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiBody 
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { SupabaseGuard } from '../auth/supabase.guard';
import { User } from '../common/decorators/user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(SupabaseGuard)
  @ApiOperation({ 
    summary: 'Get current authenticated user profile',
    description: 'Returns the complete profile of the currently authenticated user including profile details.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'User not authenticated',
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'User not found',
  })
  async getCurrentUser(@User() user: any) {
    return this.usersService.findById(user.id);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Retrieve user information by user ID (UUID)'
  })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'User retrieved successfully',
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'User not found',
  })
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put('profile')
  @UseGuards(SupabaseGuard)
  @ApiOperation({ 
    summary: 'Update user profile',
    description: 'Update the profile information for the currently authenticated user'
  })
  @ApiBody({
    type: UpdateProfileDto,
    description: 'Profile data to update',
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Profile updated successfully',
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'User not authenticated',
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid profile data',
  })
  async updateProfile(@User() user: any, @Body() profileData: UpdateProfileDto) {
    return this.usersService.createOrUpdateProfile(user.id, profileData);
  }
}
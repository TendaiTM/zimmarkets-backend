import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  UseGuards,
  Get,
  Req,
  BadRequestException,
  UnauthorizedException,
  Put
} from '@nestjs/common';
import { 
  ApiTags,
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody 
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SupabaseGuard } from './supabase.guard';
import { SignUpDto, UpdateProfileDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from 'src/common/decorators/public.decorator';


@ApiTags('auth')
@Controller('auth')
@UseGuards(SupabaseGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully registered' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid input' 
  })
  @ApiBody({ type: SignUpDto })
  async signUp(@Body() signUpDto: SignUpDto) {
    try {
      return await this.authService.signUp(
        signUpDto.email,
        signUpDto.password,
        {
          firstName: signUpDto.first_name,
          lastName: signUpDto.last_name,
          username: signUpDto.username,
          phone_number: signUpDto.phone_number,
          user_type: signUpDto.user_type || 'individual',
          avatar_url: signUpDto.avatar_url,
          bio: signUpDto.bio,
          city: signUpDto.city,
          suburb: signUpDto.suburb,
          website_url: signUpDto.website_url,
          business_name: signUpDto.business_name,
          nationalId: signUpDto.nationalId,
        }
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('signin')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully logged in' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid credentials' 
  })
  @ApiBody({ type: SignInDto })
  async signIn(@Body() signInDto: SignInDto) {
    try {
      return await this.authService.signIn(
        signInDto.email,
        signInDto.password
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user (requires authentication)' })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully logged out' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid token' 
  })
  async signOut(@Req() req) {
    try {
      return await this.authService.signOut();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile (requires authentication)' })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid token' 
  })
  async getProfile(@Req() req) {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedException('User not authenticated');
      }

      const userId = req.user.id;
      return await this.authService.getUserProfile(userId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to get profile');
    }
  }

  // ✅ NEW: Update profile endpoint
  @Put('profile')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile (requires authentication)' })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile updated successfully' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid token' 
  })
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(@Req() req, @Body() updateProfileDto: UpdateProfileDto) {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedException('User not authenticated');
      }

      const userId = req.user.id;
      return await this.authService.updateUserProfile(userId, updateProfileDto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to update profile');
    }
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid input' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid refresh token' 
  })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      return await this.authService.refreshSession(refreshTokenDto.refresh_token);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to refresh token');
    }
  }
}
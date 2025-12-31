import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { SupabaseGuard } from '../auth/supabase.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { RatingSummaryDto } from './dto/rating-summary.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({ 
    status: 201, 
    description: 'Review created successfully', 
    type: Review 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Review already exists for this order' 
  })
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @User() user: any, 
    @Body() createReviewDto: CreateReviewDto
  ): Promise<Review> {
    return this.reviewsService.createReview({
      ...createReviewDto,
      reviewer_id: user.id
    });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get reviews for a user' })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to get reviews for', 
    example: '123e4567-e89b-12d3-a456-426614174000' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of reviews for the user', 
    type: [Review] 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  async getUserReviews(@Param('userId') userId: string): Promise<Review[]> {
    return this.reviewsService.findByReviewee(userId);
  }

  @Get('my-reviews')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reviews written by current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of reviews written by current user', 
    type: [Review] 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  async getMyReviews(@User() user: any): Promise<Review[]> {
    return this.reviewsService.findByReviewer(user.id);
  }

  @Get('user/:userId/rating')
  @ApiOperation({ summary: 'Get user rating summary' })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to get rating for', 
    example: '123e4567-e89b-12d3-a456-426614174000' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User rating summary', 
    type: RatingSummaryDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  async getUserRating(@Param('userId') userId: string): Promise<RatingSummaryDto> {
    return this.reviewsService.getUserRating(userId);
  }

  @Put(':id')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update review' })
  @ApiParam({ 
    name: 'id', 
    description: 'Review ID to update', 
    example: '123e4567-e89b-12d3-a456-426614174000' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Review updated successfully', 
    type: Review 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - you can only update your own reviews' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Review not found' 
  })
  async updateReview(
    @Param('id') id: string, 
    @Body() updateReviewDto: UpdateReviewDto,
    @User() user: any
  ): Promise<Review> {
    return this.reviewsService.updateReview(id, updateReviewDto, user.id);
  }

  @Delete(':id')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete review' })
  @ApiParam({ 
    name: 'id', 
    description: 'Review ID to delete', 
    example: '123e4567-e89b-12d3-a456-426614174000' 
  })
  @ApiResponse({ 
    status: 204, 
    description: 'Review deleted successfully' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - you can only delete your own reviews' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Review not found' 
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(
    @Param('id') id: string,
    @User() user: any
  ): Promise<void> {
    return this.reviewsService.deleteReview(id, user.id);
  }
}
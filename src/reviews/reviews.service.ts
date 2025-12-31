import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto'; // ✅ ADD THIS IMPORT
import { RatingSummaryDto } from './dto/rating-summary.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly supabaseService: SupabaseService
  ) {}

  private getSupabaseClient() {
    return this.supabaseService.getClient();
  }

  async createReview(reviewData: any): Promise<any> {
    const supabase = this.getSupabaseClient();
    
    // Check if review already exists for this order
    if (reviewData.order_id && reviewData.reviewer_id) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', reviewData.order_id)
        .eq('reviewer_id', reviewData.reviewer_id)
        .maybeSingle();

      if (existingReview) {
        throw new BadRequestException('You have already reviewed this order');
      }
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        ...reviewData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        reviewer:users!reviewer_id(*),
        reviewee:users!reviewee_id(*)
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create review: ${error.message}`);
    }

    return review;
  }

  async findByReviewee(revieweeId: string): Promise<any[]> {
    const supabase = this.getSupabaseClient();
    
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:users!reviewer_id(*)
      `)
      .eq('reviewee_id', revieweeId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch reviews: ${error.message}`);
    }

    return reviews || [];
  }

  async findByReviewer(reviewerId: string): Promise<any[]> {
    const supabase = this.getSupabaseClient();
    
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewee:users!reviewee_id(*)
      `)
      .eq('reviewer_id', reviewerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch reviews: ${error.message}`);
    }

    return reviews || [];
  }

  async getUserRating(userId: string): Promise<RatingSummaryDto> {
    const supabase = this.getSupabaseClient(); // ✅ FIXED: Use getSupabaseClient()
    
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId);

    if (error) {
      throw new BadRequestException(`Failed to fetch user rating: ${error.message}`);
    }

    if (!reviews || reviews.length === 0) {
      return {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    const average = total / reviews.length;

    // Calculate distribution
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      distribution[review.rating] = (distribution[review.rating] || 0) + 1;
    });

    // Calculate percentages
    const percentages: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      percentages[i] = parseFloat(((distribution[i] / reviews.length) * 100).toFixed(1));
    }

    return {
      average: parseFloat(average.toFixed(2)),
      count: reviews.length,
      distribution,
      percentages,
    };
  }

  async updateReview(
    id: string, 
    updateReviewDto: UpdateReviewDto, 
    userId: string
  ): Promise<any> {
    const supabase = this.getSupabaseClient(); // ✅ FIXED: Use getSupabaseClient()
    
    // Check if review exists and belongs to user
    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewer_id !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updateData = {
      ...updateReviewDto,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedReview, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        reviewer:users!reviewer_id(*),
        reviewee:users!reviewee_id(*)
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update review: ${error.message}`);
    }

    return updatedReview;
  }

  async deleteReview(id: string, userId: string): Promise<void> {
    const supabase = this.getSupabaseClient(); // ✅ FIXED: Use getSupabaseClient()
    
    // Check if review exists and belongs to user
    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewer_id !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(`Failed to delete review: ${error.message}`);
    }
  }
}
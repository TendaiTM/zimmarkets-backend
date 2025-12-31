import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private jwtService: JwtService,
  ) {}

  private getSupabaseClient(): SupabaseClient {
    return this.supabaseService.getClient();
  }

  async signUp(email: string, password: string, userData: any) {
    const supabase = this.getSupabaseClient();

    // Validate input
    if (!email || !password || !userData.username) {
      throw new BadRequestException('Email, password, and username are required');
    }

    const { data: emailCheck } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    const { data: usernameCheck } = await supabase
      .from('users')
      .select('username')
      .eq('username', userData.username)
      .maybeSingle();

    if (emailCheck) {
      throw new BadRequestException('User with this email already exists');
    }
    if (usernameCheck) {
      throw new BadRequestException('Username already taken');
    }
  
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: userData.username,
          user_type: userData.user_type || 'individual',
          avatar_url: userData.avatar_url || null,
          first_name: userData.firstName || null,
          last_name: userData.lastName || null,
        },
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
      },
    });

    if (authError) {
      throw new BadRequestException(`Signup failed: ${authError.message}`);
    }

    // Create user record in public.users table with all fields
    if (authData.user) {
      const userRecord = {
        id: authData.user.id,
        first_name: userData.firstName,
        last_name: userData.lastName,
        username: userData.username,
        email: authData.user.email,
        phone_number: userData.phone_number || null,
        user_type: userData.user_type || 'individual',
        verified_status: 'pending' as const,
        avatar_url: userData.avatar_url || null,
        bio: userData.bio || null,
        city: userData.city || null,
        suburb: userData.suburb || null,
        website_url: userData.website_url || null,
        rating: null, // Start with null, calculated later from reviews
        business_name: userData.business_name || null,
        nationalId: userData.nationalId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from('users')
        .insert(userRecord);

      if (dbError) {
        // Rollback: delete the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new BadRequestException(`Failed to create user profile: ${dbError.message}`);
      }
    }
    
    // Remove sensitive data from response
    const { user, session } = authData;
    return {
      user: {
        id: user?.id,
        email: user?.email,
        first_name: userData.firstName || null,
        last_name:userData.lastName || null,
        username: userData.username,
        user_type: userData.user_type || 'individual',
        avatar_url: userData.avatar_url || null,
        phone_number: userData.phone_number || null,
        city: userData.city || null,
        suburb: userData.suburb || null,
      },
      session: session ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      } : null,
      message: 'User registered successfully. Please check your email for verification.',
    };
  }

  async signIn(email: string, password: string) {
    const supabase = this.getSupabaseClient();

    // Validate input
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login in your public.users table
    await supabase
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.user.id);

    // Generate your own JWT token for your API
    const token = this.generateToken(data.user);

    // Get full user profile
    const userProfile = await this.getUserProfile(data.user.id);

    return {
      user: userProfile,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      token,
    };
  }

  async signOut() {
    const supabase = this.getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new BadRequestException(`Sign out error: ${error.message}`);
    return { 
      success: true,
      message: 'Successfully logged out'
    };
  }

  async getUser(token: string) {
    const supabase = this.getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Supabase getUser error:', error?.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }

  async getUserProfile(userId: string) {
    const supabase = this.getSupabaseClient();

    const { data: user, error } = await supabase
        .from('users')
        .select(`
          id,
          username,
          email,
          phone_number,
          user_type,
          verified_status,
          avatar_url,
          bio,
          rating,
          created_at,
          last_login
        `)
        .eq('id', userId)
        .single();

    if (error) {
      console.error('Database error:', error);
      throw new NotFoundException('User profile not found in database');
    }

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // ✅ Calculate rating from reviews if not already calculated
    // This assumes you have a reviews table with a rating column
    if (user.rating === null) {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('user_id', userId);

      if (reviews && reviews.length > 0) {
        const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        
        // Update the user's rating in the database
        await supabase
          .from('users')
          .update({ 
            rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        user.rating = Math.round(averageRating * 10) / 10;
      }
    }

    return user;
  }

  async getUserByToken(token: string) {
    const supabase = this.getSupabaseClient();
    
    // Validate the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Token validation failed:', error?.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
    
    // Return minimal user info for the guard
    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    };
  }

  // ✅ NEW: Update user profile
  async updateUserProfile(userId: string, updateData: UpdateProfileDto) {
    const supabase = this.getSupabaseClient();

    try {
      // Build update object with only provided fields
      const updateObject: any = {
        updated_at: new Date().toISOString(),
      };

      // Add only the fields that are provided
      if (updateData.username !== undefined) updateObject.username = updateData.username;
      if (updateData.phone_number !== undefined) updateObject.phone_number = updateData.phone_number;
      if (updateData.user_type !== undefined) updateObject.user_type = updateData.user_type;
      if (updateData.avatar_url !== undefined) updateObject.avatar_url = updateData.avatar_url;
      if (updateData.bio !== undefined) updateObject.bio = updateData.bio;
      if (updateData.city !== undefined) updateObject.city = updateData.city;
      if (updateData.suburb !== undefined) updateObject.suburb = updateData.suburb;
      if (updateData.website_url !== undefined) updateObject.website_url = updateData.website_url;
      if (updateData.social_links !== undefined) updateObject.social_links = updateData.social_links;
      if (updateData.rating !== undefined) updateObject.rating = updateData.rating;

      // Also update Supabase auth metadata for username and avatar
      if (updateData.username !== undefined || updateData.avatar_url !== undefined) {
        const authUpdateData: any = {};
        if (updateData.username !== undefined) authUpdateData.username = updateData.username;
        if (updateData.avatar_url !== undefined) authUpdateData.avatar_url = updateData.avatar_url;
        
        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: authUpdateData
        });

        if (authUpdateError) {
          console.error('Failed to update auth metadata:', authUpdateError);
        }
      }

      // Update the user in the database
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateObject)
        .eq('id', userId)
        .select(`
          id,
          username,
          email,
          phone_number,
          user_type,
          verified_status,
          avatar_url,
          bio,
          city,
          suburb,
          rating,
          created_at,
          last_login
        `)
        .single();

      if (updateError) {
        throw new BadRequestException(`Failed to update profile: ${updateError.message}`);
      }

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return {
        user: updatedUser,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      console.error('Update profile error:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update user profile');
    }
  }

  async refreshSession(refreshToken: string) {
    const supabase = this.getSupabaseClient();

    // Validate input
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    try {
      const { data, error } = await supabase.auth.refreshSession({ 
        refresh_token: refreshToken 
      });

      if (error) {
        console.error('Refresh token error:', error.message);
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (!data.session) {
        throw new UnauthorizedException('Failed to refresh session');
      }

      // Update the user's updated_at timestamp
      await supabase
        .from('users')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', data.session.user.id);

      // Generate a new custom JWT token
      const newToken = this.generateToken(data.session.user);

      // Get updated user profile
      const userProfile = await this.getUserProfile(data.session.user.id);

      return {
        user: userProfile,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
        },
        token: newToken,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      console.error('Refresh session error:', error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to refresh session. Please sign in again.');
    }
  }

  // Optional: Add password reset functionality
  async resetPassword(email: string) {
    const supabase = this.getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
    });
    
    if (error) {
      throw new BadRequestException(`Password reset failed: ${error.message}`);
    }
    
    return { 
      success: true, 
      message: 'Password reset email sent' 
    };
  }

  private generateToken(user: any): string {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.user_metadata?.username,
      user_type: user.user_metadata?.user_type || 'individual',
      avatar_url: user.user_metadata?.avatar_url,
    };
    return this.jwtService.sign(payload);
  }

  // Optional: Verify custom JWT token
  verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
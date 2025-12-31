import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface User {
  id: string;
  username: string;
  email: string;
  phone_number?: string;
  user_type: string;
  verified_status: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  user_profiles?: UserProfile;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  tax_id?: string;
  business_name?: string;
  bank_details?: any;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class UsersService {
  constructor(private supabaseService: SupabaseService) {}

  async findById(id: string): Promise<any> {
    const supabase = this.supabaseService.getClient();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<any> {
    const supabase = this.supabaseService.getClient();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return null;
    return user;
  }

  async updateUser(id: string, updateData: any): Promise<any> {
    const supabase = this.supabaseService.getClient();
    
    const updatePayload = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    // FIX: Add type assertion
    const { data: user, error } = await supabase
      .from('users')
      .update(updatePayload as any) // <- Add "as any" here
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return user;
  }

  async createOrUpdateProfile(userId: string, profileData: any): Promise<any> {
    const supabase = this.supabaseService.getClient();
    
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw fetchError;
    }

    if (existingProfile) {
      // Update existing profile
      const updatePayload = {
        ...profileData,
        updated_at: new Date().toISOString(),
      };

      const { data: profile, error } = await supabase
        .from('users')
        .update(updatePayload as any) // <- Add "as any" here
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (error) throw error;
      return profile;
    } else {
      // Create new profile
      const insertPayload = {
        user_id: userId,
        ...profileData,
      };

      // FIX: Add type assertion for insert
      const { data: profile, error } = await supabase
        .from('users')
        .insert([insertPayload] as any) // <- Add "as any" here
        .select()
        .single();

      if (error) throw error;
      return profile;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    // FIX: Add type assertion
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() } as any) // <- Add "as any" here
      .eq('id', userId);
  }
}
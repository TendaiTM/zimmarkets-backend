import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient;
  private adminClientInstance: SupabaseClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeClients();
  }

  private initializeClients() {
    try {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
      const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

      // Basic validation for required keys[citation:3]
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required in environment variables.');
      }

      this.clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false, // Typically false for server-side
          persistSession: false,
        },
      });

      if (supabaseServiceKey) {
        this.adminClientInstance = createClient(supabaseUrl, supabaseServiceKey);
        this.logger.log('Supabase admin client initialized');
      }

      this.logger.log('Supabase clients initialized successfully');
    } catch (error: any) {
      // Log the full error for debugging
      this.logger.error(`Failed to initialize Supabase clients. URL/Key correct? Error: ${error.message}`);
      // Re-throw to prevent app from starting with a broken dependency
      throw error;
    }
  }

  getClient(): SupabaseClient {
    if (!this.clientInstance) {
      throw new Error('Supabase client accessed before initialization was complete.');
    }
    return this.clientInstance;
  }

  getAdminClient(): SupabaseClient {
    if (!this.adminClientInstance) {
      throw new Error('Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY.');
    }
    return this.adminClientInstance;
  }
}
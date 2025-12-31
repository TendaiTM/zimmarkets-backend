import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller'
import { SupabaseGuard } from './supabase.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Global()
@Module({
  imports: [
    SupabaseModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SupabaseService, SupabaseGuard],
  exports: [AuthService, SupabaseGuard, JwtModule],
})
export class AuthModule {}
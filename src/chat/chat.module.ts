import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SupabaseModule, 
    AuthModule,     
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
  ],
  exports: [ChatService], // Export if other modules need to use ChatService
})
export class ChatModule {}
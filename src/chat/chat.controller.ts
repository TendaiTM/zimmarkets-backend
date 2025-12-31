import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SupabaseGuard } from '../auth/supabase.guard';

// DTOs for Swagger documentation
class StartConversationDto {
  @ApiProperty({
    description: 'ID of the user to start conversation with',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  receiver_id: string;

  @ApiProperty({
    description: 'Initial message (defaults to "Hi")',
    example: 'Hello!',
    required: false,
  })
  message?: string;
}

class SendMessageDto {
  @ApiProperty({
    description: 'ID of the conversation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  conversation_id: string;

  @ApiProperty({
    description: 'Message content',
    example: 'How are you?',
  })
  content: string;
}

class ConversationResponse {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Other user information',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      online: true,
    },
  })
  other_user: {
    id: string;
    name: string;
    avatar: string;
    online: boolean;
  };

  @ApiProperty({
    description: 'Last message in conversation',
    example: {
      content: 'See you tomorrow!',
      created_at: '2024-01-15T10:30:00.000Z',
      sender: {
        name: 'John Doe',
        avatar: 'https://example.com/avatar.jpg',
      },
    },
  })
  last_message: {
    content: string;
    created_at: string;
    sender: {
      name: string;
      avatar: string;
    };
  };

  @ApiProperty({
    description: 'Number of unread messages',
    example: 3,
  })
  unread_count: number;

  @ApiProperty({
    description: 'When conversation was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  updated_at: string;
}

class MessageResponse {
  @ApiProperty({
    description: 'Message ID',
    example: 'msg_123456789',
  })
  id: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello there!',
  })
  content: string;

  @ApiProperty({
    description: 'Sender information',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'johndoe',
      full_name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg',
    },
  })
  sender: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };

  @ApiProperty({
    description: 'When message was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'List of user IDs who have read the message',
    example: ['user1', 'user2'],
  })
  read_by: string[];
}

class MessagesListResponse {
  @ApiProperty({
    description: 'List of messages',
    type: [MessageResponse],
  })
  messages: MessageResponse[];

  @ApiProperty({
    description: 'Whether there are more messages to load',
    example: true,
  })
  has_more: boolean;
}

@ApiTags('Chat') // Groups all endpoints under "Chat" in Swagger
@ApiBearerAuth() // Indicates this controller uses Bearer token authentication
@Controller('chat')
@UseGuards(SupabaseGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations/start')
  @ApiOperation({
    summary: 'Start a new conversation',
    description: 'Starts a conversation with another user. Sends "Hi" by default or custom message.',
  })
  @ApiBody({
    type: StartConversationDto,
    description: 'Receiver ID and optional initial message',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation started successfully',
    type: ConversationResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid receiver ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async startConversation(
    @Req() req,
    @Body() body: { receiver_id: string; message?: string }
  ) {
    const senderId = req.user.sub;
    return this.chatService.startConversation(
      senderId,
      body.receiver_id,
      body.message || "Hi"
    );
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Get all user conversations',
    description: 'Returns a list of all conversations for the authenticated user, similar to Facebook Messenger sidebar.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of conversations retrieved successfully',
    type: [ConversationResponse],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getConversations(@Req() req) {
    const userId = req.user.sub;
    return this.chatService.getUserConversations(userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Get messages in a conversation',
    description: 'Retrieves messages from a specific conversation with pagination. Automatically marks messages as read when fetched.',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of messages to return (default: 50)',
    example: 50,
  })
  @ApiQuery({
    name: 'before',
    required: false,
    description: 'Get messages created before this timestamp (ISO format)',
    example: '2024-01-15T10:30:00.000Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: MessagesListResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found or user does not have access',
  })
  async getMessages(
    @Param('id') conversationId: string,
    @Req() req,
    @Query('limit') limit = 50,
    @Query('before') before?: string
  ) {
    const userId = req.user.sub;
    return this.chatService.getMessages(conversationId, userId, +limit, before);
  }

  @Post('messages')
  @ApiOperation({
    summary: 'Send a message',
    description: 'Sends a message to an existing conversation.',
  })
  @ApiBody({
    type: SendMessageDto,
    description: 'Conversation ID and message content',
  })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: MessageResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid conversation ID or empty message',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found or user does not have access',
  })
  async sendMessage(
    @Req() req,
    @Body() body: { conversation_id: string; content: string }
  ) {
    const userId = req.user.sub;
    return this.chatService.sendMessage({
      conversation_id: body.conversation_id,
      sender_id: userId,
      content: body.content
    });
  }

  @Post('conversations/:id/read')
  @ApiOperation({
    summary: 'Mark conversation as read',
    description: 'Marks all messages in a conversation as read for the current user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation marked as read successfully',
    schema: {
      example: {
        success: true,
        message: 'Conversation marked as read',
        read_at: '2024-01-15T10:35:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found or user does not have access',
  })
  async markAsRead(@Param('id') conversationId: string, @Req() req) {
    const userId = req.user.sub;
    return this.chatService.markConversationAsRead(conversationId, userId);
  }
}
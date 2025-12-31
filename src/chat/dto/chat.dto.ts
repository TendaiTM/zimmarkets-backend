import { ApiProperty } from '@nestjs/swagger';

// DTO for starting a conversation
export class StartConversationDto {
  @ApiProperty({
    description: 'ID of the user to start conversation with',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: true,
  })
  receiver_id: string;

  @ApiProperty({
    description: 'Initial message (defaults to "Hi")',
    example: 'Hello there!',
    required: false,
    default: 'Hi',
  })
  message?: string;
}

// DTO for sending a message
export class SendMessageDto {
  @ApiProperty({
    description: 'ID of the conversation',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  conversation_id: string;

  @ApiProperty({
    description: 'Message content',
    example: 'How are you doing today?',
    required: true,
    minLength: 1,
  })
  content: string;
}

// DTO for marking as read
export class MarkAsReadDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  conversation_id: string;
}

// Response DTOs
export class UserInfoDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatar: string;

  @ApiProperty({ example: true })
  online: boolean;
}

export class LastMessageDto {
  @ApiProperty({ example: 'Hello there!' })
  content: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  created_at: string;

  @ApiProperty({ type: UserInfoDto })
  sender: UserInfoDto;
}

export class ConversationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ type: UserInfoDto })
  other_user: UserInfoDto;

  @ApiProperty({ type: LastMessageDto, nullable: true })
  last_message: LastMessageDto | null;

  @ApiProperty({ example: 3 })
  unread_count: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updated_at: string;
}

export class MessageDto {
  @ApiProperty({ example: 'msg_123456789' })
  id: string;

  @ApiProperty({ example: 'How are you?' })
  content: string;

  @ApiProperty({ type: UserInfoDto })
  sender: UserInfoDto;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  created_at: string;

  @ApiProperty({ example: ['user1', 'user2'] })
  read_by: string[];
}

export class MessagesListDto {
  @ApiProperty({ type: [MessageDto] })
  messages: MessageDto[];

  @ApiProperty({ example: true })
  has_more: boolean;
}
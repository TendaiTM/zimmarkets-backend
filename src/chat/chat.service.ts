import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import {
    ConversationDto,
    LastMessageDto,
    UserInfoDto,
    MessageDto,
    MessagesListDto
} from './dto/chat.dto'


@Injectable()
export class ChatService {
  constructor(
    private readonly supabaseService: SupabaseService
) {}

  async startConversation(senderId: string, receiverId: string, initialMessage = "Hi") {
    const supabase = this.supabaseService.getClient();
    const existingConversation = await this.findExistingConversation(senderId, receiverId);
    
    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'direct' })
      .select()
      .single();

    if (convError) throw convError;

    // Add participants
    await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conversation.id, user_id: senderId },
        { conversation_id: conversation.id, user_id: receiverId }
      ]);

    // Send initial "hi" message
    const message = await this.sendMessage({
      conversation_id: conversation.id,
      sender_id: senderId,
      content: initialMessage,
      type: 'text'
    });

    return {
      ...conversation,
      message,
      participants: [senderId, receiverId]
    };
  }

  // Send message (Facebook Messenger style - simple text)
  async sendMessage(data: {
    conversation_id: string;
    sender_id: string;
    content: string;
    type?: string;
  }) {
    const supabase = this.supabaseService.getClient();

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: data.conversation_id,
        sender_id: data.sender_id,
        content: data.content,
        type: data.type || 'text'
      })
      .select(`
        *,
        sender:profiles!sender_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    // Update conversation's last message timestamp
    await supabase
      .from('conversations')
      .update({ 
        last_message_id: message.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.conversation_id);

    return message;
  }

  // Get user's conversations (Facebook style - with other user's info)
  async getUserConversations(userId: string) {
    const supabase = this.supabaseService.getClient();

    // Get all conversations where user is a participant
    const { data: conversations, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations (
          id,
          last_message_id,
          updated_at,
          messages!last_message_id (
            id,
            content,
            sender_id,
            created_at,
            sender:profiles!sender_id (
              id,
              full_name,
              avatar_url
            )
          )
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { foreignTable: 'conversations', ascending: false });

    if (error) throw error;

    // Get other participant's info for each conversation
    const enhancedConversations = await Promise.all(
      conversations.map(async (conv: any) => {

        const conversationData = conv.conversations;

        const otherUser = await this.getOtherParticipant(conv.conversation_id, userId);
        
        if (!otherUser) {
          return null; 
        }

        const conversationDto = new ConversationDto();
        conversationDto.id = conversationData.id;
        conversationDto.updated_at = conversationData.updated_at;
        
        // Create UserInfoDto for other_user
        const userInfoDto = new UserInfoDto();
        userInfoDto.id = otherUser.id;
        userInfoDto.name = otherUser.full_name || otherUser.username || 'Unknown User';
        userInfoDto.avatar = otherUser.avatar_url || null;
        userInfoDto.online = otherUser.online || false;
        conversationDto.other_user = userInfoDto;

        // Create LastMessageDto if exists
        if (conv.conversations.messages && conv.conversations.messages.length > 0) {
          const lastMessage = conv.conversations.messages[0];
          const lastMessageDto = new LastMessageDto();
          lastMessageDto.content = lastMessage.content;
          lastMessageDto.created_at = lastMessage.created_at;
          
          const senderDto = new UserInfoDto();
          const sender = lastMessage.sender && lastMessage.sender[0];
          senderDto.id = sender?.id || 'unknown';
          senderDto.name = sender?.full_name || sender?.username || 'Unknown';
          senderDto.avatar = sender?.avatar_url || null;
          senderDto.online = false; // Would need to query online status separately
          
          lastMessageDto.sender = senderDto;
          conversationDto.last_message = lastMessageDto;
        } else {
          conversationDto.last_message = null;
        }

        conversationDto.unread_count = await this.getUnreadCount(conv.conversation_id, userId);

        return conversationDto;
      })
    );

    // Filter out null values
    return enhancedConversations.filter(conv => conv !== null) as ConversationDto[];
  }

  // Get messages in a conversation (with pagination)
  async getMessages(conversationId: string, userId: string, limit = 50, before?: string) {
    const supabase = this.supabaseService.getClient();

    // Verify user has access to this conversation
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    // Mark messages as read when user fetches them
    await this.markConversationAsRead(conversationId, userId);

    return {
      messages: messages.reverse(), // Oldest first
      has_more: messages.length === limit
    };
  }

  // Mark conversation as read (update last_read_at)
  async markConversationAsRead(conversationId: string, userId: string) {
    const supabase = this.supabaseService.getClient();

    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    // Also mark all messages in this conversation as read for this user
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('id, read_by')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);

    for (const message of unreadMessages || []) {
      if (!message.read_by.includes(userId)) {
        const updatedReadBy = [...message.read_by, userId];
        await supabase
          .from('messages')
          .update({ read_by: updatedReadBy })
          .eq('id', message.id);
      }
    }
  }

  // Helper: Find existing conversation between two users
  private async findExistingConversation(userId1: string, userId2: string) {
    const supabase = this.supabaseService.getClient();

    // Get conversations where both users are participants
    const { data: conv1 } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId1);

    const { data: conv2 } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId2);

    if (!conv1 || !conv2) return null;

    const conv1Ids = conv1.map(c => c.conversation_id);
    const conv2Ids = conv2.map(c => c.conversation_id);
    const commonIds = conv1Ids.filter(id => conv2Ids.includes(id));

    if (commonIds.length === 0) return null;

    // Return the first matching conversation
    return supabase
      .from('conversations')
      .select('*')
      .eq('id', commonIds[0])
      .single();
  }

  // Helper: Get other participant in conversation
  private async getOtherParticipant(conversationId: string, currentUserId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: participant } = await supabase
      .from('conversation_participants')
      .select(`
        user_id,
        profiles!user_id (
          id,
          username,
          full_name,
          avatar_url,
          online,
          last_seen
        )
      `)
      .eq('conversation_id', conversationId)
      .neq('user_id', currentUserId)
      .single();

    // profiles is returned as an array; return the first profile object or null
    return (participant?.profiles && participant.profiles[0]) || null;
  }

  // Helper: Get unread message count
  private async getUnreadCount(conversationId: string, userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participant?.last_read_at) {
      // Count all messages
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);
      
      return count || 0;
    }

    // Count messages after last_read_at
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .gt('created_at', participant.last_read_at);

    return count || 0;
  }
}
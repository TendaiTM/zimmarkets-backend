import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat'
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private onlineUsers = new Map<string, string>(); // userId -> socketId

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.onlineUsers.set(userId, client.id);
      client.join(`user_${userId}`);
      
      // Broadcast online status to user's conversations
      this.broadcastUserStatus(userId, true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.getUserIdBySocketId(client.id);
    if (userId) {
      this.onlineUsers.delete(userId);
      
      // Broadcast offline status
      this.broadcastUserStatus(userId, false);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: { conversation_id: string; content: string },
    @ConnectedSocket() client: Socket
  ) {
    const senderId = this.getUserIdBySocketId(client.id);
    if (!senderId) return;

    // Save message to database
    const message = await this.chatService.sendMessage({
      conversation_id: data.conversation_id,
      sender_id: senderId,
      content: data.content
    });

    // Get conversation participants
    const participants = await this.getConversationParticipants(data.conversation_id);
    
    // Send to all participants except sender
    participants.forEach(participantId => {
      if (participantId !== senderId) {
        this.server.to(`user_${participantId}`).emit('new_message', {
          conversation_id: data.conversation_id,
          message: {
            id: message.id,
            content: message.content,
            sender: message.sender,
            created_at: message.created_at
          }
        });
      }
    });
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { conversation_id: string; typing: boolean },
    @ConnectedSocket() client: Socket
  ) {
    const senderId = this.getUserIdBySocketId(client.id);
    if (!senderId) return;

    // Get conversation participants
    const participants = await this.getConversationParticipants(data.conversation_id);
    
    // Notify other participants
    participants.forEach(participantId => {
      if (participantId !== senderId) {
        this.server.to(`user_${participantId}`).emit('user_typing', {
          conversation_id: data.conversation_id,
          user_id: senderId,
          typing: data.typing
        });
      }
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: { conversation_id: string },
    @ConnectedSocket() client: Socket
  ) {
    const userId = this.getUserIdBySocketId(client.id);
    if (!userId) return;

    await this.chatService.markConversationAsRead(data.conversation_id, userId);
  }

  // Helper methods
  private getUserIdBySocketId(socketId: string): string | null {
    for (const [userId, sid] of this.onlineUsers.entries()) {
      if (sid === socketId) return userId;
    }
    return null;
  }

  private async broadcastUserStatus(userId: string, online: boolean) {
    // In a real app, get user's conversations and notify participants
    // For simplicity, we'll just emit to all connected clients
    this.server.emit('user_status', {
      user_id: userId,
      online,
      last_seen: online ? null : new Date().toISOString()
    });
  }

  private async getConversationParticipants(conversationId: string): Promise<string[]> {
    // This should query your database
    // For now, return empty array
    return [];
  }
}
import api from './api';

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
}

export interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  is_active: boolean;
  created_at: string;
  last_message_at: string;
  other_user_name: string;
  other_user_id: number;
  last_message_content: string;
  unread_count: number;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  conversations?: T[];
  messages?: T[];
  messageData?: T;
  conversationId?: number;
}

export const chatApi = {
  // Obtenir les conversations
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get<ApiResponse<Conversation>>('/chat/conversations');
    return response.conversations || [];
  },

  // Obtenir les messages d'une conversation
  async getMessages(conversationId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    const response = await api.get<ApiResponse<Message>>(`/chat/conversations/${conversationId}/messages?${params.toString()}`);
    return response.messages || [];
  },

  // Envoyer un message
  async sendMessage(conversationId: number, content: string): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(`/chat/conversations/${conversationId}/messages`, { content });
    if (!response.messageData) throw new Error('Erreur lors de l\'envoi du message');
    return response.messageData;
  },

  // Marquer les messages comme lus
  async markMessagesAsRead(conversationId: number): Promise<void> {
    await api.put(`/chat/conversations/${conversationId}/read`);
  },

  // Démarrer une conversation
  async startConversation(userId: number): Promise<number> {
    const response = await api.get<ApiResponse<never>>(`/chat/conversations/${userId}/start`);
    if (!response.conversationId) throw new Error('Erreur lors du démarrage de la conversation');
    return response.conversationId;
  }
};
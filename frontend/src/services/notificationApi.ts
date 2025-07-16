import api from './api';

export interface Notification {
  id: number;
  user_id: number;
  type: 'like' | 'match' | 'visit' | 'unlike' | 'message';
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  notifications?: T[];
  total?: number;
  count?: number;
}

export const notificationApi = {
  // Obtenir les notifications
  async getNotifications(limit: number = 20, offset: number = 0): Promise<Notification[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    const response = await api.get<ApiResponse<Notification>>(`/notifications?${params.toString()}`);
    return response.notifications || [];
  },

  // Marquer une notification comme lue
  async markAsRead(notificationId: number): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`);
  },

  // Marquer toutes les notifications comme lues
  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all');
  },

  // Obtenir le nombre de notifications non lues
  async getUnreadCount(): Promise<number> {
    const response = await api.get<ApiResponse<never>>('/notifications/unread-count');
    return response.count || 0;
  }
};
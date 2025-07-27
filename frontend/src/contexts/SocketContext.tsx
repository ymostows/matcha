import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Import dynamique de Socket.io pour éviter l'erreur de résolution
type Socket = any;

interface Notification {
  id: number;
  type: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

interface OnlineUser {
  userId: number;
  username: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  unreadCount: number;
  onlineUsers: OnlineUser[];
  sendMessage: (conversationId: number, content: string) => void;
  joinConversation: (conversationId: number) => void;
  leaveConversation: (conversationId: number) => void;
  markNotificationRead: (notificationId: number) => void;
  startTyping: (conversationId: number) => void;
  stopTyping: (conversationId: number) => void;
  refreshNotifications: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Système de polling intelligent pour les notifications (quasi temps réel)
  useEffect(() => {
    if (token && user) {
      console.log('🔔 Démarrage du système de notifications quasi-temps réel');
      setIsConnected(false); // Pas de vraie connexion WebSocket
      
      // Polling plus fréquent pour simuler le temps réel
      const interval = setInterval(() => {
        refreshNotifications();
      }, 5000); // Vérifier toutes les 5 secondes

      return () => clearInterval(interval);
    }
  }, [token, user]);

  // Charger les notifications existantes au démarrage
  useEffect(() => {
    if (token) {
      refreshNotifications();
    }
  }, [token]);

  const refreshNotifications = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const newNotifications = data.notifications || [];
        
        // Détecter les nouvelles notifications
        const currentIds = notifications.map(n => n.id);
        const newIds = newNotifications.map((n: Notification) => n.id);
        const hasNewNotifications = newIds.some((id: number) => !currentIds.includes(id));
        
        if (hasNewNotifications) {
          // Nouvelles notifications détectées
        }
        
        setNotifications(newNotifications);
        
        // Compter les non lues
        const unread = newNotifications.filter((notif: Notification) => !notif.is_read).length;
        setUnreadCount(unread);
      } else {
        console.error('🔔 Erreur API notifications:', response.status);
      }
    } catch (error) {
      console.error('🔔 Erreur chargement notifications:', error);
    }
  };

  const sendMessage = (conversationId: number, content: string) => {
    if (socket && isConnected) {
      socket.emit('send_message', { conversationId, content });
    }
  };

  const joinConversation = (conversationId: number) => {
    if (socket && isConnected) {
      socket.emit('join_conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId: number) => {
    if (socket && isConnected) {
      socket.emit('leave_conversation', conversationId);
    }
  };

  const markNotificationRead = (notificationId: number) => {
    if (socket && isConnected) {
      socket.emit('mark_notification_read', notificationId);
    }
  };

  const startTyping = (conversationId: number) => {
    if (socket && isConnected) {
      socket.emit('typing_start', conversationId);
    }
  };

  const stopTyping = (conversationId: number) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', conversationId);
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    notifications,
    unreadCount,
    onlineUsers,
    sendMessage,
    joinConversation,
    leaveConversation,
    markNotificationRead,
    startTyping,
    stopTyping,
    refreshNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
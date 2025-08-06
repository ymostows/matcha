import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Socket } from 'socket.io-client';
import SocketManager from '../utils/socketManager';

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
  typingUsers: { [conversationId: number]: OnlineUser[] };
  sendMessage: (conversationId: number, content: string) => void;
  joinConversation: (conversationId: number) => void;
  leaveConversation: (conversationId: number) => void;
  markNotificationRead: (notificationId: number) => void;
  startTyping: (conversationId: number) => void;
  stopTyping: (conversationId: number) => void;
  refreshNotifications: () => void;
  // Nouveaux événements pour les messages temps réel
  onNewMessage: (callback: (message: any) => void) => void;
  onMessageRead: (callback: (data: any) => void) => void;
  onUserTyping: (callback: (data: { userId: number; username: string; conversationId?: number }) => void) => void;
  onUserStopTyping: (callback: (data: { userId: number; username: string; conversationId?: number }) => void) => void;
  getTotalUnreadMessages: () => number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketManager, setSocketManager] = useState<SocketManager | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers] = useState<{ [conversationId: number]: OnlineUser[] }>({});
  const messageCallbacks = useRef<((message: any) => void)[]>([]);
  const messageReadCallbacks = useRef<((data: any) => void)[]>([]);
  const typingCallbacks = useRef<((data: any) => void)[]>([]);
  const stopTypingCallbacks = useRef<((data: any) => void)[]>([]);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  // Connexion Socket.io avec le SocketManager résilient
  useEffect(() => {
    if (token && user) {
      console.log('🔌 Initialisation SocketManager...');
      
      const manager = new SocketManager({
        url: 'http://localhost:3001',
        auth: { token },
        enableHeartbeat: true,
        heartbeatInterval: 30000,
        maxReconnectAttempts: 10,
        reconnectionDelay: 1000,
        enableFallbackPolling: true,
        pollingInterval: 5000
      });

      // Écouter les événements de connexion
      const cleanupConnected = manager.on('socket_connected', () => {
        console.log('🔌 SocketManager connecté!');
        setIsConnected(true);
        refreshNotifications();
      });

      const cleanupDisconnected = manager.on('socket_disconnected', (reason) => {
        console.log('🔌 SocketManager déconnecté:', reason);
        setIsConnected(false);
      });

      const cleanupError = manager.on('socket_error', (error) => {
        console.error('🔌 Erreur SocketManager:', error);
        setIsConnected(false);
      });

      const cleanupFallback = manager.on('fallback_polling_started', () => {
        console.log('🔄 Fallback polling activé');
        // Optionnel : notifier l'utilisateur que le chat fonctionne en mode dégradé
      });

      // Événements de notifications avec le SocketManager
      const cleanupNewNotification = manager.on('new_notification', (notification: Notification) => {
        console.log('🔔 Nouvelle notification reçue:', notification);
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      // Événements de messages avec le SocketManager
      const cleanupNewMessage = manager.on('new_message', (message: any) => {
        console.log('💬 Nouveau message reçu:', message);
        messageCallbacks.current.forEach(callback => callback(message));
        updateUnreadMessageCount();
      });

      const cleanupMessageRead = manager.on('message_read', (data: any) => {
        console.log('👁️ Message lu:', data);
        messageReadCallbacks.current.forEach(callback => callback(data));
      });

      const cleanupMessagesRead = manager.on('messages_read', (data: any) => {
        updateUnreadMessageCount();
        
        if (data.conversationId) {
          setNotifications(prev => 
            prev.map(notif => {
              if (notif.type === 'MESSAGE' && 
                  notif.data?.conversationId === data.conversationId) {
                return { ...notif, is_read: true };
              }
              return notif;
            })
          );
          
          setUnreadCount(prev => {
            const messageNotifs = notifications.filter(n => 
              n.type === 'MESSAGE' && 
              n.data?.conversationId === data.conversationId && 
              !n.is_read
            ).length;
            return Math.max(0, prev - messageNotifs);
          });
        }
        
        messageReadCallbacks.current.forEach(callback => callback(data));
      });

      // Événements de typing avec le SocketManager
      const cleanupUserTyping = manager.on('user_typing', (data: { userId: number; username: string }) => {
        console.log('⌨️ Utilisateur en train de taper:', data);
        typingCallbacks.current.forEach(callback => callback(data));
      });

      const cleanupUserStopTyping = manager.on('user_stop_typing', (data: { userId: number; username: string }) => {
        console.log('⌨️ Utilisateur a arrêté de taper:', data);
        stopTypingCallbacks.current.forEach(callback => callback(data));
      });

      // Événements de statut en ligne avec le SocketManager
      const cleanupUserOnline = manager.on('user_online', (user: OnlineUser) => {
        console.log('🟢 Utilisateur en ligne:', user);
        setOnlineUsers(prev => {
          if (!prev.find(u => u.userId === user.userId)) {
            return [...prev, user];
          }
          return prev;
        });
      });

      const cleanupUserOffline = manager.on('user_offline', (user: OnlineUser) => {
        console.log('🔴 Utilisateur hors ligne:', user);
        setOnlineUsers(prev => prev.filter(u => u.userId !== user.userId));
      });

      // Gérer les mises à jour en mode fallback polling
      const cleanupNotificationsUpdate = manager.on('notifications_update', (data: any) => {
        if (data.notifications) {
          setNotifications(data.notifications);
          const unread = data.notifications.filter((notif: Notification) => !notif.is_read).length;
          setUnreadCount(unread);
        }
      });

      const cleanupMessagesUpdate = manager.on('messages_update', (data: any) => {
        if (data.conversations) {
          const total = data.conversations.reduce((acc: number, conv: any) => acc + (conv.unread_count || 0), 0);
          setTotalUnreadMessages(total);
        }
      });

      setSocketManager(manager);
      manager.connect();

      return () => {
        console.log('🔌 Nettoyage SocketManager');
        // Nettoyer tous les handlers
        cleanupConnected();
        cleanupDisconnected();
        cleanupError();
        cleanupFallback();
        cleanupNewNotification();
        cleanupNewMessage();
        cleanupMessageRead();
        cleanupMessagesRead();
        cleanupUserTyping();
        cleanupUserStopTyping();
        cleanupUserOnline();
        cleanupUserOffline();
        cleanupNotificationsUpdate();
        cleanupMessagesUpdate();
        
        manager.destroy();
      };
    } else {
      // Pas de token, nettoyer la connexion
      if (socketManager) {
        socketManager.destroy();
        setSocketManager(null);
        setSocket(null);
        setIsConnected(false);
      }
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

  const sendMessage = () => {
    // L'envoi de messages se fait maintenant via l'API REST
    // Cette fonction est conservée pour compatibilité mais n'est plus utilisée
    console.warn('sendMessage via Socket.io est déprécié, utilisez chatApi.sendMessage');
  };

  const joinConversation = (conversationId: number) => {
    if (socketManager) {
      socketManager.emit('join_conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId: number) => {
    if (socketManager) {
      socketManager.emit('leave_conversation', conversationId);
    }
  };

  const markNotificationRead = async (notificationId: number) => {
    if (socketManager) {
      socketManager.emit('mark_notification_read', notificationId);
    }
    
    // Mettre à jour l'état local immédiatement
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const startTyping = (conversationId: number) => {
    if (socketManager) {
      socketManager.emit('typing_start', conversationId);
    }
  };

  const stopTyping = (conversationId: number) => {
    if (socketManager) {
      socketManager.emit('typing_stop', conversationId);
    }
  };

  // Callbacks pour les événements de messages avec nettoyage automatique
  const onNewMessage = (callback: (message: any) => void) => {
    messageCallbacks.current.push(callback);
    
    // Retourner une fonction de nettoyage
    return () => {
      const index = messageCallbacks.current.indexOf(callback);
      if (index > -1) {
        messageCallbacks.current.splice(index, 1);
      }
    };
  };

  const onMessageRead = (callback: (data: any) => void) => {
    messageReadCallbacks.current.push(callback);
    
    return () => {
      const index = messageReadCallbacks.current.indexOf(callback);
      if (index > -1) {
        messageReadCallbacks.current.splice(index, 1);
      }
    };
  };

  const onUserTyping = (callback: (data: { userId: number; username: string; conversationId?: number }) => void) => {
    typingCallbacks.current.push(callback);
    
    return () => {
      const index = typingCallbacks.current.indexOf(callback);
      if (index > -1) {
        typingCallbacks.current.splice(index, 1);
      }
    };
  };

  const onUserStopTyping = (callback: (data: { userId: number; username: string; conversationId?: number }) => void) => {
    stopTypingCallbacks.current.push(callback);
    
    return () => {
      const index = stopTypingCallbacks.current.indexOf(callback);
      if (index > -1) {
        stopTypingCallbacks.current.splice(index, 1);
      }
    };
  };

  const getTotalUnreadMessages = () => {
    return totalUnreadMessages;
  };

  // Fonction pour mettre à jour le compte des messages non lus
  const updateUnreadMessageCount = async () => {
    try {
      const conversations = await fetch('http://localhost:3001/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (conversations.ok) {
        const data = await conversations.json();
        const total = data.conversations?.reduce((acc: number, conv: any) => acc + (conv.unread_count || 0), 0) || 0;
        setTotalUnreadMessages(total);
      }
    } catch (error) {
      console.error('Erreur mise à jour compteur messages:', error);
    }
  };

  // Mettre à jour le compteur de messages au démarrage et quand on reçoit de nouveaux messages
  useEffect(() => {
    if (isConnected) {
      updateUnreadMessageCount();
    }
  }, [isConnected]);

  // Mettre à jour le compteur quand on reçoit de nouveaux messages
  useEffect(() => {
    const handleNewMessage = () => {
      updateUnreadMessageCount();
    };

    const cleanup = onNewMessage(handleNewMessage);
    
    return cleanup;
  }, [onNewMessage]);

  const value: SocketContextType = {
    socket,
    isConnected,
    notifications,
    unreadCount,
    onlineUsers,
    typingUsers,
    sendMessage,
    joinConversation,
    leaveConversation,
    markNotificationRead,
    startTyping,
    stopTyping,
    refreshNotifications,
    onNewMessage,
    onMessageRead,
    onUserTyping,
    onUserStopTyping,
    getTotalUnreadMessages
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
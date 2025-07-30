import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers] = useState<{ [conversationId: number]: OnlineUser[] }>({});
  const messageCallbacks = useRef<((message: any) => void)[]>([]);
  const messageReadCallbacks = useRef<((data: any) => void)[]>([]);
  const typingCallbacks = useRef<((data: any) => void)[]>([]);
  const stopTypingCallbacks = useRef<((data: any) => void)[]>([]);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  // Connexion Socket.io
  useEffect(() => {
    if (token && user) {
      console.log('🔌 Connexion Socket.io...');
      
      const newSocket = io('http://localhost:3001', {
        auth: {
          token: token
        },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 5000
      });

      newSocket.on('connect', () => {
        console.log('🔌 Socket.io connecté!');
        setIsConnected(true);
        refreshNotifications();
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Socket.io déconnecté');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔌 Erreur de connexion Socket.io:', error);
        setIsConnected(false);
      });

      // Événements de notifications
      newSocket.on('new_notification', (notification: Notification) => {
        console.log('🔔 Nouvelle notification reçue:', notification);
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      // Événements de messages
      newSocket.on('new_message', (message: any) => {
        console.log('💬 Nouveau message reçu:', message);
        messageCallbacks.current.forEach(callback => callback(message));
        // Mettre à jour le compteur de messages non lus
        updateUnreadMessageCount();
      });

      newSocket.on('message_read', (data: any) => {
        console.log('👁️ Message lu:', data);
        messageReadCallbacks.current.forEach(callback => callback(data));
      });

      newSocket.on('messages_read', (data: any) => {
        console.log('👁️ Messages lus:', data);
        // Mettre à jour le compteur global
        updateUnreadMessageCount();
        
        // Marquer les notifications de messages de cette conversation comme lues
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
          
          // Recalculer le compteur de notifications non lues
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

      // Événements de typing
      newSocket.on('user_typing', (data: { userId: number; username: string }) => {
        console.log('⌨️ Utilisateur en train de taper:', data);
        typingCallbacks.current.forEach(callback => callback(data));
      });

      newSocket.on('user_stop_typing', (data: { userId: number; username: string }) => {
        console.log('⌨️ Utilisateur a arrêté de taper:', data);
        stopTypingCallbacks.current.forEach(callback => callback(data));
      });

      // Événements de statut en ligne
      newSocket.on('user_online', (user: OnlineUser) => {
        console.log('🟢 Utilisateur en ligne:', user);
        setOnlineUsers(prev => {
          if (!prev.find(u => u.userId === user.userId)) {
            return [...prev, user];
          }
          return prev;
        });
      });

      newSocket.on('user_offline', (user: OnlineUser) => {
        console.log('🔴 Utilisateur hors ligne:', user);
        setOnlineUsers(prev => prev.filter(u => u.userId !== user.userId));
      });

      setSocket(newSocket);

      return () => {
        console.log('🔌 Nettoyage Socket.io');
        newSocket.disconnect();
      };
    } else {
      // Pas de token, nettoyer la connexion
      if (socket) {
        socket.disconnect();
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
    if (socket && isConnected) {
      socket.emit('join_conversation', conversationId);
      console.log(`👥 Rejoint la conversation ${conversationId}`);
    }
  };

  const leaveConversation = (conversationId: number) => {
    if (socket && isConnected) {
      socket.emit('leave_conversation', conversationId);
      console.log(`👥 Quitté la conversation ${conversationId}`);
    }
  };

  const markNotificationRead = async (notificationId: number) => {
    if (socket && isConnected) {
      socket.emit('mark_notification_read', notificationId);
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
    if (socket && isConnected) {
      socket.emit('typing_start', conversationId);
    }
  };

  const stopTyping = (conversationId: number) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', conversationId);
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
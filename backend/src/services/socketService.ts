import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
}

interface OnlineUser {
  userId: number;
  username: string;
  socketId: string;
  connectedAt: Date;
}

export class SocketService {
  private io: Server;
  private connectedUsers = new Map<number, OnlineUser>();
  private userSockets = new Map<number, Set<string>>();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: [
          'http://localhost:5176',
          'http://localhost:5174', 
          'http://localhost:5173',
          'http://localhost:3000'
        ],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Middleware d'authentification JWT
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Token manquant'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Vérifier que l'utilisateur existe
        const userResult = await pool.query(
          'SELECT id, username FROM users WHERE id = $1',
          [decoded.userId]
        );

        if (userResult.rows.length === 0) {
          return next(new Error('Utilisateur non trouvé'));
        }

        socket.userId = decoded.userId;
        socket.username = userResult.rows[0].username;
        next();
      } catch (error) {
        next(new Error('Token invalide'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      
      // Ajouter l'utilisateur aux utilisateurs connectés
      this.addConnectedUser(socket);
      
      // Joindre la room personnelle de l'utilisateur
      socket.join(`user_${socket.userId}`);
      
      // Événements du socket
      this.setupSocketEvents(socket);
      
      // Gestion de la déconnexion
      socket.on('disconnect', () => {
        this.removeConnectedUser(socket);
      });
    });
  }

  private setupSocketEvents(socket: AuthenticatedSocket) {
    // Événement pour rejoindre une conversation
    socket.on('join_conversation', (conversationId: number) => {
      socket.join(`conversation_${conversationId}`);
    });

    // Événement pour quitter une conversation
    socket.on('leave_conversation', (conversationId: number) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Indicateur de frappe
    socket.on('typing_start', (conversationId: number) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('typing_stop', (conversationId: number) => {
      socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
        userId: socket.userId,
        username: socket.username
      });
    });

    // Note: L'envoi de messages se fait maintenant via l'API REST
    // qui émet automatiquement l'événement 'new_message' en temps réel

    // Marquer les notifications comme lues en temps réel
    socket.on('mark_notification_read', async (notificationId: number) => {
      try {
        await pool.query(
          'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
          [notificationId, socket.userId]
        );
        
        // Envoyer confirmation
        socket.emit('notification_marked_read', { notificationId });
      } catch (error) {
      }
    });

    // Demander le statut en ligne des utilisateurs
    socket.on('get_online_users', (userIds: number[]) => {
      const onlineStatus = userIds.map(userId => ({
        userId,
        isOnline: this.connectedUsers.has(userId)
      }));
      
      socket.emit('online_status', onlineStatus);
    });
  }

  private addConnectedUser(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    const onlineUser: OnlineUser = {
      userId: socket.userId,
      username: socket.username!,
      socketId: socket.id,
      connectedAt: new Date()
    };

    this.connectedUsers.set(socket.userId, onlineUser);
    
    // Ajouter le socket à la liste des sockets de cet utilisateur
    if (!this.userSockets.has(socket.userId)) {
      this.userSockets.set(socket.userId, new Set());
    }
    this.userSockets.get(socket.userId)!.add(socket.id);

    // Notifier les autres utilisateurs du statut en ligne
    socket.broadcast.emit('user_online', {
      userId: socket.userId,
      username: socket.username
    });
  }

  private removeConnectedUser(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    const userSockets = this.userSockets.get(socket.userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      
      if (userSockets.size === 0) {
        this.connectedUsers.delete(socket.userId);
        this.userSockets.delete(socket.userId);
        
        // Délai pour absorber les reloads (reconnexion rapide)
        setTimeout(() => {
          // Vérifier que l'utilisateur n'est pas revenu entre temps
          if (!this.connectedUsers.has(socket.userId!)) {
            pool.query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1', [socket.userId])
              .catch(() => {});
            
            socket.broadcast.emit('user_offline', {
              userId: socket.userId,
              username: socket.username
            });
          }
        }, 1000);
      }
    }
  }

  // Méthodes publiques pour envoyer des notifications

  public async sendNotification(userId: number, notification: {
    type: string;
    message: string;
    data?: any;
  }) {
    try {
      // Sauvegarder en base de données
      const result = await pool.query(`
        INSERT INTO notifications (user_id, type, message, data, is_read, created_at)
        VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)
        RETURNING *
      `, [userId, notification.type, notification.message, JSON.stringify(notification.data || {})]);

      const savedNotification = result.rows[0];

      // Envoyer en temps réel si l'utilisateur est connecté
      this.io.to(`user_${userId}`).emit('new_notification', {
        id: savedNotification.id,
        type: savedNotification.type,
        message: savedNotification.message,
        data: savedNotification.data || null,
        is_read: savedNotification.is_read,
        created_at: savedNotification.created_at
      });

      return savedNotification;
    } catch (error) {
      throw error;
    }
  }

  public async sendMessage(conversationId: number, senderId: number, content: string) {
    try {
      // Sauvegarder le message en base
      const result = await pool.query(`
        INSERT INTO messages (conversation_id, sender_id, content, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING *
      `, [conversationId, senderId, content]);

      const message = result.rows[0];

      // Envoyer en temps réel à tous les participants de la conversation
      this.io.to(`conversation_${conversationId}`).emit('new_message', {
        id: message.id,
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        content: message.content,
        created_at: message.created_at
      });

      return message;
    } catch (error) {
      throw error;
    }
  }

  public isUserOnline(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }

  public getOnlineUsers(): OnlineUser[] {
    return Array.from(this.connectedUsers.values());
  }

  public getIO(): Server {
    return this.io;
  }
}

// Instance singleton
let socketService: SocketService | null = null;

export function initializeSocketService(httpServer: HttpServer): SocketService {
  if (!socketService) {
    socketService = new SocketService(httpServer);
  }
  return socketService;
}

export function getSocketService(): SocketService {
  if (!socketService) {
    throw new Error('SocketService pas encore initialisé');
  }
  return socketService;
}
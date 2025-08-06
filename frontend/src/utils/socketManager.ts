/**
 * SocketManager - Gestionnaire WebSocket résilient pour la navigation privée
 * 
 * Fonctionnalités :
 * - Reconnexion automatique avec backoff exponentiel
 * - Heartbeat pour détecter les déconnexions
 * - Fallback polling si WebSockets échouent
 * - Gestion d'état robuste des connexions
 * - Optimisé pour la navigation privée
 */

import { io, Socket } from 'socket.io-client';

export interface SocketManagerOptions {
  url: string;
  auth: {
    token: string;
  };
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  maxReconnectAttempts?: number;
  reconnectionDelay?: number;
  enableFallbackPolling?: boolean;
  pollingInterval?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  lastConnected: number | null;
  usingFallback: boolean;
  transportMethod: 'websocket' | 'polling' | 'http';
}

export type EventHandler = (...args: any[]) => void;

class SocketManager {
  private socket: Socket | null = null;
  private options: SocketManagerOptions;
  private status: ConnectionStatus;
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(options: SocketManagerOptions) {
    this.options = {
      enableHeartbeat: true,
      heartbeatInterval: 30000, // 30 secondes
      maxReconnectAttempts: 10,
      reconnectionDelay: 1000,
      enableFallbackPolling: true,
      pollingInterval: 5000, // 5 secondes
      ...options
    };

    this.status = {
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0,
      lastConnected: null,
      usingFallback: false,
      transportMethod: 'websocket'
    };
  }

  /**
   * Démarre la connexion
   */
  connect(): void {
    if (this.isDestroyed || this.status.connecting || this.status.connected) {
      return;
    }

    this.status.connecting = true;
    this.status.error = null;

    console.log('🔌 Connexion Socket.io...');

    try {
      this.socket = io(this.options.url, {
        auth: this.options.auth,
        autoConnect: true,
        reconnection: false, // On gère la reconnexion nous-mêmes
        timeout: 10000,
        forceNew: true,
        // Optimisations pour la navigation privée
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: false
      });

      this.setupSocketHandlers();
      
    } catch (error) {
      console.error('🔌 Erreur création socket:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Configure les handlers du socket
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Socket.io connecté!');
      this.handleConnection();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.io déconnecté:', reason);
      this.handleDisconnection(reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Erreur de connexion Socket.io:', error);
      this.handleConnectionError(error);
    });

    // Proxy tous les événements vers les handlers enregistrés
    this.socket.onAny((eventName, ...args) => {
      this.emitToHandlers(eventName, ...args);
    });
  }

  /**
   * Gère une connexion réussie
   */
  private handleConnection(): void {
    this.status.connected = true;
    this.status.connecting = false;
    this.status.error = null;
    this.status.reconnectAttempts = 0;
    this.status.lastConnected = Date.now();
    this.status.usingFallback = false;
    this.status.transportMethod = 'websocket';

    // Arrêter le fallback polling si actif
    this.stopFallbackPolling();

    // Démarrer le heartbeat
    if (this.options.enableHeartbeat) {
      this.startHeartbeat();
    }

    // Émettre l'événement de connexion
    this.emitToHandlers('socket_connected');
  }

  /**
   * Gère une déconnexion
   */
  private handleDisconnection(reason: string): void {
    this.status.connected = false;
    this.status.connecting = false;
    
    // Arrêter le heartbeat
    this.stopHeartbeat();

    // Émettre l'événement de déconnexion
    this.emitToHandlers('socket_disconnected', reason);

    // Décider si on doit reconnecter
    if (!this.isDestroyed && this.shouldReconnect(reason)) {
      this.scheduleReconnect();
    } else if (this.options.enableFallbackPolling) {
      this.startFallbackPolling();
    }
  }

  /**
   * Gère les erreurs de connexion
   */
  private handleConnectionError(error: any): void {
    this.status.connecting = false;
    this.status.error = error.message || 'Erreur de connexion';

    console.error('🔌 Erreur connexion:', error);

    // Émettre l'événement d'erreur
    this.emitToHandlers('socket_error', error);

    // Si on n'a jamais réussi à se connecter et qu'on a fait trop de tentatives
    if (this.status.reconnectAttempts >= (this.options.maxReconnectAttempts || 10)) {
      console.warn('🔌 Nombre maximum de tentatives de reconnexion atteint');
      
      if (this.options.enableFallbackPolling) {
        console.log('🔄 Activation du fallback polling');
        this.startFallbackPolling();
      }
      
      return;
    }

    // Programmer une reconnexion
    this.scheduleReconnect();
  }

  /**
   * Détermine si on doit reconnecter
   */
  private shouldReconnect(reason: string): boolean {
    // Ne pas reconnecter si explicitement fermé par le serveur
    const noReconnectReasons = [
      'io server disconnect',
      'io client disconnect',
      'ping timeout'
    ];

    return !noReconnectReasons.includes(reason);
  }

  /**
   * Programme une reconnexion avec backoff exponentiel
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      this.options.reconnectionDelay! * Math.pow(2, this.status.reconnectAttempts),
      30000 // Max 30 secondes
    );

    console.log(`🔄 Reconnexion programmée dans ${delay}ms (tentative ${this.status.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.status.reconnectAttempts++;
        this.reconnect();
      }
    }, delay);
  }

  /**
   * Reconnecte le socket
   */
  private reconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
    }

    this.connect();
  }

  /**
   * Démarre le système de heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.status.connected) {
        // Envoyer un ping
        this.socket.emit('ping');
        
        // Attendre le pong avec timeout
        const pongTimeout = setTimeout(() => {
          console.warn('🔌 Pas de réponse au ping, reconnexion...');
          this.handleDisconnection('ping timeout');
        }, 5000);

        // Écouter le pong une seule fois
        this.socket.once('pong', () => {
          clearTimeout(pongTimeout);
        });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Arrête le heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Démarre le fallback polling HTTP
   */
  private startFallbackPolling(): void {
    if (!this.options.enableFallbackPolling || this.fallbackTimer) {
      return;
    }

    console.log('🔄 Démarrage du fallback polling HTTP');
    this.status.usingFallback = true;
    this.status.transportMethod = 'http';

    this.fallbackTimer = setInterval(async () => {
      try {
        await this.pollForUpdates();
      } catch (error) {
        console.warn('🔄 Erreur polling:', error);
      }
    }, this.options.pollingInterval);

    // Émettre l'événement de fallback activé
    this.emitToHandlers('fallback_polling_started');
  }

  /**
   * Arrête le fallback polling
   */
  private stopFallbackPolling(): void {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  /**
   * Polling HTTP pour récupérer les mises à jour
   */
  private async pollForUpdates(): Promise<void> {
    try {
      // Polling pour les notifications
      const notificationsResponse = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${this.options.auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        this.emitToHandlers('notifications_update', notificationsData);
      }

      // Polling pour les messages
      const messagesResponse = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${this.options.auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        this.emitToHandlers('messages_update', messagesData);
      }

    } catch (error) {
      // Ignorer les erreurs de polling silencieusement
    }
  }

  /**
   * Enregistre un handler d'événement
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)!.add(handler);

    // Retourner une fonction de nettoyage
    return () => this.off(event, handler);
  }

  /**
   * Supprime un handler d'événement
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Émet un événement vers le serveur
   */
  emit(event: string, ...args: any[]): void {
    if (this.socket && this.status.connected) {
      this.socket.emit(event, ...args);
    } else if (this.status.usingFallback) {
      // En mode fallback, simuler certains événements via HTTP
      this.handleFallbackEmit(event, ...args);
    } else {
      console.warn(`🔌 Impossible d'émettre ${event}: pas de connexion`);
    }
  }

  /**
   * Gère l'émission d'événements en mode fallback HTTP
   */
  private async handleFallbackEmit(event: string, ...args: any[]): Promise<void> {
    try {
      switch (event) {
        case 'join_conversation':
          // Pas d'action HTTP nécessaire
          break;
        case 'leave_conversation':
          // Pas d'action HTTP nécessaire  
          break;
        case 'mark_notification_read':
          await fetch(`/api/notifications/${args[0]}/read`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.options.auth.token}`,
              'Content-Type': 'application/json'
            }
          });
          break;
        default:
          console.warn(`🔄 Événement ${event} non supporté en mode fallback`);
      }
    } catch (error) {
      console.error(`🔄 Erreur fallback emit ${event}:`, error);
    }
  }

  /**
   * Émet un événement vers tous les handlers enregistrés
   */
  private emitToHandlers(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Erreur dans le handler ${event}:`, error);
        }
      });
    }
  }

  /**
   * Obtient le statut de connexion
   */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Vérifie si connecté
   */
  isConnected(): boolean {
    return this.status.connected;
  }

  /**
   * Force une reconnexion
   */
  forceReconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.status.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Détruit le gestionnaire et nettoie les ressources
   */
  destroy(): void {
    this.isDestroyed = true;
    
    this.stopHeartbeat();
    this.stopFallbackPolling();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.eventHandlers.clear();
    
    console.log('🔌 SocketManager détruit');
  }
}

export default SocketManager;
export { SocketManager };
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { chatApi, Message } from '../services/chatApi';
import { useToast } from '../hooks/useToast';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { error: errorToast } = useToast();
  const { user } = useAuth();
  const { 
    joinConversation, 
    leaveConversation, 
    onNewMessage, 
    onMessageRead,
    startTyping, 
    stopTyping,
    isConnected,
    onlineUsers,
    onUserTyping,
    onUserStopTyping
  } = useSocket();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [otherUser, setOtherUser] = useState<{ id: number; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  // Rejoindre/quitter la conversation Socket.io et marquer comme lu
  useEffect(() => {
    if (conversationId && isConnected) {
      joinConversation(parseInt(conversationId));
      
      // Marquer les messages comme lus quand on ouvre la conversation
      markMessagesAsRead();
      
      return () => {
        leaveConversation(parseInt(conversationId));
      };
    }
  }, [conversationId, isConnected, joinConversation, leaveConversation]);

  // Écouter les nouveaux messages
  useEffect(() => {
    const handleNewMessage = (message: any) => {
      // Vérifier que le message appartient à cette conversation
      if (message.conversation_id === parseInt(conversationId!)) {
        setMessages(prev => {
          // Éviter les doublons
          if (prev.find(m => m.id === message.id)) {
            return prev;
          }
          const newMessages = [...prev, {
            id: message.id,
            conversation_id: message.conversation_id,
            sender_id: message.sender_id,
            content: message.content,
            is_read: message.is_read || false,
            created_at: message.created_at,
            sender_name: message.sender_name || 'Utilisateur'
          }];
          
          // Si c'est un message reçu (pas envoyé par nous), le marquer comme lu automatiquement
          if (message.sender_id !== user?.id) {
            setTimeout(() => markMessagesAsRead(), 1000);
          }
          
          return newMessages;
        });
      }
    };

    const cleanup = onNewMessage(handleNewMessage);
    
    // Nettoyer le callback au démontage
    return cleanup;
  }, [conversationId, onNewMessage]);

  // Détecter si l'utilisateur scroll manuellement
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      setIsUserScrolling(!isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent (seulement si pas en train de scroller)
  useEffect(() => {
    if (messagesEndRef.current && !isUserScrolling) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, typingUsers, isUserScrolling]);

  // Forcer le scroll au premier chargement
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'auto',
          block: 'end'
        });
      }, 100);
    }
  }, [messages.length > 0]);

  // Marquer les messages comme lus
  const markMessagesAsRead = async () => {
    if (!conversationId) return;
    
    try {
      await chatApi.markMessagesAsRead(parseInt(conversationId));
      
      // Mettre à jour l'état local des messages
      setMessages(prev => 
        prev.map(message => ({
          ...message,
          is_read: message.sender_id !== user?.id ? true : message.is_read
        }))
      );
    } catch (error) {
      console.error('Erreur marquage messages lus:', error);
    }
  };

  // Écouter les événements de typing
  useEffect(() => {
    const handleUserTyping = (data: { userId: number; username: string }) => {
      if (otherUser && data.userId === otherUser.id) {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      }
    };

    const handleUserStopTyping = (data: { userId: number; username: string }) => {
      if (otherUser && data.userId === otherUser.id) {
        setTypingUsers(prev => prev.filter(name => name !== data.username));
      }
    };

    onUserTyping(handleUserTyping);
    onUserStopTyping(handleUserStopTyping);
  }, [otherUser, onUserTyping, onUserStopTyping]);

  // Écouter les événements de messages lus
  useEffect(() => {
    const handleMessageRead = (data: any) => {
      if (data.conversationId === parseInt(conversationId!) || data.messageIds) {
        setMessages(prev => 
          prev.map(message => {
            if (data.messageIds?.includes(message.id) || data.messageId === message.id) {
              return { ...message, is_read: true };
            }
            return message;
          })
        );
      }
    };

    const cleanup = onMessageRead(handleMessageRead);
    
    return cleanup;
  }, [conversationId, onMessageRead]);

  // Nettoyer le timeout de typing au démontage
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const fetchedMessages = await chatApi.getMessages(parseInt(conversationId!));
      setMessages(fetchedMessages);
      
      // Identifier l'autre utilisateur à partir des messages
      if (fetchedMessages.length > 0 && user) {
        const otherUserMessage = fetchedMessages.find(m => m.sender_id !== user.id);
        if (otherUserMessage) {
          setOtherUser({
            id: otherUserMessage.sender_id,
            name: otherUserMessage.sender_name
          });
        }
      } else {
        // Si pas de messages, récupérer depuis les conversations
        const conversations = await chatApi.getConversations();
        const currentConv = conversations.find(c => c.id === parseInt(conversationId!));
        if (currentConv) {
          setOtherUser({
            id: currentConv.other_user_id,
            name: currentConv.other_user_name
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      errorToast('Impossible de charger les messages');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      
      // Arrêter l'indicateur de typing
      stopTyping(parseInt(conversationId!));
      
      // Envoyer via l'API REST (qui déclenche l'événement Socket.io)
      const message = await chatApi.sendMessage(parseInt(conversationId!), newMessage.trim());
      
      // Ajouter le message localement (optimistic update)
      setMessages(prev => {
        // Éviter les doublons
        if (prev.find(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
      
      setNewMessage('');
      
      // Forcer le scroll vers le bas après l'envoi
      setIsUserScrolling(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }, 100);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      errorToast('Impossible d\'envoyer le message');
    } finally {
      setIsSending(false);
    }
  };

  // Gestion du typing
  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (value.trim() && isConnected) {
      // Envoyer l'événement typing_start
      startTyping(parseInt(conversationId!));
      
      // Programmer l'arrêt du typing après 3 secondes d'inactivité
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(parseInt(conversationId!));
      }, 3000);
    } else {
      // Arrêter immédiatement le typing si le champ se vide
      stopTyping(parseInt(conversationId!));
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="h-[600px] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-twilight/60 text-lg">Chargement de la conversation...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/conversations')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux conversations
          </Button>
        </div>
          <Card className="h-[600px] flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-primary" />
                {otherUser ? (
                  <div className="flex items-center gap-2">
                    <span className="truncate">{otherUser.name}</span>
                    {otherUser && onlineUsers.some(u => u.userId === otherUser.id) && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600">En ligne</span>
                      </div>
                    )}
                  </div>
                ) : (
                  'Conversation'
                )}
              </div>
              {isConnected ? (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Connecté
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Déconnecté
                </div>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col min-h-0 p-0">
            {/* Messages Container avec scroll */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-twilight mb-2">
                    Aucun message pour le moment
                  </h3>
                  <p className="text-twilight/60">
                    Commencez la conversation en envoyant un message !
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${user && message.sender_id === user.id ? 'justify-end' : 'justify-start'} w-full`}
                  >
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-lg break-words ${
                        user && message.sender_id === user.id
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-gray-200 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <p className="text-xs opacity-70 whitespace-nowrap">
                          {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {user && message.sender_id === user.id && (
                          <div className={`text-xs flex items-center ${message.is_read ? 'text-blue-500' : 'text-gray-400'}`}>
                            {message.is_read ? (
                              <span className="font-semibold">✓✓</span>
                            ) : (
                              <span>✓</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              
              {/* Indicateur de typing */}
              {typingUsers.length > 0 && (
                <div className="px-0 pb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span>
                      {typingUsers.length === 1 
                        ? `${typingUsers[0]} tape...`
                        : `${typingUsers.length} personnes tapent...`
                      }
                    </span>
                  </div>
                </div>
              )}
              
              {/* Référence pour le scroll automatique */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input zone */}
            <div className="border-t p-4 flex-shrink-0 bg-white">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                  size="sm"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatPage;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Clock, User, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { chatApi, Conversation } from '../../services/chatApi';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../hooks/useToast';
import { formatConversationTime } from '../../utils/dateUtils';

interface ConversationsListProps {
  className?: string;
}

const ConversationsList: React.FC<ConversationsListProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { error: errorToast } = useToast();
  const { onlineUsers, onNewMessage, onMessageRead } = useSocket();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    // Filtrer les conversations selon la recherche
    if (searchQuery.trim()) {
      const filtered = conversations.filter(conv =>
        conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [conversations, searchQuery]);

  useEffect(() => {
    // Écouter les nouveaux messages pour mettre à jour les conversations
    const handleNewMessage = (message: any) => {
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === message.conversation_id) {
            return {
              ...conv,
              last_message_content: message.content,
              last_message_at: message.created_at,
              unread_count: conv.unread_count + 1
            };
          }
          return conv;
        })
      );
    };

    const cleanup = onNewMessage(handleNewMessage);
    return cleanup;
  }, [onNewMessage]);

  // Écouter les messages lus pour mettre à jour les compteurs
  useEffect(() => {
    const handleMessagesRead = (data: any) => {
      if (data.conversationId) {
        setConversations(prev => 
          prev.map(conv => {
            if (conv.id === data.conversationId) {
              return {
                ...conv,
                unread_count: 0 // Reset du compteur quand les messages sont lus
              };
            }
            return conv;
          })
        );
      }
    };

    const cleanup = onMessageRead(handleMessagesRead);
    return cleanup;
  }, [onMessageRead]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const fetchedConversations = await chatApi.getConversations();
      setConversations(fetchedConversations);
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
      errorToast('Impossible de charger les conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationClick = async (conversation: Conversation) => {
    // Marquer la conversation comme lue avant de naviguer
    if (conversation.unread_count > 0) {
      try {
        await chatApi.markMessagesAsRead(conversation.id);
        // Mettre à jour l'état local immédiatement
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversation.id 
              ? { ...conv, unread_count: 0 }
              : conv
          )
        );
      } catch (error) {
        console.error('Erreur marquage messages lus:', error);
      }
    }
    
    // Naviguer en passant les informations de l'utilisateur via le state
    // Cela permet au ChatPage de récupérer le nom même si l'API échoue (navigation privée)
    navigate(`/chat/${conversation.id}`, {
      state: {
        userName: conversation.other_user_name,
        userId: conversation.other_user_id,
        conversationId: conversation.id
      }
    });
  };


  const isUserOnline = (userId: number) => {
    return onlineUsers.some(user => user.userId === userId);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Conversations
          {conversations.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {conversations.length}
            </Badge>
          )}
        </CardTitle>
        
        {conversations.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            {conversations.length === 0 ? (
              <>
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Aucune conversation
                </h3>
                <p className="text-gray-500 text-sm">
                  Vos conversations apparaîtront ici une fois que vous aurez matché avec quelqu'un
                </p>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Aucun résultat
                </h3>
                <p className="text-gray-500 text-sm">
                  Aucune conversation ne correspond à votre recherche
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleConversationClick(conversation)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    {isUserOnline(conversation.other_user_id) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {conversation.other_user_name}
                      </h4>
                      <div className="flex items-center gap-2">
                        {conversation.unread_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unread_count}
                          </Badge>
                        )}
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatConversationTime(conversation.last_message_at)}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.last_message_content || 'Aucun message'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversationsList;
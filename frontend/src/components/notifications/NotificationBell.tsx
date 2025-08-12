import React, { useState } from 'react';
import { Bell, X, Clock, Heart, Eye, MessageCircle, UserMinus } from 'lucide-react';
import { Button } from '../ui/button';
import { useSocket } from '../../contexts/SocketContext';
import { getTimeAgo } from '../../utils/dateUtils';

interface NotificationItemProps {
  notification: {
    id: number;
    type: string;
    message: string;
    data?: any;
    is_read: boolean;
    created_at: string;
  };
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-pink-500 fill-current" />;
      case 'match':
        return <Heart className="w-5 h-5 text-red-500 fill-current animate-pulse" />;
      case 'visit':
        return <Eye className="w-5 h-5 text-blue-500" />;
      case 'unlike':
        return <UserMinus className="w-5 h-5 text-gray-400" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-green-500 fill-current" />;
      default:
        return <Bell className="w-5 h-5 text-purple-500" />;
    }
  };


  const getBgColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-white hover:bg-gray-50';
    switch (type) {
      case 'like':
        return 'bg-pink-50 border-l-4 border-l-pink-400 hover:bg-pink-100';
      case 'match':
        return 'bg-red-50 border-l-4 border-l-red-400 hover:bg-red-100';
      case 'visit':
        return 'bg-blue-50 border-l-4 border-l-blue-400 hover:bg-blue-100';
      case 'message':
        return 'bg-green-50 border-l-4 border-l-green-400 hover:bg-green-100';
      default:
        return 'bg-purple-50 border-l-4 border-l-purple-400 hover:bg-purple-100';
    }
  };

  return (
    <div 
      className={`p-4 border-b border-gray-100 transition-all duration-200 ${getBgColor(notification.type, notification.is_read)}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 rounded-full bg-white shadow-sm">
          {getIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-relaxed ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-normal text-gray-700'}`}>
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">
              {getTimeAgo(notification.created_at)}
            </span>
            {!notification.is_read && (
              <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-full font-semibold shadow-sm">
                Nouveau
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, refreshNotifications } = useSocket();
  const [isOpen, setIsOpen] = useState(false);



  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Rafraîchir les notifications
        refreshNotifications();
      }
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    }
  };

  const handleClose = () => {
    if (unreadCount > 0) {
      // Marquer toutes les notifications comme lues à la fermeture
      handleMarkAllAsRead();
    }
    setIsOpen(false);
  };


  const recentNotifications = notifications.slice(0, 10);

  return (
    <div className="relative">
      {/* Bouton cloche */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5 text-gray-700 hover:text-rose-500 transition-colors" />
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center shadow-lg border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </Button>

      {/* Dropdown des notifications */}
      {isOpen && (
        <>
          {/* Overlay pour fermer */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleClose}
          />
          
          {/* Contenu du dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[32rem] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-rose-500" />
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-md">
                      {unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="p-1 h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
            </div>

            {/* Liste des notifications */}
            <div className="max-h-80 overflow-y-auto">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <Bell className="w-8 h-8 text-blue-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Aucune notification</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Vous recevrez ici vos likes, matches,<br />visites de profil et messages
                  </p>
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
};
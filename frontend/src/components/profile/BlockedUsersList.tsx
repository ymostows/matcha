import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Calendar, MapPin, User, Loader2, Unlock } from 'lucide-react';
import { profileApi, BlockedUser } from '../../services/profileApi';
import { getPhotoUrl } from '../../utils/imageUtils';
import { useToast } from '../../hooks/useToast';

interface BlockedUsersListProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export const BlockedUsersList: React.FC<BlockedUsersListProps> = ({
  limit = 20,
  showHeader = true,
  compact = false
}) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingUserId, setUnblockingUserId] = useState<number | null>(null);
  
  const { success: successToast, error: errorToast } = useToast();

  useEffect(() => {
    loadBlockedUsers();
  }, [limit]);

  const loadBlockedUsers = async () => {
    try {
      setIsLoading(true);
      const users = await profileApi.getBlockedUsers(limit);
      setBlockedUsers(users);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs bloqués:', error);
      errorToast('Erreur lors du chargement des utilisateurs bloqués');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (userId: number) => {
    try {
      setUnblockingUserId(userId);
      await profileApi.unblockUser(userId);
      successToast('Utilisateur débloqué avec succès');
      // Retirer l'utilisateur de la liste
      setBlockedUsers(prev => prev.filter(user => user.blocked_id !== userId));
    } catch (error) {
      console.error('Erreur lors du déblocage:', error);
      errorToast('Erreur lors du déblocage de l\'utilisateur');
    } finally {
      setUnblockingUserId(null);
    }
  };

  const formatBlockedDate = (blockedAt: string) => {
    const date = new Date(blockedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 30) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-twilight/60">Chargement des utilisateurs bloqués...</p>
        </div>
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-twilight mb-2">Aucun utilisateur bloqué</h3>
        <p className="text-twilight/60">
          Vous n'avez bloqué aucun utilisateur pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-twilight flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              Utilisateurs bloqués ({blockedUsers.length})
            </h3>
            <p className="text-sm text-twilight/60">
              Les utilisateurs que vous avez bloqués ne peuvent plus vous contacter
            </p>
          </div>
        </div>
      )}

      <div className={compact ? "space-y-2" : "space-y-4"}>
        {blockedUsers.map((user, index) => (
          <motion.div
            key={user.blocked_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
            className={`${compact ? 'p-3' : 'p-4'} bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200`}
          >
            <div className="flex items-center gap-4">
              {/* Photo de profil */}
              <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} bg-gray-100 rounded-full overflow-hidden flex-shrink-0`}>
                {user.photo_id && user.filename ? (
                  <img
                    src={getPhotoUrl(user.photo_id)}
                    alt={`${user.first_name} ${user.last_name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/64x64?text=👤';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <User className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} text-gray-400`} />
                  </div>
                )}
              </div>

              {/* Informations utilisateur */}
              <div className="flex-1 min-w-0">
                <h4 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-twilight truncate`}>
                  {user.first_name} {user.last_name}
                </h4>
                <p className="text-sm text-twilight/60 truncate">@{user.username}</p>
                
                <div className="flex items-center gap-4 mt-1">
                  {user.age && (
                    <div className="flex items-center gap-1 text-xs text-twilight/60">
                      <Calendar className="w-3 h-3" />
                      <span>{user.age} ans</span>
                    </div>
                  )}
                  {user.city && (
                    <div className="flex items-center gap-1 text-xs text-twilight/60">
                      <MapPin className="w-3 h-3" />
                      <span>{user.city}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-2">
                  <p className="text-xs text-red-600 mb-1">
                    Bloqué {formatBlockedDate(user.blocked_at)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex flex-col gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <Shield className="w-3 h-3 mr-1" />
                  Bloqué
                </span>
                
                <button
                  onClick={() => handleUnblock(user.blocked_id)}
                  disabled={unblockingUserId === user.blocked_id}
                  className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unblockingUserId === user.blocked_id ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Unlock className="w-3 h-3 mr-1" />
                  )}
                  Débloquer
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
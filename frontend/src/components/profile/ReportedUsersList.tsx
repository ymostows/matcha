import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flag, Calendar, MapPin, User, Loader2 } from 'lucide-react';
import { profileApi, ReportedUser } from '../../services/profileApi';
import { getPhotoUrl } from '../../utils/imageUtils';
import { useToast } from '../../hooks/useToast';

interface ReportedUsersListProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export const ReportedUsersList: React.FC<ReportedUsersListProps> = ({
  limit = 20,
  showHeader = true,
  compact = false
}) => {
  const [reportedUsers, setReportedUsers] = useState<ReportedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { error: errorToast } = useToast();

  useEffect(() => {
    loadReportedUsers();
  }, [limit]);

  const loadReportedUsers = async () => {
    try {
      setIsLoading(true);
      const users = await profileApi.getReportedUsers(limit);
      setReportedUsers(users);
    } catch (error) {
      errorToast('Erreur lors du chargement des utilisateurs signalés');
    } finally {
      setIsLoading(false);
    }
  };

  const formatReportedDate = (reportedAt: string) => {
    const date = new Date(reportedAt);
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
          <p className="text-twilight/60">Chargement des utilisateurs signalés...</p>
        </div>
      </div>
    );
  }

  if (reportedUsers.length === 0) {
    return (
      <div className="text-center py-8">
        <Flag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-twilight mb-2">Aucun utilisateur signalé</h3>
        <p className="text-twilight/60">
          Vous n'avez signalé aucun utilisateur pour le moment.
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
              <Flag className="w-5 h-5 text-orange-500" />
              Utilisateurs signalés ({reportedUsers.length})
            </h3>
            <p className="text-sm text-twilight/60">
              Les utilisateurs que vous avez signalés comme faux comptes
            </p>
          </div>
        </div>
      )}

      <div className={compact ? "space-y-2" : "space-y-4"}>
        {reportedUsers.map((user, index) => (
          <motion.div
            key={user.reported_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
                  <p className="text-xs text-orange-600 mb-1">
                    Signalé {formatReportedDate(user.reported_at)}
                  </p>
                  <p className="text-xs text-twilight/80 italic bg-gray-50 rounded px-2 py-1">
                    Raison : "{user.reason}"
                  </p>
                </div>
              </div>

              {/* Statut (pas de bouton d'action car les signalements sont permanents) */}
              <div className="flex-shrink-0 text-right">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  <Flag className="w-3 h-3 mr-1" />
                  Signalé
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
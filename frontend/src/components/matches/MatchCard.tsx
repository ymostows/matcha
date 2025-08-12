import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, MapPin, Star, UserMinus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { MatchItem } from '../../services/profileApi';
import { API_BASE_URL } from '../../services/api';
import { getPhotoUrl as getStandardPhotoUrl } from '../../utils/imageUtils';
import { getTimeAgo as getTimeAgoUtil } from '../../utils/dateUtils';

interface MatchCardProps {
  match: MatchItem;
  onUnmatch?: (matchId: number) => Promise<void>;
}

export const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  onUnmatch
}) => {
  const navigate = useNavigate();

  const handleUnmatch = async () => {
    if (onUnmatch) {
      try {
        await onUnmatch(match.match_id);
      } catch (error) {
        console.error('Erreur lors du unmatch:', error);
      }
    }
  };

  const handleChat = () => {
    navigate('/conversations');
  };

  // Construction de l'URL de l'image avec l'utilitaire centralisé
  const getPhotoUrl = (photoId: number | undefined): string => {
    if (!photoId) return '';
    return getStandardPhotoUrl(photoId);
  };

  // Fallback pour compatibilité avec l'ancien système filename
  const getImageUrl = (filename: string | undefined) => {
    if (!filename) return null;
    
    // Si c'est déjà une data URL
    if (filename.startsWith('data:')) {
      return filename;
    }
    
    // Si c'est du base64 sans préfixe
    if (filename.includes('base64') || filename.match(/^[A-Za-z0-9+/=]+$/)) {
      return `data:image/jpeg;base64,${filename}`;
    }
    
    // Pour les fichiers, utiliser l'API backend
    return `${API_BASE_URL.replace('/api', '')}/api/photos/${filename}`;
  };



  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <Card className="transition-all duration-300 group bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 border-blue-200/30 hover:border-accent/40 shadow-md hover:shadow-lg h-auto">
        <CardContent className="p-3 sm:p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-accent/5 to-transparent rounded-full -translate-y-6 translate-x-6"></div>
          
          {/* Layout horizontal compact */}
          <div className="flex items-center gap-2 sm:gap-3 relative z-10">
            {/* Avatar compact */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/15 to-secondary/15 rounded-full opacity-70"></div>
              <div className="relative w-full h-full border-2 border-white shadow-md group-hover:border-white/90 transition-all duration-300 rounded-full overflow-hidden bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
                {(match.photo_id || match.filename) ? (
                  <img 
                    src={match.photo_id ? getPhotoUrl(match.photo_id) : getImageUrl(match.filename)!}
                    alt={`Photo de ${match.first_name}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = `<span class="text-white font-bold text-xs">${match.first_name[0]}${match.last_name ? match.last_name[0] : ''}</span>`;
                      }
                    }}
                  />
                ) : (
                  <span className="text-white font-bold text-xs sm:text-sm">
                    {match.first_name[0]}{match.last_name ? match.last_name[0] : ''}
                  </span>
                )}
              </div>
              {/* Badge de match */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-accent to-secondary rounded-full flex items-center justify-center shadow-sm">
                <Star className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" fill="currentColor" />
              </div>
            </div>

            {/* Info condensée */}
            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-center justify-between gap-1 mb-1">
                <h3 className="font-semibold text-twilight truncate text-sm sm:text-base flex-1 min-w-0">
                  {match.first_name}
                </h3>
                {match.age && (
                  <span className="text-[10px] sm:text-xs bg-accent/10 text-accent border-accent/20 px-1 py-0 h-4 sm:h-5 flex-shrink-0 rounded-full border font-medium flex items-center">
                    {match.age}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs sm:text-sm text-twilight/60 mb-1">
                <span className="truncate flex-1 min-w-0">@{match.username}</span>
                <span className="flex-shrink-0 ml-1">{getTimeAgoUtil(match.matched_at)}</span>
              </div>
              
              {match.city && (
                <div className="flex items-center gap-1 text-xs sm:text-sm text-twilight/60 mb-2">
                  <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 text-accent" />
                  <span className="truncate">{match.city}</span>
                </div>
              )}

              {/* Actions horizontales compactes */}
              <div className="flex gap-1 sm:gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/profile/${match.user_id}`)}
                  className="text-xs sm:text-sm py-2 px-3 h-8 sm:h-9 flex-1 border border-accent/30 text-accent hover:bg-gradient-to-r hover:from-accent hover:to-secondary hover:text-white hover:border-transparent hover:shadow-lg hover:scale-[1.02] transform transition-all duration-200 font-medium bg-white/80"
                >
                  <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                  <span className="hidden sm:inline">Voir</span>
                  <span className="sm:hidden">👁</span>
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleChat}
                  className="text-xs sm:text-sm py-2 px-3 h-8 sm:h-9 flex-1 bg-gradient-to-r from-primary via-rose-500 to-accent text-white hover:shadow-lg hover:scale-[1.02] transform transition-all duration-200 font-medium border-0 shadow-sm relative overflow-hidden"
                >
                  <MessageCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" fill="currentColor" />
                  <span className="hidden sm:inline">Chat</span>
                  <span className="sm:hidden">💬</span>
                </Button>
                
                {/* Bouton unmatch optionnel */}
                {onUnmatch && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleUnmatch}
                    className="text-[10px] sm:text-xs py-1 px-1 h-6 sm:h-7 w-6 sm:w-7 p-0 bg-red-500/90 hover:bg-red-600 text-white transition-all duration-200"
                  >
                    <UserMinus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MatchCard;
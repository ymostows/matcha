import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { MatchItem } from '../../services/profileApi';
import { API_BASE_URL } from '../../services/api';
import { getPhotoUrl as getStandardPhotoUrl } from '../../utils/imageUtils';

interface CompactMatchCardProps {
  match: MatchItem;
}

export const CompactMatchCard: React.FC<CompactMatchCardProps> = ({ match }) => {
  const navigate = useNavigate();

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

  const imageUrl = match.photo_id ? getPhotoUrl(match.photo_id) : getImageUrl(match.filename);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-md hover:shadow-lg transition-all duration-200"
    >
      {/* Photo */}
      <div className="relative h-40 bg-gradient-to-br from-rose-100 to-pink-100">
        {imageUrl ? (
          <img 
            src={imageUrl}
            alt={`Photo de ${match.first_name}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Image de fallback affichée
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.classList.remove('hidden');
              }
            }}
            onLoad={() => {
              // Image chargée avec succès
            }}
          />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center ${imageUrl ? 'hidden' : ''}`}>
          <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {match.first_name[0]?.toUpperCase()}
            </span>
          </div>
        </div>
        
        {/* Badge de match */}
        <div className="absolute top-2 left-2">
          <div className="bg-gradient-to-r from-primary to-accent text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
            <Heart className="w-3 h-3 fill-current" />
            Match
          </div>
        </div>
      </div>

      {/* Informations */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-semibold text-gray-900 truncate">
            {match.first_name}
          </h3>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            {match.age && <span>{match.age} ans</span>}
            {match.city && match.age && <span>•</span>}
            {match.city && <span className="truncate">{match.city}</span>}
          </p>
        </div>

        {/* Boutons */}
        <div className="flex gap-2">
          <Button 
            size="sm"
            variant="outline"
            className="flex-1 border-primary/30 text-primary hover:bg-primary/5 text-xs"
            onClick={() => navigate(`/profile/${match.user_id}`)}
          >
            <Eye className="w-3 h-3 mr-1" />
            Profil
          </Button>
          <Button 
            size="sm"
            className="flex-1 bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg text-xs"
            onClick={handleChat}
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            Chat
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CompactMatchCard;
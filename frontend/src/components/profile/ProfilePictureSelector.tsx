import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { profileApi } from '../../services/profileApi';

interface Photo {
  id: number;
  filename: string;
  is_profile_picture: boolean;
  upload_date?: string;
}

interface ProfilePictureSelectorProps {
  photos: Photo[];
  onPhotoUpdated: (photos: Photo[]) => void;
  onClose: () => void;
}

export const ProfilePictureSelector: React.FC<ProfilePictureSelectorProps> = ({
  photos,
  onPhotoUpdated,
  onClose
}) => {
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(
    photos.find(p => p.is_profile_picture)?.id || null
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveSelection = async () => {
    if (!selectedPhotoId) {
      setError('Veuillez sélectionner une photo de profil');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await profileApi.setProfilePicture(selectedPhotoId);
      
      // Mettre à jour localement
      const updatedPhotos = photos.map(photo => ({
        ...photo,
        is_profile_picture: photo.id === selectedPhotoId
      }));
      
      onPhotoUpdated(updatedPhotos);
      onClose();
    } catch (error) {
      console.error('Erreur définition photo de profil:', error);
      setError('Erreur lors de la mise à jour de la photo de profil');
    } finally {
      setIsUpdating(false);
    }
  };

  const getPhotoUrl = (photo: Photo): string => {
    return `http://localhost:3001/api/photos/${photo.id}/image`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Crown className="w-5 h-5 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-semibold text-twilight">
                Choisir ma photo de profil
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              Annuler
            </Button>
          </div>

          {/* Erreur */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Grille de sélection */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                  selectedPhotoId === photo.id
                    ? 'border-yellow-500 ring-2 ring-yellow-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPhotoId(photo.id)}
              >
                <div className="aspect-square">
                  <img
                    src={getPhotoUrl(photo)}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x200?text=Error';
                    }}
                  />
                </div>

                {/* Overlay de sélection */}
                {selectedPhotoId === photo.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center"
                  >
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  </motion.div>
                )}

                {/* Badge actuel */}
                {photo.is_profile_picture && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full p-1 shadow-lg">
                    <Crown className="w-3 h-3" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveSelection}
              disabled={isUpdating || !selectedPhotoId}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Définir comme photo de profil
                </>
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              💡 <strong>Conseil :</strong> Choisissez une photo où votre visage est bien visible et où vous souriez ! 
              C'est la première impression que vous donnerez aux autres utilisateurs.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 
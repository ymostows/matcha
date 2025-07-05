import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Camera, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { profileApi } from '../../services/profileApi';

interface Photo {
  id?: number;
  filename: string;
  is_profile_picture: boolean;
}

interface PhotoUploadSimpleProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  onSave?: () => void;
}

export const PhotoUploadSimple: React.FC<PhotoUploadSimpleProps> = ({ 
  photos, 
  onPhotosChange,
  onSave
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>([]); // Photos actuelles depuis l'API
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les photos réelles au montage du composant
  useEffect(() => {
    const loadRealPhotos = async () => {
      try {
        const profile = await profileApi.getMyProfile();
        const realPhotos = profile.photos || [];
        setCurrentPhotos(realPhotos);
        onPhotosChange(realPhotos); // Synchroniser avec le parent
      } catch (error) {
        setCurrentPhotos([]);
      }
    };
    
    loadRealPhotos();
  }, [onPhotosChange]);

  // Utiliser currentPhotos au lieu de photos directement
  const displayPhotos = currentPhotos.length > 0 ? currentPhotos : photos;

  // Exposer la fonction de sauvegarde
  useEffect(() => {
    (window as any).savePhotoUpload = async () => {
      onSave?.();
      return true;
    };
    return () => {
      delete (window as any).savePhotoUpload;
    };
  }, [onSave]);

  // Upload des photos
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Vérifier le nombre total de photos
    if (displayPhotos.length + files.length > 5) {
      setUploadError(`Maximum 5 photos autorisées`);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Upload vers le backend
      const filesArray = Array.from(files);
      
      const uploadResult = await profileApi.uploadPhotos(filesArray);
      
      if (!uploadResult?.success) {
        throw new Error(uploadResult?.message || 'Upload échoué');
      }
      
      // Recharger le profil pour avoir les nouvelles photos
      const updatedProfile = await profileApi.getMyProfile();
      
      // Mettre à jour à la fois currentPhotos et le parent
      setCurrentPhotos(updatedProfile.photos || []);
      onPhotosChange(updatedProfile.photos || []);
      
      // Clear error on success
      setUploadError(null);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur upload';
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Supprimer une photo
  const removePhoto = async (index: number) => {
    const photoToDelete = displayPhotos[index];
    
    try {
      if (photoToDelete.id) {
        await profileApi.deletePhoto(photoToDelete.id);
      }
      
      const newPhotos = displayPhotos.filter((_, i) => i !== index);
      setCurrentPhotos(newPhotos); // Mettre à jour currentPhotos
      onPhotosChange(newPhotos);
    } catch (error) {
      console.error('Erreur suppression:', error);
      setUploadError('Erreur lors de la suppression');
    }
  };

  // URL des photos (via l'API qui sert depuis la DB)
  const getPhotoUrl = (photo: Photo): string => {
    // Vérifier que l'ID existe
    if (!photo.id) {
      console.warn('⚠️ Photo sans ID:', photo);
      return 'https://via.placeholder.com/200x200?text=No+ID';
    }
    return `http://localhost:3001/api/profile/photos/${photo.id}/image`;
  };

  // Gestion d'erreur d'image améliorée
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, photo: Photo) => {
    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x200?text=Error+Loading';
  };

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Photos ({displayPhotos.length}/5)</h2>
        <p className="text-gray-600 text-sm">Ajoutez jusqu'à 5 photos pour votre profil</p>
      </div>

      {/* Erreur */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-red-700 text-sm">{uploadError}</p>
        </div>
      )}

      {/* Photos uploadées */}
      {displayPhotos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <AnimatePresence>
            {displayPhotos.map((photo, index) => (
              <motion.div
                key={photo.filename}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
              >
                <img
                  src={getPhotoUrl(photo)}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageError(e, photo)}
                />
                
                {/* Croix pour supprimer */}
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Bouton d'upload */}
      {displayPhotos.length < 5 && (
        <div className="text-center">
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {displayPhotos.length === 0 ? 'Ajouter des photos' : 'Ajouter une photo'}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}; 
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Camera, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { profileApi } from '../../services/profileApi';

interface Photo {
  id?: number;
  filename: string;
  is_profile_picture: boolean;
  upload_date?: string;
  preview?: string; // Pour les nouvelles photos avant upload
}

interface PhotoUploadProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 5 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gestion de la sélection de fichiers
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Vérifier le nombre total de photos
    if (photos.length + files.length > maxPhotos) {
      setUploadError(`Maximum ${maxPhotos} photos autorisées`);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Convertir FileList en Array
      const filesArray = Array.from(files);
      console.log('🎯 PhotoUpload: Début upload de', files.length, 'fichier(s)');
      
      // Upload vers le backend
      const response = await profileApi.uploadPhotos(filesArray);
      console.log('📥 Résultat upload PhotoUpload:', response);
      
      if (!response?.success) {
        throw new Error(response?.message || 'Upload échoué');
      }
      
      console.log('✅ Upload réussi, rechargement du profil...');
      // Recharger le profil complet pour avoir les nouvelles photos avec IDs
      const updatedProfile = await profileApi.getMyProfile();
      console.log('📸 Photos après upload:', updatedProfile.photos?.length || 0);
      
      // Mettre à jour avec les photos du profil
      onPhotosChange(updatedProfile.photos || []);
      
      // Clear error on success
      setUploadError(null);
      
    } catch (error) {
      console.error('❌ Erreur upload PhotoUpload:', error);
      let errorMessage = 'Erreur lors de l\'upload des photos';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Supprimer une photo
  const removePhoto = async (index: number) => {
    const photoToDelete = photos[index];
    
    try {
      // Supprimer du backend si elle a un ID
      if (photoToDelete.id) {
        await profileApi.deletePhoto(photoToDelete.id);
      }
      
      const newPhotos = photos.filter((_, i) => i !== index);
      
      // Si on supprime la photo de profil, faire de la première photo restante la photo de profil
      if (photos[index].is_profile_picture && newPhotos.length > 0) {
        newPhotos[0].is_profile_picture = true;
        // Mettre à jour sur le backend
        if (newPhotos[0].id) {
          await profileApi.setProfilePicture(newPhotos[0].id);
        }
      }
      
      onPhotosChange(newPhotos);
    } catch (error) {
      console.error('Erreur suppression photo:', error);
      setUploadError('Erreur lors de la suppression');
    }
  };

  // Définir comme photo de profil
  const setAsProfilePicture = async (index: number) => {
    try {
      const photoToSet = photos[index];
      if (photoToSet.id) {
        await profileApi.setProfilePicture(photoToSet.id);
        
        // Mettre à jour localement
        const newPhotos = photos.map((photo, i) => ({
          ...photo,
          is_profile_picture: i === index
        }));
        onPhotosChange(newPhotos);
      }
    } catch (error) {
      console.error('Erreur définition photo de profil:', error);
      setUploadError('Erreur lors de la mise à jour');
    }
  };

  // Obtenir l'URL d'une photo (via l'API qui sert depuis la DB)
  const getPhotoUrl = (photo: Photo): string => {
    if (photo.preview) return photo.preview;
    return `http://localhost:3001/api/profile/photos/${photo.id}/image`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-twilight">
          Photos ({photos.length}/{maxPhotos})
        </h3>
        
        {photos.length < maxPhotos && (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Upload...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Ajouter des photos
              </>
            )}
          </Button>
        )}
      </div>

      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {uploadError}
        </div>
      )}

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Grille des photos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <AnimatePresence>
          {photos.map((photo, index) => (
            <motion.div
              key={photo.filename}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group"
            >
              {/* Image */}
              <img
                src={getPhotoUrl(photo)}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Badge photo de profil */}
              {photo.is_profile_picture && (
                <div className="absolute top-2 left-2 bg-primary text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3" fill="currentColor" />
                  Profil
                </div>
              )}

              {/* Overlay avec actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                {!photo.is_profile_picture && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setAsProfilePicture(index)}
                    className="text-xs"
                  >
                    <Star className="w-3 h-3" />
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removePhoto(index)}
                  className="text-xs"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Zone d'ajout si pas au maximum */}
        {photos.length < maxPhotos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Ajouter</span>
          </motion.div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-sm text-twilight/60 space-y-1">
        <p>• Maximum {maxPhotos} photos (JPEG, PNG, GIF)</p>
        <p>• Taille maximum : 5MB par photo</p>
        <p>• La première photo devient votre photo de profil</p>
        <p>• Cliquez sur ⭐ pour changer la photo de profil</p>
      </div>
    </div>
  );
}; 
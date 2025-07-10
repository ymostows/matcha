import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Camera, AlertCircle, Star, Crown } from 'lucide-react';
import { Button } from '../ui/button';
import { profileApi } from '../../services/profileApi';

interface Photo {
  id?: number;
  filename: string;
  is_profile_picture: boolean;
}

interface PhotoUploadAdvancedProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  onSave?: () => void;
}

export const PhotoUploadAdvanced: React.FC<PhotoUploadAdvancedProps> = ({ 
  photos, 
  onPhotosChange,
  onSave
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les photos réelles au montage du composant
  useEffect(() => {
    const loadRealPhotos = async () => {
      try {
        const profile = await profileApi.getMyProfile();
        const realPhotos = profile.photos || [];
        
        setCurrentPhotos(realPhotos);
        onPhotosChange(realPhotos);
      } catch (error) {
        setCurrentPhotos([]);
      }
    };
    
    loadRealPhotos();
  }, []); // Retiré onPhotosChange de la dépendance pour éviter les boucles

  // Utiliser currentPhotos au lieu de photos directement
  const displayPhotos = currentPhotos.length > 0 ? currentPhotos : photos;
  
  // Debug : logs pour comprendre l'état des photos
  // console.log('🔍 PhotoUploadAdvanced render:', {
  //   'currentPhotos.length': currentPhotos.length,
  //   'photos.length': photos.length,
  //   'displayPhotos.length': displayPhotos.length,
  //   'currentPhotos': currentPhotos.map(p => ({ id: p.id, filename: p.filename })),
  //   'displayPhotos': displayPhotos.map(p => ({ id: p.id, filename: p.filename }))
  // });
  
  const profilePicture = displayPhotos.find(p => p.is_profile_picture);
  const otherPhotos = displayPhotos.filter(p => !p.is_profile_picture);

  // Upload des photos
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Vérifier le nombre total de photos
    if (displayPhotos.length + files.length > 5) {
      setUploadError(`Maximum 5 photos autorisées (actuellement ${displayPhotos.length})`);
      return;
    }


    setIsUploading(true);
    setUploadError(null);

    try {
      const filesArray = Array.from(files);
      
      const uploadResult = await profileApi.uploadPhotos(filesArray);
      
      if (!uploadResult?.success) {
        throw new Error(uploadResult?.message || 'Upload échoué');
      }
      
      // Recharger le profil pour avoir les nouvelles photos
      const updatedProfile = await profileApi.getMyProfile();
      
      setCurrentPhotos(updatedProfile.photos || []);
      onPhotosChange(updatedProfile.photos || []);
      
      // Message de succès temporaire
      setUploadError(null);
      
    } catch (error) {
      let errorMessage = 'Erreur upload';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Supprimer une photo
  const removePhoto = async (photoId: number) => {
    try {
      await profileApi.deletePhoto(photoId);
      
      const newPhotos = displayPhotos.filter(p => p.id !== photoId);
      setCurrentPhotos(newPhotos);
      onPhotosChange(newPhotos);
    } catch (error) {
      console.error('Erreur suppression:', error);
      setUploadError('Erreur lors de la suppression');
    }
  };

  // Définir comme photo de profil
  const setAsProfilePicture = async (photoId: number) => {
    try {
      await profileApi.setProfilePicture(photoId);
      
      // Recharger les photos pour avoir le statut mis à jour
      const updatedProfile = await profileApi.getMyProfile();
      setCurrentPhotos(updatedProfile.photos || []);
      onPhotosChange(updatedProfile.photos || []);
    } catch (error) {
      console.error('Erreur définition photo de profil:', error);
      setUploadError('Erreur lors de la définition de la photo de profil');
    }
  };

  // URL des photos
  const getPhotoUrl = (photo: Photo): string => {
    if (!photo.id) {
      return 'https://via.placeholder.com/200x200?text=No+ID';
    }
    return `http://localhost:3001/api/photos/${photo.id}/image`;
  };

  return (
    <div className="space-y-8">
      {/* Titre */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-twilight">Mes Photos</h2>
        </div>
        <p className="text-twilight/60">Gérez vos photos de profil ({displayPhotos.length}/5)</p>
      </div>

      {/* Erreur */}
      {uploadError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-red-700 text-sm">{uploadError}</p>
        </motion.div>
      )}

      {/* Section Photo de Profil Principale */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-twilight flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          Photo de Profil Principale
        </h3>
        
        <div className="flex justify-center">
          {profilePicture ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group"
            >
              <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-yellow-400">
                <img
                  src={getPhotoUrl(profilePicture)}
                  alt="Photo de profil"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x200?text=Error';
                  }}
                />
              </div>
              
              {/* Badge photo de profil */}
              <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full p-2 shadow-lg">
                <Crown className="w-4 h-4" />
              </div>
              
              {/* Bouton supprimer */}
              <button
                onClick={() => profilePicture.id && removePhoto(profilePicture.id)}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <div className="w-48 h-48 rounded-2xl border-4 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
              <Camera className="w-12 h-12 mb-2" />
              <p className="text-sm text-center">Aucune photo de profil<br />Définissez-en une ci-dessous</p>
            </div>
          )}
        </div>
      </div>

      {/* Section Autres Photos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-twilight flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Autres Photos ({otherPhotos.length})
        </h3>
        
        {otherPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AnimatePresence>
              {otherPhotos.map((photo) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group hover:shadow-lg transition-shadow"
                >
                  <img
                    src={getPhotoUrl(photo)}
                    alt={`Photo ${photo.id}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x200?text=Error';
                    }}
                  />
                  
                  {/* Overlay avec actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Button
                      type="button"
                      onClick={() => photo.id && setAsProfilePicture(photo.id)}
                      className="text-white bg-black/50 hover:bg-black/80"
                      size="sm"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Principale
                    </Button>
                    <Button
                      type="button"
                      onClick={() => photo.id && removePhoto(photo.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucune photo supplémentaire</p>
            <p className="text-gray-400 text-sm">Ajoutez des photos pour enrichir votre profil</p>
          </div>
        )}
      </div>

      {/* Bouton d'upload */}
      {displayPhotos.length < 5 && (
        <div className="text-center">
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-200"
            size="lg"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {displayPhotos.length === 0 ? 'Ajouter mes premières photos' : 'Ajouter une photo'}
              </>
            )}
          </Button>
          
          <p className="text-gray-500 text-sm mt-2">
            Formats acceptés : JPEG, PNG, GIF, WebP • Max 5Mo par photo
          </p>
        </div>
      )}

      {/* Conseils */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Conseils pour de belles photos :</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Choisissez une photo de profil où votre visage est bien visible</li>
          <li>• Variez les angles et les situations dans vos autres photos</li>
          <li>• Utilisez un bon éclairage naturel</li>
          <li>• Montrez vos hobbies et votre personnalité</li>
        </ul>
      </div>

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
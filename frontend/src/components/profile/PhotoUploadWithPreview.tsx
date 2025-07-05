import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Camera, Star, Crown, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { profileApi } from '../../services/profileApi';

interface Photo {
  id?: number;
  filename: string;
  is_profile_picture: boolean;
  upload_date?: string;
  preview?: string; // URL de preview pour les nouvelles photos
  file?: File; // Fichier original pour les nouvelles photos
}

interface PhotoUploadWithPreviewProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
  onSave?: () => void;
}

export const PhotoUploadWithPreview: React.FC<PhotoUploadWithPreviewProps> = ({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 5,
  onSave
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]); // Photos en attente d'upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combiner photos existantes et photos en attente
  const allPhotos = [...photos, ...pendingPhotos];
  
  // Sélection de fichiers avec preview
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Vérifier le nombre total de photos
    if (allPhotos.length + files.length > maxPhotos) {
      setUploadError(`Maximum ${maxPhotos} photos autorisées`);
      return;
    }

    const newPendingPhotos: Photo[] = [];
    
    Array.from(files).forEach((file, index) => {
      // Créer une URL de preview
      const previewUrl = URL.createObjectURL(file);
      
      const photoPreview: Photo = {
        filename: file.name,
        is_profile_picture: false,
        preview: previewUrl,
        file: file
      };
      
      newPendingPhotos.push(photoPreview);
    });

    setPendingPhotos(prev => [...prev, ...newPendingPhotos]);
    setUploadError(null);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Supprimer une photo en attente (avant upload)
  const removePendingPhoto = (index: number) => {
    const photoToRemove = pendingPhotos[index];
    
    // Libérer l'URL de preview
    if (photoToRemove.preview) {
      URL.revokeObjectURL(photoToRemove.preview);
    }
    
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Définir une photo en attente comme photo de profil
  const setPendingAsProfilePicture = (index: number) => {
    setPendingPhotos(prev => prev.map((photo, i) => ({
      ...photo,
      is_profile_picture: i === index
    })));
  };

  // Upload toutes les photos en attente
  const uploadAllPendingPhotos = async () => {
    if (pendingPhotos.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Préparer les fichiers
      const files = pendingPhotos.map(photo => photo.file).filter(file => file !== undefined) as File[];
      
      if (files.length === 0) {
        throw new Error('Aucun fichier valide à uploader');
      }

      // Upload vers le backend
      const response = await profileApi.uploadPhotos(files);
      
      if (!response?.success) {
        throw new Error(response?.message || 'Upload échoué');
      }

      // Recharger le profil complet pour avoir les nouvelles photos avec IDs
      const updatedProfile = await profileApi.getMyProfile();
      
      // Mettre à jour avec les photos du profil
      onPhotosChange(updatedProfile.photos || []);
      
      // Nettoyer les photos en attente et leurs URLs
      pendingPhotos.forEach(photo => {
        if (photo.preview) {
          URL.revokeObjectURL(photo.preview);
        }
      });
      setPendingPhotos([]);
      
      // Clear error on success
      setUploadError(null);
      
    } catch (error) {
      let errorMessage = 'Erreur lors de l\'upload des photos';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // Supprimer une photo existante (déjà uploadée)
  const removeExistingPhoto = async (photoId: number) => {
    try {
      await profileApi.deletePhoto(photoId);
      
      const newPhotos = photos.filter(photo => photo.id !== photoId);
      onPhotosChange(newPhotos);
    } catch (error) {
      console.error('Erreur suppression photo:', error);
      setUploadError('Erreur lors de la suppression');
    }
  };

  // Définir une photo existante comme photo de profil
  const setExistingAsProfilePicture = async (photoId: number) => {
    try {
      await profileApi.setProfilePicture(photoId);
      
      // Mettre à jour localement
      const newPhotos = photos.map(photo => ({
        ...photo,
        is_profile_picture: photo.id === photoId
      }));
      onPhotosChange(newPhotos);
    } catch (error) {
      console.error('Erreur définition photo de profil:', error);
      setUploadError('Erreur lors de la mise à jour');
    }
  };

  // Obtenir l'URL d'une photo
  const getPhotoUrl = (photo: Photo): string => {
    if (photo.preview) return photo.preview;
    if (photo.id) return `http://localhost:3001/api/photos/${photo.id}/image`;
    return 'https://via.placeholder.com/200x200?text=No+Image';
  };

  // Séparer photos de profil et autres photos
  const profilePicture = allPhotos.find(p => p.is_profile_picture);
  const otherPhotos = allPhotos.filter(p => !p.is_profile_picture);

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-twilight">Mes Photos</h2>
        </div>
        <p className="text-twilight/60">
          Gérez vos photos de profil ({allPhotos.length}/{maxPhotos})
          {pendingPhotos.length > 0 && (
            <span className="ml-2 text-orange-600">
              • {pendingPhotos.length} photo(s) en attente
            </span>
          )}
        </p>
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

      {/* Photos en attente d'upload */}
      {pendingPhotos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-twilight flex items-center gap-2">
              <Camera className="w-5 h-5 text-orange-500" />
              Photos en attente ({pendingPhotos.length})
            </h3>
            <Button
              onClick={uploadAllPendingPhotos}
              disabled={isUploading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Upload...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Uploader toutes
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pendingPhotos.map((photo, index) => (
              <motion.div
                key={`pending-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group"
              >
                <div className={`aspect-square rounded-xl overflow-hidden shadow-md border-2 ${
                  photo.is_profile_picture ? 'border-orange-400' : 'border-gray-200'
                }`}>
                  <img
                    src={photo.preview}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay avec actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex gap-2">
                      {/* Bouton définir comme photo de profil */}
                      <button
                        onClick={() => setPendingAsProfilePicture(index)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          photo.is_profile_picture 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-white/80 text-gray-700 hover:bg-white'
                        }`}
                        title="Définir comme photo de profil"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      
                      {/* Bouton supprimer */}
                      <button
                        onClick={() => removePendingPhoto(index)}
                        className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                        title="Supprimer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Badge photo de profil */}
                  {photo.is_profile_picture && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1 shadow-lg">
                      <Crown className="w-3 h-3" />
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 mt-1 truncate">{photo.filename}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Section Photo de Profil Principale */}
      {profilePicture && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-twilight flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Photo de Profil Principale
          </h3>
          
          <div className="flex justify-center">
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
              
              {/* Bouton supprimer (seulement pour les photos uploadées) */}
              {profilePicture.id && (
                <button
                  onClick={() => removeExistingPhoto(profilePicture.id!)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Autres Photos */}
      {otherPhotos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-twilight">
            Autres Photos ({otherPhotos.length})
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {otherPhotos.map((photo, index) => (
              <motion.div
                key={photo.id || `other-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group"
              >
                <div className="aspect-square rounded-xl overflow-hidden shadow-md border-2 border-gray-200">
                  <img
                    src={getPhotoUrl(photo)}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x200?text=Error';
                    }}
                  />
                  
                  {/* Overlay avec actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex gap-2">
                      {/* Bouton définir comme photo de profil */}
                      <button
                        onClick={() => {
                          if (photo.id) {
                            setExistingAsProfilePicture(photo.id);
                          } else {
                            // Pour les photos en attente
                            const pendingIndex = pendingPhotos.findIndex(p => p === photo);
                            if (pendingIndex !== -1) {
                              setPendingAsProfilePicture(pendingIndex);
                            }
                          }
                        }}
                        className="w-8 h-8 bg-white/80 text-gray-700 hover:bg-white rounded-full flex items-center justify-center transition-colors"
                        title="Définir comme photo de profil"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      
                      {/* Bouton supprimer */}
                      <button
                        onClick={() => {
                          if (photo.id) {
                            removeExistingPhoto(photo.id);
                          } else {
                            // Pour les photos en attente
                            const pendingIndex = pendingPhotos.findIndex(p => p === photo);
                            if (pendingIndex !== -1) {
                              removePendingPhoto(pendingIndex);
                            }
                          }
                        }}
                        className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                        title="Supprimer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton d'ajout de photos */}
      {allPhotos.length < maxPhotos && (
        <div className="text-center">
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-200"
            size="lg"
          >
            <Camera className="w-4 h-4" />
            {allPhotos.length === 0 ? 'Ajouter mes premières photos' : 'Ajouter une photo'}
          </Button>
          
          <p className="text-gray-500 text-sm mt-2">
            Formats acceptés : JPEG, PNG, GIF, WebP • Max 5Mo par photo
          </p>
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

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Comment ça marche :</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Sélectionnez vos photos puis cliquez sur "Uploader toutes"</li>
          <li>• Cliquez sur la couronne pour définir une photo de profil</li>
          <li>• Vous pouvez annuler les photos avant l'upload</li>
          <li>• Maximum {maxPhotos} photos au total</li>
        </ul>
      </div>
    </div>
  );
}; 
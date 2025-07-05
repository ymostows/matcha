import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Crown, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { PhotoUploadWithPreview } from './PhotoUploadWithPreview';
import { ProfilePictureSelector } from './ProfilePictureSelector';
import { profileApi } from '../../services/profileApi';

interface Photo {
  id?: number;
  filename: string;
  is_profile_picture: boolean;
  upload_date?: string;
  preview?: string;
  file?: File;
}

export const PhotoTestPage: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les photos existantes
  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const profile = await profileApi.getMyProfile();
      setPhotos(profile.photos || []);
    } catch (error) {
      console.error('Erreur chargement photos:', error);
      setError('Erreur lors du chargement des photos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handlePhotosChange = (newPhotos: Photo[]) => {
    setPhotos(newPhotos);
  };

  const handleBackClick = () => {
    window.history.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-twilight/60">Chargement des photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleBackClick}
              className="hover:bg-white/80"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-twilight">Test Upload Photos</h1>
              <p className="text-twilight/60">
                Testez le nouveau système d'upload avec preview
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadPhotos}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            
            {photos.length > 0 && (
              <Button
                onClick={() => setShowProfileSelector(true)}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <Crown className="w-4 h-4" />
                Changer photo de profil
              </Button>
            )}
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
          >
            {error}
          </motion.div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Photos</p>
                <p className="text-2xl font-bold text-gray-900">{photos.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Photo de profil</p>
                <p className="text-2xl font-bold text-gray-900">
                  {photos.find(p => p.is_profile_picture) ? '✅' : '❌'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Limite</p>
                <p className="text-2xl font-bold text-gray-900">{photos.length}/5</p>
              </div>
            </div>
          </div>
        </div>

        {/* Composant principal */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-8">
            <PhotoUploadWithPreview
              photos={photos}
              onPhotosChange={handlePhotosChange}
              maxPhotos={5}
            />
          </div>
        </div>

        {/* Données de debug */}
        <div className="mt-8 bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Debug - État des photos</h3>
          <div className="space-y-2">
            {photos.map((photo, index) => (
              <div key={photo.id || index} className="flex items-center gap-4 p-3 bg-white rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                  {photo.id && (
                    <img
                      src={`http://localhost:3001/api/photos/${photo.id}/image`}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{photo.filename}</p>
                  <p className="text-sm text-gray-500">
                    ID: {photo.id || 'N/A'} | 
                    Photo de profil: {photo.is_profile_picture ? '✅' : '❌'} |
                    Date: {photo.upload_date || 'N/A'}
                  </p>
                </div>
              </div>
            ))}
            
            {photos.length === 0 && (
              <p className="text-gray-500 text-center py-8">Aucune photo</p>
            )}
          </div>
        </div>

        {/* Sélecteur de photo de profil */}
        {showProfileSelector && (
          <ProfilePictureSelector
            photos={photos.filter(p => p.id) as (Photo & { id: number })[]}
            onPhotoUpdated={handlePhotosChange}
            onClose={() => setShowProfileSelector(false)}
          />
        )}
      </div>
    </div>
  );
}; 
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { Button } from './button';

interface Photo {
  id?: number;
  filename: string;
  is_profile_picture: boolean;
}

interface PhotoViewerProps {
  photos: Photo[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  getPhotoUrl: (photoId: number) => string;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photos,
  initialIndex,
  isOpen,
  onClose,
  getPhotoUrl
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Mettre à jour l'index quand les props changent
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Navigation avec les touches du clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  // Bloquer le scroll du body quand le viewer est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const currentPhoto = photos[currentIndex];

  if (!isOpen || photos.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Header avec contrôles */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {currentPhoto?.is_profile_picture && (
                <div className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-yellow-400/30">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium">Photo de profil</span>
                </div>
              )}
              <div className="text-sm bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                {currentIndex + 1} / {photos.length}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10 rounded-full p-2"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Navigation précédente */}
        {photos.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 rounded-full p-3 transition-all duration-200"
            disabled={photos.length <= 1}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
        )}

        {/* Navigation suivante */}
        {photos.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 rounded-full p-3 transition-all duration-200"
            disabled={photos.length <= 1}
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        )}

        {/* Image principale */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={getPhotoUrl(currentPhoto?.id || 0)}
            alt={`Photo ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=Erreur+chargement';
            }}
          />
          
          {/* Badge photo de profil sur l'image */}
          {currentPhoto?.is_profile_picture && (
            <div className="absolute -top-3 -right-3 bg-yellow-500 text-white rounded-full p-2 shadow-lg">
              <Crown className="w-5 h-5" />
            </div>
          )}
        </motion.div>

        {/* Miniatures en bas */}
        {photos.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex justify-center">
              <div className="flex gap-2 bg-black/30 backdrop-blur-sm rounded-lg p-2 max-w-full overflow-x-auto">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id || index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(index);
                    }}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      index === currentIndex
                        ? 'border-white shadow-lg scale-110'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                  >
                    <img
                      src={getPhotoUrl(photo?.id || 0)}
                      alt={`Miniature ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x64?text=?';
                      }}
                    />
                    
                    {/* Indicateur photo de profil */}
                    {photo.is_profile_picture && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                        <Crown className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 text-white/70 text-sm space-y-1">
          <p>← → Navigation • ESC Fermer</p>
          {photos.length > 1 && <p>Cliquez sur les miniatures pour naviguer</p>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 
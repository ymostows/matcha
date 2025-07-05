import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Heart, 
  MapPin, 
  Calendar, 
  Star, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight,
  Users
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CompleteProfile } from '../../services/profileApi';

interface ProfileDetailModalProps {
  profile: CompleteProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onLike: (profileId: number) => void;
  onReject: (profileId: number) => void;
  userProfile?: CompleteProfile;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  profile,
  isOpen,
  onClose,
  onLike,
  onReject,
  userProfile
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    if (isOpen && profile) {
      setCurrentPhotoIndex(0);
    }
  }, [isOpen, profile]);

  if (!profile) return null;

  const photos = profile.photos || [];
  const profilePicture = photos.find(p => p.is_profile_picture) || photos[0];

  const calculateCommonInterests = () => {
    if (!userProfile?.interests || !profile.interests) return [];
    
    const userInterests = Array.isArray(userProfile.interests) 
      ? userProfile.interests.map((i: any) => typeof i === 'string' ? i : i.name)
      : [];
    
    const profileInterests = profile.interests.map((i: any) => 
      typeof i === 'string' ? i : i.name
    );

    return userInterests.filter((interest: string) => 
      profileInterests.some((pInterest: string) => 
        pInterest.toLowerCase() === interest.toLowerCase()
      )
    );
  };

  const getPhotoUrl = (photoId: number): string => {
    return `http://localhost:3001/api/profile/photos/${photoId}/image`;
  };

  const getProfilePicture = (profile: CompleteProfile): string => {
    if (!photos || photos.length === 0) {
      // Créer une image placeholder avec les initiales
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      const initials = name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase();
      const bgColor = profile.gender === 'homme' ? '#3B82F6' : '#EC4899';
      
      const svg = `<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="120" fill="white" text-anchor="middle" dominant-baseline="middle">
          ${initials}
        </text>
      </svg>`;
      
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    }
    
    return getPhotoUrl(photos[currentPhotoIndex].id);
  };

  const nextPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  const calculateAge = (profile: CompleteProfile): number => {
    return profile.age || 0;
  };

  const getDistance = () => {
    // TODO: Implémenter le calcul de distance réelle
    return `${Math.floor(Math.random() * 50) + 1} km`;
  };

  const commonInterests = calculateCommonInterests();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden"
          >
            <Card className="bg-white shadow-2xl">
              <div className="relative">
                {/* Header avec bouton fermer */}
                <div className="absolute top-4 right-4 z-20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 border-2 border-white/30"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 min-h-[600px]">
                  {/* Section Photos */}
                  <div className="relative bg-gray-100">
                    {photos.length > 0 ? (
                      <>
                        <img
                          src={getProfilePicture(profile)}
                          alt={`${profile.first_name} ${profile.last_name}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback vers un placeholder en cas d'erreur
                            const target = e.target as HTMLImageElement;
                            const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                            const initials = name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase() || '?';
                            const bgColor = profile.gender === 'homme' ? '#3B82F6' : '#EC4899';
                            
                            const svg = `<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
                              <rect width="100%" height="100%" fill="${bgColor}"/>
                              <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="120" fill="white" text-anchor="middle" dominant-baseline="middle">
                                ${initials}
                              </text>
                            </svg>`;
                            
                            target.src = `data:image/svg+xml;base64,${btoa(svg)}`;
                          }}
                        />

                        {/* Navigation photos */}
                        {photos.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={prevPhoto}
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 border-2 border-white/30"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={nextPhoto}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 border-2 border-white/30"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </Button>

                            {/* Indicateurs de photo */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                              {photos.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => setCurrentPhotoIndex(index)}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    index === currentPhotoIndex 
                                      ? 'bg-white' 
                                      : 'bg-white/50'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {/* Fame rating badge */}
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-black/50 text-white backdrop-blur-sm">
                            <Star className="w-3 h-3 mr-1" fill="currentColor" />
                            {profile.fame_rating || 0}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Users className="w-24 h-24 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Section Informations */}
                  <CardContent className="p-6 overflow-y-auto">
                    <div className="space-y-6">
                      {/* Nom et infos de base */}
                      <div>
                        <h2 className="text-3xl font-bold text-twilight mb-2">
                          {profile.first_name} {profile.last_name}
                        </h2>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-twilight/70">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{calculateAge(profile)} ans</span>
                          </div>
                          {profile.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{profile.city}</span>
                              <span className="text-primary">• {getDistance()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Biographie */}
                      {profile.biography && (
                        <div>
                          <h3 className="text-lg font-semibold text-twilight mb-3">À propos</h3>
                          <p className="text-twilight/80 leading-relaxed">
                            {profile.biography}
                          </p>
                        </div>
                      )}

                      {/* Intérêts */}
                      {profile.interests && profile.interests.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-twilight mb-3">Centres d'intérêt</h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.interests.map((interest: any, index) => {
                              const interestName = typeof interest === 'string' ? interest : interest.name;
                              const isCommon = commonInterests.includes(interestName);
                              
                              return (
                                <Badge
                                  key={index}
                                  variant={isCommon ? "default" : "secondary"}
                                  className={`px-3 py-1 ${
                                    isCommon 
                                      ? 'bg-gradient-to-r from-primary to-accent text-white ring-2 ring-primary/20' 
                                      : ''
                                  }`}
                                >
                                  {isCommon && <Heart className="w-3 h-3 mr-1" fill="currentColor" />}
                                  {interestName}
                                </Badge>
                              );
                            })}
                          </div>
                          
                          {commonInterests.length > 0 && (
                            <p className="text-sm text-primary font-medium mt-2">
                              <Heart className="w-4 h-4 inline mr-1" fill="currentColor" />
                              {commonInterests.length} intérêt{commonInterests.length > 1 ? 's' : ''} en commun
                            </p>
                          )}
                        </div>
                      )}

                      {/* Informations supplémentaires */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{photos.length}</div>
                          <div className="text-sm text-twilight/60">Photo{photos.length > 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{profile.fame_rating || 0}</div>
                          <div className="text-sm text-twilight/60">Fame Rating</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={() => {
                            onReject(profile.id);
                            onClose();
                          }}
                          variant="outline"
                          className="flex-1 h-12 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                        >
                          <X className="w-5 h-5 mr-2" />
                          Passer
                        </Button>
                        <Button
                          onClick={() => {
                            onLike(profile.id);
                            onClose();
                          }}
                          className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                        >
                          <Heart className="w-5 h-5 mr-2" />
                          J'aime
                        </Button>
                      </div>

                      {/* Bouton message (si match) */}
                      {/* TODO: Implémenter la logique de match */}
                      <Button
                        variant="outline"
                        className="w-full h-12 text-primary border-primary hover:bg-primary/5"
                        disabled
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Envoyer un message
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}; 
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, MapPin, Users, Calendar, Star, Camera, 
  Edit, ArrowLeft, MessageCircle, Gift 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { profileApi } from '../../services/profileApi';

interface ProfileData {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  sexual_orientation: string;
  biography: string;
  city: string;
  fame_rating: number;
  photos: Array<{
    id: number;
    filename: string;
    is_profile_picture: boolean;
  }>;
  interests: Array<{
    id: number;
    name: string;
  }>;
  last_seen: string;
  created_at: string;
}

export const ProfileViewPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await profileApi.getMyProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPhotoUrl = (filename: string) => {
    return `/api/uploads/${filename}`;
  };

  const getProfilePicture = () => {
    if (!profile?.photos?.length) return null;
    const profilePic = profile.photos.find(p => p.is_profile_picture) || profile.photos[0];
    return getPhotoUrl(profilePic.filename);
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 5) return 'En ligne';
    if (diffInMinutes < 60) return `Vu il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Vu il y a ${Math.floor(diffInMinutes / 60)} h`;
    return `Vu il y a ${Math.floor(diffInMinutes / 1440)} j`;
  };

  const getGenderEmoji = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'male': return '👨';
      case 'female': return '👩';
      default: return '🧑';
    }
  };

  const getOrientationLabel = (orientation: string) => {
    switch (orientation?.toLowerCase()) {
      case 'heterosexual': return 'Hétérosexuel(le)';
      case 'homosexual': return 'Homosexuel(le)';
      case 'bisexual': return 'Bisexuel(le)';
      default: return orientation;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-twilight/60">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-twilight/60 mb-4">Profil non trouvé</p>
          <Button onClick={() => navigate('/dashboard')}>
            Retour au dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header avec navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="text-twilight hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au dashboard
          </Button>
          
          <Button
            onClick={() => navigate('/profile-edit')}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Modifier mon profil
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Photos et info principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Galerie photos */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {profile.photos?.length > 0 ? (
                  <div className="relative">
                    {/* Photo principale */}
                    <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
                      <img
                        src={getPhotoUrl(profile.photos[currentPhotoIndex]?.filename)}
                        alt={`Photo ${currentPhotoIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Indicateur photo de profil */}
                      {profile.photos[currentPhotoIndex]?.is_profile_picture && (
                        <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                          <Star className="w-4 h-4" fill="currentColor" />
                          Photo de profil
                        </div>
                      )}
                      
                      {/* Navigation photos */}
                      {profile.photos.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))}
                            disabled={currentPhotoIndex === 0}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-50"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => setCurrentPhotoIndex(Math.min(profile.photos.length - 1, currentPhotoIndex + 1))}
                            disabled={currentPhotoIndex === profile.photos.length - 1}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-50"
                          >
                            →
                          </button>
                        </>
                      )}
                      
                      {/* Compteur photos */}
                      {profile.photos.length > 1 && (
                        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded-full text-sm">
                          {currentPhotoIndex + 1} / {profile.photos.length}
                        </div>
                      )}
                    </div>
                    
                    {/* Miniatures */}
                    {profile.photos.length > 1 && (
                      <div className="p-4 bg-white">
                        <div className="flex gap-2 overflow-x-auto">
                          {profile.photos.map((photo, index) => (
                            <button
                              key={photo.id}
                              onClick={() => setCurrentPhotoIndex(index)}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                                index === currentPhotoIndex ? 'border-primary' : 'border-gray-200'
                              }`}
                            >
                              <img
                                src={getPhotoUrl(photo.filename)}
                                alt={`Miniature ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[4/5] bg-gradient-to-br from-primary/10 to-sunset/10 flex flex-col items-center justify-center text-twilight/60">
                    <Camera className="w-16 h-16 mb-4" />
                    <p className="text-lg font-medium">Aucune photo</p>
                    <p className="text-sm">Ajoutez des photos pour vous présenter</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Biographie */}
            {profile.biography && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-twilight mb-3 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    À propos de moi
                  </h3>
                  <p className="text-twilight/80 leading-relaxed">{profile.biography}</p>
                </CardContent>
              </Card>
            )}

            {/* Centres d'intérêt */}
            {profile.interests?.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-twilight mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-accent" />
                    Centres d'intérêt
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <Badge
                        key={interest.id}
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        #{interest.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar avec infos */}
          <div className="lg:col-span-1 space-y-6">
            {/* Infos principales */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-twilight mb-1">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <p className="text-twilight/60">@{profile.username}</p>
                  <p className="text-sm text-twilight/50 mt-2">
                    {formatLastSeen(profile.last_seen)}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Âge et genre */}
                  <div className="flex items-center gap-2 text-twilight/70">
                    <span className="text-lg">{getGenderEmoji(profile.gender)}</span>
                    <span>{profile.age} ans</span>
                  </div>

                  {/* Orientation */}
                  <div className="flex items-center gap-2 text-twilight/70">
                    <Heart className="w-4 h-4" />
                    <span>{getOrientationLabel(profile.sexual_orientation)}</span>
                  </div>

                  {/* Localisation */}
                  {profile.city && (
                    <div className="flex items-center gap-2 text-twilight/70">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.city}</span>
                    </div>
                  )}

                  {/* Fame rating */}
                  <div className="flex items-center gap-2 text-twilight/70">
                    <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                    <span>Score de popularité : {profile.fame_rating}/100</span>
                  </div>

                  {/* Date d'inscription */}
                  <div className="flex items-center gap-2 text-twilight/70">
                    <Calendar className="w-4 h-4" />
                    <span>Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions simulées */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-twilight mb-4">
                  Aperçu des actions
                </h3>
                <div className="space-y-3">
                  <Button variant="outline" disabled className="w-full justify-start">
                    <Heart className="w-4 h-4 mr-2" />
                    Liker (vue publique)
                  </Button>
                  <Button variant="outline" disabled className="w-full justify-start">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Envoyer un message
                  </Button>
                  <Button variant="outline" disabled className="w-full justify-start">
                    <Gift className="w-4 h-4 mr-2" />
                    Envoyer un cadeau
                  </Button>
                </div>
                <p className="text-xs text-twilight/60 mt-3">
                  * Ceci est un aperçu de votre profil public
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}; 
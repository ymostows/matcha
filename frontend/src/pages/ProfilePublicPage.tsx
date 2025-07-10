import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  Heart, 
  MapPin, 
  Calendar, 
  User,
  MessageCircle,
  Star,
  Eye,
  Clock,
  CheckCircle,
  Camera
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PhotoViewer } from '../components/ui/PhotoViewer';
import { profileApi, CompleteProfile } from '../services/profileApi';
import { API_BASE_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const ProfilePublicPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<CompleteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Déterminer si c'est notre propre profil
  const isOwnProfile = !userId || (currentUser && userId === currentUser.id?.toString());
  
  // Déterminer si on vient de créer le profil
  const isProfileCreated = location.pathname === '/profile-success';

  const toastShownRef = useRef(false);

  useEffect(() => {
    if (location.state?.showSuccessToast && !toastShownRef.current) {
      toast.success('Profil mis à jour avec succès !');
      toastShownRef.current = true;
      // Nettoyer l'état pour éviter que le toast ne réapparaisse
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      let profileData;
      
      if (isOwnProfile) {
        // Notre propre profil
        profileData = await profileApi.getMyProfile();
      } else {
        // Profil d'un autre utilisateur
        profileData = await profileApi.getProfile(parseInt(userId!));
      }
      
      setProfile(profileData);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      setError('Profil non trouvé');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getPhotoUrl = (photoId: number): string => {
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/api/photos/${photoId}/image`;
  };

  // Ouvrir la visionneuse de photos
  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setIsPhotoViewerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-twilight/60">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <Card className="w-full max-w-md glow-gentle">
          <CardContent className="text-center p-8">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-twilight mb-2">Profil non trouvé</h2>
            <p className="text-twilight/60 mb-6">{error || 'Ce profil n\'existe pas ou n\'est plus disponible.'}</p>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg transition-all duration-200"
            >
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Bannière de succès si profil créé */}
        {isProfileCreated && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Félicitations ! 🎉</h3>
                <p className="text-green-700">Votre profil a été créé avec succès. Voici comment les autres utilisateurs vous verront.</p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Header avec navigation - style cohérent */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-twilight hover:text-primary transition-colors duration-200 self-start"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          
          {isOwnProfile && (
            <Button
              onClick={() => navigate('/profile-edit')}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg transition-all duration-200"
            >
              <User className="w-4 h-4" />
              Modifier mon profil
            </Button>
          )}
        </div>

        {/* Titre principal - style cohérent */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-twilight mb-2">
            {isOwnProfile ? 'Mon ' : ''}
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">profil</span>
          </h1>
          <p className="text-twilight/70 text-lg">
            {isOwnProfile ? 'Voici comment les autres vous voient' : `Découvrez le profil de ${profile.first_name}`}
          </p>
        </motion.div>

        {/* Layout principal - style cohérent avec ProfileEditPage */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Section Header avec info principale */}
          <Card className="mb-6 glow-gentle">
            <CardContent className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-start">
                {/* Photo de profil */}
                <div className="md:col-span-1">
                  {profile.photos && profile.photos.length > 0 ? (
                    <motion.div 
                      className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => openPhotoViewer(profile.photos?.findIndex(p => p.is_profile_picture) || 0)}
                    >
                      <img
                        src={getPhotoUrl(profile.photos.find(p => p.is_profile_picture)?.id ?? profile.photos[0].id)}
                        alt={`${profile.first_name} ${profile.last_name}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Photo';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                          <p className="text-sm font-medium">Voir en grand</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="relative aspect-square bg-gray-100 rounded-2xl flex items-center justify-center">
                      <Camera className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Informations principales */}
                <div className="md:col-span-2 space-y-6">
                  {/* Nom et âge */}
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-twilight mb-2">
                      {profile.first_name} {profile.last_name}
                    </h1>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-twilight/70">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{profile.age} ans</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.city || 'Non spécifié'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Biographie */}
                  {profile.biography && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-twilight mb-2 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-primary" />
                        À propos
                      </h3>
                      <p className="text-twilight/80 leading-relaxed break-words">{profile.biography}</p>
                    </div>
                  )}

                  {/* Centres d'intérêt */}
                  {profile.interests && profile.interests.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-twilight mb-3 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-primary" />
                        Centres d'intérêt
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest, index) => (
                          <motion.span
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-gradient-to-r from-primary/10 to-accent/10 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/20"
                          >
                            {typeof interest === 'string' ? interest : (interest as any).name}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Statistiques */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center bg-primary/10 rounded-xl p-4">
                      <div className="text-2xl font-bold text-primary">{profile.fame_rating || 0}</div>
                      <div className="text-sm text-twilight/60">Fame Rating</div>
                    </div>
                    <div className="text-center bg-accent/10 rounded-xl p-4">
                      <div className="text-2xl font-bold text-accent">{profile.photos?.length || 0}</div>
                      <div className="text-sm text-twilight/60">Photos</div>
                    </div>
                    <div className="text-center bg-green-500/10 rounded-xl p-4">
                      <div className="text-2xl font-bold text-green-500">
                        {profile.interests?.length || 0}
                      </div>
                      <div className="text-sm text-twilight/60">Intérêts</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Galerie de photos */}
          {profile.photos && profile.photos.length > 1 && (
            <Card className="glow-gentle">
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Galerie Photos ({profile.photos.length})
                </CardTitle>
                <CardDescription>
                  Cliquez pour agrandir
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {profile.photos.map((photo, index) => (
                    <motion.div
                      key={photo.id}
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      onClick={() => openPhotoViewer(index)}
                    >
                      <img
                        src={getPhotoUrl(photo.id)}
                        alt={`Photo de ${profile.first_name}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Photo';
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Boutons d'actions - Non flottants pour une meilleure compatibilité */}
          {!isOwnProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3">
                <Button className="w-full bg-peach-gradient shadow-lg">
                  <Heart className="w-4 h-4 mr-2" /> Liker le profil
                </Button>
                <Button variant="outline" className="w-full">
                  <MessageCircle className="w-4 h-4 mr-2" /> Envoyer un message
                </Button>
                <Button variant="ghost" className="w-full text-red-500 hover:bg-red-50 hover:text-red-600">
                  Rejeter
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Visionneuse de photos */}
        {profile?.photos && profile.photos.length > 0 && (
          <PhotoViewer
            photos={profile.photos || []}
            initialIndex={selectedPhotoIndex}
            isOpen={isPhotoViewerOpen}
            onClose={() => setIsPhotoViewerOpen(false)}
            getPhotoUrl={getPhotoUrl}
          />
        )}
      </div>
    </div>
  );
}; 
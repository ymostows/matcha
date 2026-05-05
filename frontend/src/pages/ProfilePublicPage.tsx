import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isUserOnline, formatLastSeen } from '../utils/dateUtils';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  Heart, 
  MapPin, 
  Calendar, 
  User,
  MessageCircle,
  CheckCircle,
  Camera,
  Shield,
  Flag,
  Loader2,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PhotoViewer } from '../components/ui/PhotoViewer';
import { ConfirmDialog, MatchDialog } from '../components/ui/dialog';
import { PromptDialog } from '../components/ui/prompt-dialog';
import { profileApi, CompleteProfile } from '../services/profileApi';

import { getPhotoUrl as getStandardPhotoUrl } from '../utils/imageUtils';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useDialog } from '../hooks/useDialog';
import { LikesHistory } from '../components/matches/LikesHistory';
import { VisitsHistory } from '../components/matches/VisitsHistory';

export const ProfilePublicPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<CompleteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [likeStatus, setLikeStatus] = useState<{
    isLiked: boolean;
    isMatched: boolean;
    hasLikedMe: boolean;
  }>({ isLiked: false, isMatched: false, hasLikedMe: false });
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Hooks pour les notifications et dialogs
  const { success, error: errorToast, warning } = useToast();
  const { 
    dialogState, 
    promptState, 
    matchState, 
    showConfirm, 
    showPrompt, 
    showMatch, 
    closeDialog, 
    closePrompt, 
    closeMatch,
    setDialogLoading,
    setPromptLoading
  } = useDialog();

  // Déterminer si c'est notre propre profil
  const isOwnProfile = !userId || (currentUser && userId === String(currentUser.id));
  
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
    if (!isOwnProfile && userId) {
      loadLikeStatus();
    }
  }, [userId, isOwnProfile]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      let profileData;
      
      if (isOwnProfile) {
        // Notre propre profil
        profileData = await profileApi.getMyProfile();
      } else {
        // Profil d'un autre utilisateur
        const userIdNumber = parseInt(userId!);
        if (isNaN(userIdNumber)) {
          throw new Error('ID utilisateur invalide');
        }
        profileData = await profileApi.getProfile(userIdNumber);
      }
      
      // Debug logs temporaires
      console.log('🔍 DEBUG ProfilePublic - Profil reçu:', profileData);
      console.log('🔍 DEBUG ProfilePublic - Distance:', profileData.distance_km);
      console.log('🔍 DEBUG ProfilePublic - Toutes les clés:', Object.keys(profileData));
      
      setProfile(profileData);
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      setErrorState('Profil non trouvé');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLikeStatus = async () => {
    try {
      const userIdNumber = parseInt(userId!);
      if (isNaN(userIdNumber)) return;

      // Vérifier d'abord si on a un match avec cet utilisateur
      try {
        const matchesResponse = await profileApi.getMatches(100, 0);
        const isMatched = matchesResponse.matches.some(match => match.user_id === userIdNumber);

        // Récupérer l'historique des likes
        const likesHistory = await profileApi.getLikesHistory(100);
        const hasLikedMe = likesHistory.some(like => like.liker_id === userIdNumber);

        // Si on a un match, on considère qu'on s'est likés mutuellement
        setLikeStatus({
          isLiked: isMatched, // Si match, alors on s'est forcément likés
          isMatched,
          hasLikedMe
        });
      } catch (likesError) {
        // Si ça échoue, on utilise des valeurs par défaut
        setLikeStatus({
          isLiked: false,
          isMatched: false,
          hasLikedMe: false
        });
      }
    } catch (err: any) {
      // Initialiser avec des valeurs par défaut
      setLikeStatus({
        isLiked: false,
        isMatched: false,
        hasLikedMe: false
      });
    }
  };




  // Utilisation de l'utilitaire centralisé
  const getPhotoUrl = (photoId: number): string => {
    return getStandardPhotoUrl(photoId);
  };

  // Ouvrir la visionneuse de photos
  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setIsPhotoViewerOpen(true);
  };

  // Gérer le like/unlike
  const handleLike = async () => {
    if (!userId) return;
    
    try {
      setIsActionLoading(true);
      const userIdNumber = parseInt(userId);
      
      if (likeStatus.isLiked || likeStatus.isMatched) {
        // Unlike/Annuler match
        const wasMatched = likeStatus.isMatched;
        const result = await profileApi.unlikeProfile(userIdNumber);
        
        if (result.hadMatch || wasMatched) {
          warning('💔 Le match a été annulé et le chat désactivé.');
        } else {
          success('Like retiré avec succès.');
        }
        setLikeStatus(prev => ({ ...prev, isLiked: false, isMatched: false }));
      } else {
        // Like
        const result = await profileApi.likeProfile(userIdNumber, true);
        if (result.isMatch) {
          showMatch({
            userName: profile?.first_name || 'cet utilisateur',
            onContinue: () => {
              closeMatch();
              setLikeStatus(prev => ({ ...prev, isLiked: true, isMatched: true }));
            }
          });
        } else {
          setLikeStatus(prev => ({ ...prev, isLiked: true }));
          success('Profil liké avec succès !');
        }
      }
    } catch (err: any) {
      console.error('Erreur lors du like:', err);
      const errorMessage = err.message || 'Erreur lors de l\'action';
      
      if (errorMessage.includes('photo')) {
        showConfirm({
          title: 'Photos requises',
          message: `${errorMessage}\n\nVoulez-vous ajouter des photos maintenant ?`,
          type: 'warning',
          confirmText: 'Ajouter des photos',
          onConfirm: () => {
            navigate('/profile-edit');
            closeDialog();
          }
        });
      } else if (errorMessage.includes('match')) {
        // Si l'erreur indique qu'on est déjà en match, on met à jour le state
        setLikeStatus(prev => ({ ...prev, isLiked: true, isMatched: true }));
        warning('Vous êtes déjà en match avec cette personne ! 💕');
      } else {
        errorToast(errorMessage);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  // Gérer le blocage
  const handleBlock = async () => {
    if (!userId) return;
    
    showConfirm({
      title: 'Bloquer cet utilisateur',
      message: 'Êtes-vous sûr de vouloir bloquer cet utilisateur ? Cette action supprimera toutes vos interactions et est irréversible.',
      type: 'danger',
      confirmText: 'Bloquer',
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const userIdNumber = parseInt(userId);
          await profileApi.blockUser(userIdNumber);
          success('Utilisateur bloqué avec succès');
          closeDialog();
          navigate('/browsing'); // Rediriger vers la page de navigation
        } catch (err: any) {
          console.error('Erreur lors du blocage:', err);
          const errorMessage = err.message || 'Erreur lors du blocage';
          errorToast(errorMessage);
        } finally {
          setDialogLoading(false);
        }
      }
    });
  };

  // Gérer le signalement
  const handleReport = async () => {
    if (!userId) return;
    
    showPrompt({
      title: 'Signaler ce profil',
      message: 'Pourquoi signalez-vous ce profil comme faux compte ?',
      placeholder: 'Raison du signalement...',
      confirmText: 'Signaler',
      required: true,
      onSubmit: async (reason) => {
        try {
          setPromptLoading(true);
          const userIdNumber = parseInt(userId);
          await profileApi.reportUser(userIdNumber, reason);
          success('Signalement enregistré avec succès. Merci de nous aider à maintenir la qualité de la communauté.');
          closePrompt();
        } catch (err: any) {
          console.error('Erreur lors du signalement:', err);
          const errorMessage = err.message || 'Erreur lors du signalement';
          errorToast(errorMessage);
        } finally {
          setPromptLoading(false);
        }
      }
    });
  };

  // Gérer le chat
  const handleChat = () => {
    navigate('/conversations');
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

  if (errorState || !profile) {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <Card className="w-full max-w-md glow-gentle">
          <CardContent className="text-center p-8">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-twilight mb-2">Profil non trouvé</h2>
            <p className="text-twilight/60 mb-6">{errorState || 'Ce profil n\'existe pas ou n\'est plus disponible.'}</p>
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
    <div className="py-8 px-4 min-h-screen">
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
        <div className="max-w-4xl mx-auto space-y-6 flex flex-col">
          {/* Section Header avec info principale */}
          <Card className="mb-6 glow-gentle flex-1">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-start">
                {/* Photo de profil */}
                <div className="md:col-span-1 flex justify-center md:justify-start">
                  {profile.photos && profile.photos.length > 0 ? (
                    <motion.div 
                      className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 w-full max-w-xs md:max-w-none"
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
                <div className="md:col-span-2 space-y-4 sm:space-y-6">
                  {/* Nom et âge */}
                  <div className="text-center md:text-left">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 mb-2">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-twilight">
                        {profile.first_name} {profile.last_name}
                      </h1>
                      {!isOwnProfile && (
                        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
                          {likeStatus.isMatched && (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                              <Heart className="w-3 h-3 fill-current" />
                              Connecté
                            </span>
                          )}
                          {!likeStatus.isMatched && likeStatus.hasLikedMe && (
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              Vous aime
                            </span>
                          )}
                          {!likeStatus.isMatched && likeStatus.isLiked && (
                            <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                              <Heart className="w-3 h-3 fill-current" />
                              Liké
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-twilight/70 justify-center sm:justify-start">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{profile.age} ans</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {profile.city || 'Non spécifié'}
                          {profile.distance_km !== undefined && profile.distance_km !== null && profile.distance_km < 999999 && (
                            <span className="ml-1 text-xs text-twilight/60">
                              • {profile.distance_km < 1 ? '<1' : Math.round(profile.distance_km)} km
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isUserOnline(profile.last_seen) ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className="text-sm">
                          {isUserOnline(profile.last_seen) ? 'En ligne' : `Vu ${formatLastSeen(profile.last_seen)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Biographie */}
                  {profile.biography && (
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6 text-center md:text-left">
                      <h3 className="font-semibold text-twilight mb-3 flex items-center justify-center md:justify-start gap-2">
                        <Heart className="w-4 h-4 text-primary" />
                        À propos
                      </h3>
                      <div className="text-twilight/80 leading-relaxed break-words overflow-hidden">
                        <p className={`
                          ${profile.biography.length > 200 ? 'text-sm sm:text-base' : 'text-base'}
                          ${profile.biography.length > 500 ? 'leading-snug' : 'leading-relaxed'}
                          whitespace-pre-wrap
                        `}>
                          {profile.biography}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Centres d'intérêt */}
                  {profile.interests && profile.interests.length > 0 && (
                    <div className="text-center md:text-left">
                      <h3 className="font-semibold text-twilight mb-3 flex items-center justify-center md:justify-start gap-2">
                        <Heart className="w-4 h-4 text-primary" />
                        Centres d'intérêt
                      </h3>
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
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
                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto md:mx-0">
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

          {/* Historique des likes - Seulement pour notre profil */}
          {isOwnProfile && (
            <Card className="glow-gentle">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" fill="currentColor" />
                  Likes reçus
                </CardTitle>
                <CardDescription>
                  Découvrez qui s'intéresse à votre profil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LikesHistory
                  limit={20}
                  showHeader={false}
                  compact={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Historique des visites - Seulement pour notre profil */}
          {isOwnProfile && (
            <VisitsHistory
              limit={20}
              showHeader={true}
              compact={false}
            />
          )}

          {/* Boutons d'actions - Fonctionnels */}
          {!isOwnProfile && (
            <Card className="flex-1 flex flex-col justify-center">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-4 sm:p-6 flex-1 flex flex-col justify-center">
                {/* Bouton principal - Like/Unlike */}
                <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                  <Button 
                    className={`w-full py-4 sm:py-3 text-base sm:text-sm ${(likeStatus.isLiked || likeStatus.isMatched) ? 'bg-red-500 hover:bg-red-600' : 'bg-pink-500 hover:bg-pink-600'}`}
                    onClick={handleLike}
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (likeStatus.isLiked || likeStatus.isMatched) ? (
                      <X className="w-4 h-4 mr-2" />
                    ) : (
                      <Heart className="w-4 h-4 mr-2" />
                    )}
                    {likeStatus.isMatched ? 'Annuler le match' : likeStatus.isLiked ? 'Retirer le like' : 'Liker le profil'}
                  </Button>
                  
                  {likeStatus.isMatched && (
                    <Button 
                      variant="outline" 
                      className="w-full py-4 sm:py-3 text-base sm:text-sm bg-primary text-white hover:bg-primary/90 border-primary" 
                      onClick={handleChat}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat
                    </Button>
                  )}
                </div>

                {/* Boutons secondaires */}
                <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                  <Button 
                    variant="outline" 
                    className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 py-4 sm:py-3 text-base sm:text-sm"
                    onClick={handleReport}
                    disabled={isActionLoading}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Signaler
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 py-4 sm:py-3 text-base sm:text-sm"
                    onClick={handleBlock}
                    disabled={isActionLoading}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Bloquer
                  </Button>
                </div>
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
      
      {/* Dialogs */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        onConfirm={dialogState.onConfirm}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        isLoading={dialogState.isLoading}
      />
      
      <PromptDialog
        isOpen={promptState.isOpen}
        onClose={closePrompt}
        onSubmit={promptState.onSubmit}
        title={promptState.title}
        message={promptState.message}
        placeholder={promptState.placeholder}
        confirmText={promptState.confirmText}
        cancelText={promptState.cancelText}
        isLoading={promptState.isLoading}
        required={promptState.required}
      />
      
      <MatchDialog
        isOpen={matchState.isOpen}
        onClose={closeMatch}
        userName={matchState.userName}
        onMessage={matchState.onMessage}
        onContinue={matchState.onContinue}
      />
    </div>
  );
}; 
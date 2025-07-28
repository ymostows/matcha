import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ServerCrash, Heart, MapPin, Search, X, Filter, SortAsc, SortDesc, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { profileApi, CompleteProfile } from '@/services/profileApi';
import { getPhotoUrl as getStandardPhotoUrl } from '@/utils/imageUtils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useDialog } from '@/hooks/useDialog';
import { ConfirmDialog, MatchDialog } from '@/components/ui/dialog';

const ProfileCard: React.FC<{ 
  profile: CompleteProfile; 
  onLike: (userId: number) => void;
  onUnlike?: (userId: number) => void;
  isLiked?: boolean;
  isLoading?: boolean;
}> = ({ profile, onLike, onUnlike, isLiked = false, isLoading = false }) => {
  const navigate = useNavigate();
  const profilePhoto = profile.photos?.find(p => p.is_profile_picture) || profile.photos?.[0];
  
  // Utilisation de l'utilitaire centralisé
  const getPhotoUrl = (photoId: number): string => {
    return getStandardPhotoUrl(photoId);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group bg-white border border-gray-100"
    >
      <div className="relative overflow-hidden">
        <div className="transition-transform duration-300 group-hover:scale-105">
          <img 
            src={profilePhoto ? 
              getPhotoUrl(profilePhoto.id) : 
              'https://placehold.co/400x500?text=Photo'
            }
            alt={`${profile.first_name} ${profile.last_name}`}
            className="w-full h-64 object-cover cursor-pointer"
            onClick={() => navigate(`/profile/${profile.user_id}`)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('placehold.co')) {
                target.src = 'https://placehold.co/400x500?text=Photo';
              }
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-end justify-between">
            <div className="flex-1 min-w-0 max-w-[60%]">
              <h3 className="text-lg font-bold cursor-pointer text-white drop-shadow-lg" onClick={() => navigate(`/profile/${profile.user_id}`)}>
                {profile.first_name}, {profile.age}
              </h3>
              <div className="flex items-center text-sm text-white/90 drop-shadow-md">
                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {profile.city || 'Non spécifié'}
                  {profile.distance_km !== undefined && profile.distance_km !== null && (
                    <span className="ml-1 text-xs opacity-80">
                      • {profile.distance_km < 1 ? '<1' : Math.round(profile.distance_km)} km
                    </span>
                  )}
                </span>
              </div>
            </div>
            {profile.interests && profile.interests.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                <div className="flex gap-1">
                  {profile.interests.slice(0, 2).map((interest, index) => (
                    <span key={index} className="bg-white/90 text-gray-800 px-2 py-1 rounded-full text-xs font-medium max-w-20 overflow-hidden text-ellipsis whitespace-nowrap">
                      {interest}
                    </span>
                  ))}
                </div>
                {profile.interests.length > 2 && (
                  <span className="text-xs text-white/75 font-medium">+{profile.interests.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-gray-800 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-md">
          <Heart className="w-3 h-3 text-pink-500" /> {profile.likes_count || 0}
        </div>
        </div>
      </div>
      <div className="p-3 flex gap-2">
        {!isLiked ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
              onClick={() => navigate(`/profile/${profile.user_id}`)}
            >
              <User className="w-4 h-4 mr-1" />
              Profil
            </Button>
            <Button 
              size="sm" 
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
              onClick={() => onLike(profile.user_id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Heart className="w-4 h-4 mr-1" />
              )}
              J'aime
            </Button>
          </>
        ) : (
          <Button 
            variant="outline"
            size="sm" 
            className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
            onClick={() => onUnlike?.(profile.user_id)}
          >
            <X className="w-4 h-4 mr-1" />
            Annuler
          </Button>
        )}
      </div>
    </motion.div>
  );
};

const BrowsingPage: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<CompleteProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loadingActions, setLoadingActions] = useState<Set<number>>(new Set());
  
  // Hooks pour les notifications et dialogs
  const { success, error: errorToast, warning } = useToast();
  const { 
    matchState, 
    showMatch, 
    closeMatch,
    showConfirm,
    closeDialog,
    dialogState
  } = useDialog();
  
  // Filtres et tri
  const [sortBy, setSortBy] = useState<'distance' | 'age' | 'fame_rating' | 'common_tags' | 'intelligent'>('intelligent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 65]);
  const [maxDistance, setMaxDistance] = useState<number>(1000);
  const [fameRange, setFameRange] = useState<[number, number]>([0, 100]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const getSortLabel = (value: string) => {
    switch (value) {
      case 'intelligent': return 'Matching intelligent';
      case 'distance': return 'Distance';
      case 'age': return 'Âge';
      case 'fame_rating': return 'Popularité';
      case 'common_tags': return 'Intérêts communs';
      default: return 'Matching intelligent';
    }
  };

  const fetchProfiles = async () => {
    try {
      setIsLoading(true);
      setErrorState(null);
      const fetchedProfiles = await profileApi.browseProfiles({
        sortBy,
        sortOrder,
        ageMin: ageRange[0],
        ageMax: ageRange[1],
        maxDistance,
        minFameRating: fameRange[0],
        maxFameRating: fameRange[1],
        commonTags: selectedTags
      });
      setProfiles(fetchedProfiles);
    } catch (err) {
      setErrorState("Impossible de charger les profils pour le moment.");
    } finally {
      setIsLoading(false);
    }
  };

  // Ajuster automatiquement l'ordre de tri selon le type de tri
  useEffect(() => {
    if (sortBy === 'common_tags' || sortBy === 'fame_rating') {
      // Pour les intérêts communs et la popularité, on veut les plus élevés en premier
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      }
    } else if (sortBy === 'distance' || sortBy === 'age') {
      // Pour la distance et l'âge, on veut les plus faibles en premier
      if (sortOrder === 'desc') {
        setSortOrder('asc');
      }
    }
    // Pour le tri intelligent, on garde l'ordre actuel (il a sa propre logique)
  }, [sortBy]);

  useEffect(() => {
    fetchProfiles();
  }, [sortBy, sortOrder, ageRange, maxDistance, fameRange, selectedTags]);

  const handleLike = async (userId: number) => {
    try {
      setLoadingActions(prev => new Set(prev).add(userId));
      const result = await profileApi.likeProfile(userId, true);
      if (result.isMatch) {
        const profile = profiles.find(p => p.user_id === userId);
        showMatch({
          userName: profile?.first_name || 'cet utilisateur',
          onContinue: () => {
            closeMatch();
          }
        });
      } else {
        success('Profil liké avec succès !');
      }
      // Retirer le profil de la liste SEULEMENT si le like a réussi
      setProfiles(prev => prev.filter(p => p.user_id !== userId));
    } catch (err: any) {
      console.error('Erreur lors du like:', err);
      // Afficher l'erreur à l'utilisateur
      const errorMessage = err.response?.data?.message || 'Erreur lors du like';
      
      // Si l'erreur indique qu'il faut des photos, rediriger vers la page d'édition
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
        warning('Vous êtes déjà en match avec cette personne ! Consultez vos matches. 💕');
        // Retirer le profil de la liste car on ne peut plus l'interagir
        setProfiles(prev => prev.filter(p => p.user_id !== userId));
      } else {
        errorToast(errorMessage);
      }
      // Ne pas retirer le profil de la liste en cas d'erreur (sauf pour les matches)
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };


  const handleUnlike = async (userId: number) => {
    try {
      setLoadingActions(prev => new Set(prev).add(userId));
      const result = await profileApi.unlikeProfile(userId);
      if (result.hadMatch) {
        warning('💔 Le match a été annulé et le chat désactivé.');
      }
      // Retirer le profil de la liste SEULEMENT si l'unlike a réussi
      setProfiles(prev => prev.filter(p => p.user_id !== userId));
    } catch (err: any) {
      console.error('Erreur lors de l\'unlike:', err);
      const errorMessage = err.response?.data?.message || 'Erreur lors de l\'annulation du like';
      errorToast(errorMessage);
      // Ne pas retirer le profil de la liste en cas d'erreur
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const commonTags = [
    'Sport', 'Musique', 'Cinéma', 'Voyages', 'Cuisine', 'Art', 'Lecture',
    'Technologie', 'Nature', 'Fitness', 'Mode', 'Photographie'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-display font-bold text-twilight mb-2">Découvrez des profils</h1>
        <p className="text-lg text-twilight/60">Trouvez des personnes qui partagent vos centres d'intérêt.</p>
      </header>
      
      {/* Contrôles de tri et filtres */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="sort-by">Trier par:</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={getSortLabel(sortBy)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intelligent">Matching intelligent</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="age">Âge</SelectItem>
                  <SelectItem value="fame_rating">Popularité</SelectItem>
                  <SelectItem value="common_tags">Intérêts communs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {sortBy !== 'intelligent' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                {sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtres
            </Button>
            <Button
              variant="outline"
              onClick={fetchProfiles}
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <Search className="w-4 h-4" />
              Recharger
            </Button>
          </div>
        </div>

        {/* Panneau de filtres */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 p-4 rounded-lg space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Âge: {ageRange[0]} - {ageRange[1]} ans</Label>
                <Slider
                  value={ageRange}
                  onValueChange={(value) => setAgeRange(value as [number, number])}
                  min={18}
                  max={80}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Distance max: {maxDistance} km</Label>
                <Slider
                  value={[maxDistance]}
                  onValueChange={(value) => setMaxDistance(value[0])}
                  min={1}
                  max={1000}
                  step={10}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Popularité: {fameRange[0]} - {fameRange[1]}</Label>
                <Slider
                  value={fameRange}
                  onValueChange={(value) => setFameRange(value as [number, number])}
                  min={0}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div>
              <Label>Centres d'intérêt communs:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {commonTags.map(tag => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTag(tag)}
                    className="text-xs"
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
          <p className="text-twilight/60">Chargement des profils...</p>
        </div>
      )}

      {errorState && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ServerCrash className="w-20 h-20 text-red-400 mb-4" />
          <h3 className="text-2xl font-semibold text-twilight mb-2">Oups, une erreur est survenue</h3>
          <p className="text-twilight/60 mb-6">{errorState}</p>
          <Button onClick={fetchProfiles}>
            Réessayer de charger la page
          </Button>
        </div>
      )}

      {!isLoading && !errorState && profiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-20 h-20 text-gray-400 mb-4" />
          <h3 className="text-2xl font-semibold text-twilight mb-2">Aucun profil trouvé</h3>
          <p className="text-twilight/60 mb-6">Essayez d'ajuster vos filtres pour voir plus de profils.</p>
          <Button onClick={() => {
            setAgeRange([18, 65]);
            setMaxDistance(50);
            setFameRange([0, 100]);
            setSelectedTags([]);
          }}>
            Réinitialiser les filtres
          </Button>
        </div>
      )}

      {!isLoading && !errorState && profiles.length > 0 && (
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {profiles.map(profile => (
            <ProfileCard 
              key={profile.id} 
              profile={profile} 
              onLike={handleLike}
              onUnlike={handleUnlike}
              isLiked={false} // Pour le moment, on affiche toujours comme non-liké dans browse
              isLoading={loadingActions.has(profile.user_id)}
            />
          ))}
        </motion.div>
      )}
      
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

export default BrowsingPage; 
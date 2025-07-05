import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  X, 
  MapPin, 
  Star, 
  Filter, 
  ChevronDown,
  Users
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { profileApi, CompleteProfile } from '../services/profileApi';
// import { ProfileDetailModal } from '../components/profile/ProfileDetailModal';

interface BrowsingFilters {
  ageMin: number;
  ageMax: number;
  location: string;
  fameRatingMin: number;
  maxDistance: number;
  interests: string[];
}

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommandé pour vous' },
  { value: 'fame_rating', label: 'Fame Rating' },
  { value: 'age', label: 'Âge' },
  { value: 'distance', label: 'Distance' },
  { value: 'common_tags', label: 'Intérêts communs' }
];

export const BrowsingPage: React.FC = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<CompleteProfile | null>(null);
  const [profiles, setProfiles] = useState<CompleteProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<CompleteProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  
  const [filters, setFilters] = useState<BrowsingFilters>({
    ageMin: 18,
    ageMax: 50,
    location: '',
    fameRatingMin: 0,
    maxDistance: 50,
    interests: []
  });

  const [likedProfiles, setLikedProfiles] = useState<Set<number>>(new Set());
  const [rejectedProfiles, setRejectedProfiles] = useState<Set<number>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState<CompleteProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Charger les profils suggérés une fois que le profil utilisateur est chargé
  useEffect(() => {
    if (userProfile) {
      loadSuggestedProfiles();
    }
  }, [userProfile]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [profiles, filters, sortBy]);

  const loadUserProfile = async () => {
    try {
      if (user) {
        const profile = await profileApi.getMyProfile();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Erreur chargement profil utilisateur:', error);
    }
  };

  const loadSuggestedProfiles = async () => {
    try {
      setIsLoading(true);
      
      const searchFilters: any = {
        limit: 50,
        offset: 0
      };

      // Appliquer les filtres selon l'orientation sexuelle
      if (userProfile) {
        const userOrientation = userProfile.sexual_orientation || 'bi';
        const userGender = userProfile.gender;

        console.log('👤 Profil utilisateur:', {
          orientation: userOrientation,
          gender: userGender
        });

        // Logique des préférences selon les critères de l'énoncé
        if (userOrientation === 'hetero') {
          // Hétéro: femme voit des hommes, homme voit des femmes
          searchFilters.gender = userGender === 'homme' ? 'femme' : 'homme';
        } else if (userOrientation === 'homo') {
          // Homo: même genre
          searchFilters.gender = userGender;
        }
        // Bi ou orientation non spécifiée: pas de filtre de genre (voit tout le monde)
      }

      console.log('🔍 Filtres de recherche:', searchFilters);

      const response = await profileApi.searchProfiles(searchFilters);
      console.log(`✅ ${response.length} profils trouvés`);
      
      setProfiles(response);
    } catch (error) {
      console.error('❌ Erreur chargement profils suggérés:', error);
      setProfiles([]); // Initialiser avec un tableau vide en cas d'erreur
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = profiles.filter(profile => {
      if (profile.age && (profile.age < filters.ageMin || profile.age > filters.ageMax)) {
        return false;
      }

      if (profile.fame_rating && profile.fame_rating < filters.fameRatingMin) {
        return false;
      }

      if (filters.location && profile.city && 
          !profile.city.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

              if (filters.interests.length > 0) {
          const profileInterests = profile.interests?.map((i: any) => 
            typeof i === 'string' ? i : i.name
          ) || [];
          const hasCommonInterest = filters.interests.some(interest =>
            profileInterests.some(pInterest => 
              pInterest.toLowerCase().includes(interest.toLowerCase())
            )
          );
          if (!hasCommonInterest) return false;
        }

      return true;
    });

    filtered = sortProfiles(filtered, sortBy);
    setFilteredProfiles(filtered);
  };

  const sortProfiles = (profilesList: CompleteProfile[], sortOption: string): CompleteProfile[] => {
    const sorted = [...profilesList];

    switch (sortOption) {
      case 'age':
        return sorted.sort((a, b) => (a.age || 0) - (b.age || 0));
      
      case 'fame_rating':
        return sorted.sort((a, b) => (b.fame_rating || 0) - (a.fame_rating || 0));
      
      case 'distance':
        return sorted.sort((a, b) => (a.city || '').localeCompare(b.city || ''));
      
      case 'common_tags':
        return sorted.sort((a, b) => {
          const aCommonTags = calculateCommonTags(a);
          const bCommonTags = calculateCommonTags(b);
          return bCommonTags - aCommonTags;
        });
      
      case 'recommended':
      default:
        return sorted.sort((a, b) => {
          const aScore = calculateRecommendationScore(a);
          const bScore = calculateRecommendationScore(b);
          return bScore - aScore;
        });
    }
  };

  const calculateCommonTags = (profile: CompleteProfile): number => {
    if (!userProfile?.interests || !profile.interests) return 0;
    
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
    ).length;
  };

  const calculateRecommendationScore = (profile: CompleteProfile): number => {
    let score = 0;

    score += (profile.fame_rating || 0) * 0.3;

    const commonTags = calculateCommonTags(profile);
    score += commonTags * 10;

          if (userProfile?.city && profile.city && 
          userProfile.city.toLowerCase() === profile.city.toLowerCase()) {
      score += 30;
    }

    if (profile.biography && profile.photos && profile.photos.length > 2) {
      score += 20;
    }

    return score;
  };

  const handleLikeProfile = async (profileId: number) => {
    try {
      await profileApi.likeProfile(profileId);
      setLikedProfiles(prev => new Set([...prev, profileId]));
      console.log('Profile liked:', profileId);
    } catch (error) {
      console.error('Erreur like:', error);
    }
  };

  const handleRejectProfile = async (profileId: number) => {
    try {
      await profileApi.rejectProfile(profileId);
      setRejectedProfiles(prev => new Set([...prev, profileId]));
    } catch (error) {
      console.error('Erreur reject:', error);
    }
  };

  const getPhotoUrl = (photo: any): string => {
    // Si la photo a des données base64, les utiliser directement
    if (photo.image_data) {
      // Vérifier si les données contiennent déjà le préfixe data:
      if (photo.image_data.startsWith('data:')) {
        return photo.image_data;
      }
      // Sinon ajouter le préfixe
      return `data:${photo.mime_type || 'image/jpeg'};base64,${photo.image_data}`;
    }
    // Sinon utiliser l'API endpoint
    return `http://localhost:3001/api/profile/photos/${photo.id}/image`;
  };

  const getProfilePicture = (profile: CompleteProfile): string => {
    if (!profile.photos || profile.photos.length === 0) {
      // Créer une image placeholder avec les initiales
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      const initials = name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase();
      const bgColor = profile.gender === 'homme' ? '#3B82F6' : '#EC4899';
      
      const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="60" fill="white" text-anchor="middle" dominant-baseline="middle">
          ${initials}
        </text>
      </svg>`;
      
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    }
    
    // Chercher la photo de profil principale
    const profilePicture = profile.photos.find(photo => photo.is_profile_picture);
    if (profilePicture) {
      return getPhotoUrl(profilePicture);
    }
    
    // Sinon prendre la première photo
    return getPhotoUrl(profile.photos[0]);
  };

  const resetFilters = () => {
    setFilters({
      ageMin: 18,
      ageMax: 50,
      location: '',
      fameRatingMin: 0,
      maxDistance: 50,
      interests: []
    });
  };

  const handleProfileClick = (profile: CompleteProfile) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
  };

  if (isLoading) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-twilight/60">Recherche de profils compatibles...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-twilight mb-2">
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Découverte</span>
          </h1>
          <p className="text-twilight/70 text-lg">
            Trouvez des personnes qui vous correspondent
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Trier par..." />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtres
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {filteredProfiles.length} profils
            </Badge>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <Card className="glow-gentle">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-twilight">
                        Âge : {filters.ageMin} - {filters.ageMax} ans
                      </label>
                      <div className="space-y-2">
                        <Slider
                          value={[filters.ageMin]}
                          onValueChange={(value: number[]) => setFilters(prev => ({ ...prev, ageMin: value[0] }))}
                          min={18}
                          max={80}
                          step={1}
                          className="w-full"
                        />
                        <Slider
                          value={[filters.ageMax]}
                          onValueChange={(value: number[]) => setFilters(prev => ({ ...prev, ageMax: value[0] }))}
                          min={18}
                          max={80}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-twilight">
                        Ville
                      </label>
                      <Input
                        value={filters.location}
                        onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Rechercher une ville..."
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-twilight">
                        Fame Rating minimum : {filters.fameRatingMin}
                      </label>
                      <Slider
                        value={[filters.fameRatingMin]}
                        onValueChange={(value: number[]) => setFilters(prev => ({ ...prev, fameRatingMin: value[0] }))}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-6 gap-3">
                    <Button variant="outline" onClick={resetFilters}>
                      Réinitialiser
                    </Button>
                    <Button onClick={() => setShowFilters(false)}>
                      Appliquer les filtres
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredProfiles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredProfiles
                .filter(profile => !rejectedProfiles.has(profile.id))
                .map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.1 }}
                  layout
                >
                  <Card 
                    className="glow-gentle hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
                    onClick={() => handleProfileClick(profile)}
                  >
                    <div className="relative aspect-[3/4] bg-gray-100">
                      <img
                        src={getProfilePicture(profile)}
                        alt={`${profile.first_name} ${profile.last_name}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback vers un placeholder en cas d'erreur
                          const target = e.target as HTMLImageElement;
                          const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                          const initials = name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase() || '?';
                          const bgColor = profile.gender === 'homme' ? '#3B82F6' : '#EC4899';
                          
                          const svg = `<svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100%" height="100%" fill="${bgColor}"/>
                            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle" dominant-baseline="middle">
                              ${initials}
                            </text>
                          </svg>`;
                          
                          target.src = `data:image/svg+xml;base64,${btoa(svg)}`;
                        }}
                      />

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectProfile(profile.id);
                            }}
                            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-red-500/80 border-2 border-white/30"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeProfile(profile.id);
                            }}
                            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-green-500/80 border-2 border-white/30"
                          >
                            <Heart className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>

                      <div className="absolute top-3 right-3">
                        <Badge className="bg-black/50 text-white backdrop-blur-sm">
                          <Star className="w-3 h-3 mr-1" fill="currentColor" />
                          {profile.fame_rating || 0}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-twilight text-lg">
                            {profile.first_name} {profile.last_name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-twilight/60">
                            <span>{profile.age} ans</span>
                            {profile.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{profile.city}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {profile.biography && (
                          <p className="text-sm text-twilight/70 line-clamp-2">
                            {profile.biography}
                          </p>
                        )}

                        {(() => {
                          const commonTags = calculateCommonTags(profile);
                          return commonTags > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              <Heart className="w-3 h-3 text-primary" fill="currentColor" />
                              <span className="text-primary font-medium">
                                {commonTags} intérêt{commonTags > 1 ? 's' : ''} en commun
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-twilight mb-2">Aucun profil trouvé</h3>
            <p className="text-twilight/60 mb-6">
              Essayez d'ajuster vos filtres pour voir plus de profils
            </p>
            <Button onClick={resetFilters} variant="outline">
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </div>

      {/* Modal de détail du profil */}
      {/* <ProfileDetailModal
        profile={selectedProfile}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onLike={handleLikeProfile}
        onReject={handleRejectProfile}
        userProfile={userProfile || undefined}
      /> */}
    </div>
  );
}; 
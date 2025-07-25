import React, { useState, useEffect, useCallback } from 'react';
import { 
  Heart, 
  Eye,
  Loader2,
  MapPin,
  Calendar,
  Sparkles,
  HeartHandshake
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { profileApi, LikeHistoryItem } from '../../services/profileApi';
import { API_BASE_URL } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';

interface LikesHistoryProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  onLikeCountChange?: (count: number) => void;
}

export const LikesHistory: React.FC<LikesHistoryProps> = ({ 
  limit = 20, 
  showHeader = true, 
  compact = false,
  onLikeCountChange 
}) => {
  const { success: successToast, error: errorToast } = useToast();
  const navigate = useNavigate();
  const [likes, setLikes] = useState<LikeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [likeActions, setLikeActions] = useState<Record<number, boolean>>({});

  const loadLikesHistory = useCallback(async () => {
    try {
      if (!isInitialized) {
        setIsLoading(true);
      }
      const likesData = await profileApi.getLikesHistory(limit);
      setLikes(likesData);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique des likes:', error);
      errorToast('Impossible de charger l\'historique des likes');
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [limit, errorToast, isInitialized]);

  useEffect(() => {
    loadLikesHistory();
  }, [loadLikesHistory]);

  useEffect(() => {
    if (onLikeCountChange) {
      onLikeCountChange(likes.length);
    }
  }, [likes, onLikeCountChange]);

  const handleLikeBack = async (userId: number) => {
    if (likeActions[userId]) return; // Prevent double clicking
    
    try {
      setLikeActions(prev => ({ ...prev, [userId]: true }));
      await profileApi.likeProfile(userId, true);
      successToast('Profil liké ! 💖');
      
      // Optionally refresh the data to show updated state
      // loadLikesHistory();
    } catch (error) {
      console.error('Erreur lors du like:', error);
      errorToast('Impossible de liker ce profil');
    } finally {
      setLikeActions(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleViewProfile = (userId: number) => {
    navigate(`/profile/${userId}`);
  };

  const getPhotoUrl = (photoId: number): string => {
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/api/photos/${photoId}/image`;
  };

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `Il y a ${diffInDays}j`;
    
    return date.toLocaleDateString('fr-FR');
  }, []);

  if (isLoading && !isInitialized) {
    return (
      <div className="w-full">
        {/* Header compact pour dashboard - Loading state */}
        {compact && (
          <Card className="glow-gentle mb-4 bg-gradient-to-r from-white via-rose-50/50 to-sunset-50/30 border-rose-200/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="currentColor" />
                  <span className="truncate">Likes reçus</span>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        )}
        
        {showHeader && (
          <Card className="glow-gentle mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-primary" fill="currentColor" />
                Likes reçus
              </CardTitle>
              <CardDescription>
                Découvrez qui s'intéresse à votre profil
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        
        <Card className="glow-gentle bg-gradient-to-br from-white to-gray-50/30 border-gray-200/50">
          <CardContent>
            <div className={`flex items-center justify-center ${compact ? 'py-8' : 'py-12'}`}>
              <div className="text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full animate-pulse"></div>
                  <Loader2 className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} text-primary animate-spin mx-auto mb-4 relative z-10`} />
                </div>
                <p className={`text-twilight/60 ${compact ? 'text-sm' : 'text-lg'} font-medium`}>Chargement des likes...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (likes.length === 0) {
    return (
      <div className="w-full">
        {showHeader && (
          <Card className="glow-gentle mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-primary" fill="currentColor" />
                Likes reçus
              </CardTitle>
              <CardDescription>
                Découvrez qui s'intéresse à votre profil
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        <Card className="glow-gentle bg-gradient-to-br from-white via-rose-50/30 to-sunset-50/20 border-rose-200/30">
          <CardContent className={`${compact ? 'p-8' : 'p-12'} text-center`}>
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-sunset-100 rounded-full flex items-center justify-center mx-auto shadow-lg border-4 border-white/50">
                <HeartHandshake className="w-12 h-12 text-rose-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center animate-bounce">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className={`${compact ? 'text-xl' : 'text-2xl'} font-display font-bold bg-gradient-to-r from-twilight to-twilight/80 bg-clip-text text-transparent mb-4`}>
              Aucun like pour le moment
            </h3>
            <p className={`text-twilight/60 ${compact ? 'text-base' : 'text-lg'} mb-8 max-w-md mx-auto leading-relaxed`}>
              Soyez patient ! Votre profil sera bientôt découvert par d'autres utilisateurs. ✨
            </p>
            {!compact && (
              <Button 
                onClick={() => navigate('/browsing')}
                className="bg-gradient-to-r from-primary via-rose-500 to-accent text-white hover:shadow-xl hover:scale-105 transition-all duration-300 px-8 py-3 text-base font-semibold"
                size="lg"
              >
                <Heart className="w-5 h-5 mr-2" />
                Découvrir des profils
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`w-full ${compact ? 'h-full flex flex-col' : ''}`}>
      {/* Wrapper container pour dashboard */}
      {compact && (
        <Card className="glow-gentle h-full flex flex-col bg-gradient-to-br from-white via-rose-50/50 to-sunset-50/30 border-rose-200/40">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Heart className="w-5 h-5 text-primary" fill="currentColor" />
                  {likes.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  )}
                </div>
                <span className="bg-gradient-to-r from-twilight to-twilight/80 bg-clip-text text-transparent font-semibold">
                  Likes reçus
                </span>
              </div>
              {likes.length > 0 && (
                <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-primary/20 shadow-sm">
                  {likes.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 pt-0 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div
                className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
              >
                {likes.map((like) => (
                  <div key={like.id} className="w-full">
                    <Card className="glow-gentle hover:glow-intense transition-all duration-300 group bg-gradient-to-br from-white via-rose-50/30 to-sunset-50/20 border-rose-200/30 hover:border-primary/40 shadow-md hover:shadow-lg transform hover:scale-[1.02] h-auto">
                      <CardContent className="p-2 sm:p-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-6 translate-x-6"></div>
                        
                        {/* Layout horizontal compact */}
                        <div className="flex items-center gap-2 sm:gap-3 relative z-10">
                          {/* Avatar compact */}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-accent/15 rounded-full opacity-70"></div>
                            <div className="relative w-full h-full border-2 border-white shadow-md group-hover:border-white/90 transition-all duration-300 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                              {like.photo_id ? (
                                <img 
                                  src={getPhotoUrl(like.photo_id)}
                                  alt={`${like.first_name} ${like.last_name}`}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const parent = (e.target as HTMLImageElement).parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<span class="text-white font-bold text-xs">${like.first_name[0]}${like.last_name[0]}</span>`;
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-white font-bold text-xs sm:text-sm">
                                  {like.first_name[0]}{like.last_name[0]}
                                </span>
                              )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center shadow-sm">
                              <Heart className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" fill="currentColor" />
                            </div>
                          </div>

                          {/* Info condensée */}
                          <div className="flex-1 min-w-0 py-1">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <h3 className="font-semibold text-twilight truncate text-xs sm:text-sm flex-1 min-w-0">
                                {like.first_name} {like.last_name}
                              </h3>
                              {like.age && (
                                <Badge variant="secondary" className="text-[10px] sm:text-xs bg-primary/10 text-primary border-primary/20 px-1 py-0 h-4 sm:h-5 flex-shrink-0">
                                  {like.age}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between text-[10px] sm:text-xs text-twilight/60 mb-1">
                              <span className="truncate flex-1 min-w-0">@{like.username}</span>
                              <span className="flex-shrink-0 ml-1">{formatTimeAgo(like.created_at)}</span>
                            </div>
                            
                            {like.city && (
                              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-twilight/60 mb-2">
                                <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                                <span className="truncate">{like.city}</span>
                              </div>
                            )}

                            {/* Actions horizontales compactes */}
                            <div className="flex gap-1 sm:gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleLikeBack(like.liker_id)}
                                disabled={likeActions[like.liker_id]}
                                className="text-[10px] sm:text-xs py-1 px-2 h-6 sm:h-7 flex-1 bg-gradient-to-r from-primary via-rose-500 to-accent text-white hover:shadow-lg hover:scale-105 transform transition-all duration-200 font-medium border-0 shadow-sm relative overflow-hidden"
                              >
                                {likeActions[like.liker_id] ? (
                                  <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" fill="currentColor" />
                                    <span className="hidden sm:inline">Liker</span>
                                    <span className="sm:hidden">♥</span>
                                  </>
                                )}
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewProfile(like.liker_id)}
                                className="text-[10px] sm:text-xs py-1 px-2 h-6 sm:h-7 flex-1 border border-primary/30 text-primary hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-white hover:border-transparent hover:shadow-lg hover:scale-105 transform transition-all duration-200 font-medium bg-white/80"
                              >
                                <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                <span className="hidden sm:inline">Voir</span>
                                <span className="sm:hidden">👁</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
              
              {likes.length > 0 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/profile')}
                    className="text-primary border-2 border-primary/40 hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-white hover:border-transparent hover:shadow-xl hover:scale-105 transform transition-all duration-300 font-semibold bg-gradient-to-r from-white to-rose-50/50 px-4 py-2 text-sm"
                  >
                    Voir tous
                    <Sparkles className="w-3 h-3 ml-1 animate-pulse" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {showHeader && !compact && (
        <div className="mb-8">
          <Card className="bg-gradient-to-br from-rose-50/80 via-white to-sunset-50/60 border-0 shadow-2xl overflow-hidden relative backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-rose/8 via-primary/4 to-sunset/8"></div>
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br from-accent/10 to-transparent rounded-full translate-x-12 translate-y-12"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left">
                <div className="mb-6 sm:mb-0">
                  <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-twilight via-primary to-accent bg-clip-text text-transparent mb-4 flex items-center gap-3">
                    <div className="relative">
                      <Heart className="w-8 h-8 text-primary" fill="currentColor" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                    </div>
                    Likes reçus
                    <span className="inline-block animate-bounce">💕</span>
                  </h1>
                  <p className="text-twilight/70 text-lg mb-4 font-medium">
                    <span className="text-2xl font-bold text-primary">{likes.length}</span> personne{likes.length > 1 ? 's ont' : ' a'} liké votre profil
                  </p>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <div className="flex -space-x-2">
                      {likes.slice(0, 3).map((like, index) => (
                        <div key={like.id} className={`w-8 h-8 rounded-full border-2 border-white shadow-sm bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold transform transition-transform hover:scale-110 ${index === 0 ? 'z-30' : index === 1 ? 'z-20' : 'z-10'}`}>
                          {like.first_name[0]}
                        </div>
                      ))}
                    </div>
                    {likes.length > 3 && (
                      <span className="text-sm text-twilight/60 font-medium">+{likes.length - 3} autres</span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary via-rose-500 to-accent rounded-full flex items-center justify-center shadow-2xl border-4 border-white/50 animate-pulse">
                      <HeartHandshake className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-sunset to-accent rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!compact && (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
            {likes.map((like) => (
              <div key={like.id} className="w-full h-full">
                <Card className="glow-gentle hover:glow-intense transition-all duration-300 group bg-gradient-to-br from-white via-rose-50/30 to-sunset-50/20 border-rose-200/30 hover:border-primary/40 shadow-md hover:shadow-xl transform hover:scale-[1.02] h-full flex flex-col">
                  <CardContent className="p-3 sm:p-4 relative overflow-hidden flex-1 flex flex-col">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-8 translate-x-8"></div>
                    
                    {/* Avatar centré */}
                    <div className="flex justify-center mb-3 relative z-10">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-pulse group-hover:scale-110 transition-transform duration-300"></div>
                        <div className="relative w-full h-full border-3 border-white shadow-lg group-hover:border-white/80 transition-all duration-300 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                          {like.photo_id ? (
                            <img 
                              src={getPhotoUrl(like.photo_id)}
                              alt={`${like.first_name} ${like.last_name}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = `<span class="text-white font-bold text-lg">${like.first_name[0]}${like.last_name[0]}</span>`;
                                }
                              }}
                            />
                          ) : (
                            <span className="text-white font-bold text-lg sm:text-xl">
                              {like.first_name[0]}{like.last_name[0]}
                            </span>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center shadow-lg">
                          <Heart className="w-3 h-3 text-white" fill="currentColor" />
                        </div>
                      </div>
                    </div>

                    {/* Info centrée */}
                    <div className="flex-1 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-twilight text-sm sm:text-base lg:text-lg">
                          {like.first_name} {like.last_name}
                        </h3>
                        {like.age && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20 px-2 py-1">
                            {like.age} ans
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-twilight/60 text-xs sm:text-sm">@{like.username}</p>
                      
                      {like.city && (
                        <div className="flex items-center justify-center gap-1 text-xs text-twilight/60">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{like.city}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-1 text-xs text-twilight/60">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>{formatTimeAgo(like.created_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 space-y-2">
                      <Button
                        size="sm"
                        onClick={() => handleLikeBack(like.liker_id)}
                        disabled={likeActions[like.liker_id]}
                        className="w-full py-2 px-3 bg-gradient-to-r from-primary via-rose-500 to-accent text-white hover:shadow-xl hover:scale-105 transform transition-all duration-300 font-semibold border-0 shadow-lg hover:from-primary/90 hover:to-accent/90 relative overflow-hidden text-xs sm:text-sm"
                      >
                        {likeActions[like.liker_id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Heart className="w-4 h-4 mr-2" fill="currentColor" />
                            Liker en retour
                          </>
                        )}
                        {!likeActions[like.liker_id] && (
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewProfile(like.liker_id)}
                        className="w-full py-2 px-3 border-2 border-primary/30 text-primary hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-white hover:border-transparent hover:shadow-lg hover:scale-105 transform transition-all duration-300 font-semibold bg-gradient-to-r from-white to-rose-50/50 text-xs sm:text-sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir le profil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Star, Zap, Target, Eye, Edit } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useSocket } from '../../contexts/SocketContext';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { LikesHistory } from '../matches/LikesHistory';
import { MatchesSection } from './MatchesSection';
import { profileApi, CompleteProfile } from '../../services/profileApi';
import { getProfilePictureUrl } from '../../utils/imageUtils';

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { completionPercentage, isLoading: profileLoading } = useProfileCompletion();
  const { notifications } = useSocket();

  // États pour les vraies données
  const [stats, setStats] = useState({
    likes: 0,
    matches: 0,
    messages: 0,
    visits: 0
  });
  const [userProfile, setUserProfile] = useState<CompleteProfile | null>(null);
  // Removed recentMatches state and isLoadingStats as they're now handled by MatchesSection

  // Fonction pour rafraîchir les statistiques
  const refreshStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
    }
  };

  // Charger les vraies données
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Charger le profil utilisateur avec photos
        const profileData = await profileApi.getMyProfile();
        setUserProfile(profileData);
        
        // Charger toutes les statistiques
        await refreshStats();
        
      } catch (error) {
        // Garder les valeurs par défaut (0) en cas d'erreur
      }
    };

    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Mettre à jour les stats quand de nouvelles notifications arrivent
  useEffect(() => {
    if (notifications.length > 0) {
      // Détecter les nouveaux événements qui affectent les compteurs
      const recentNotifications = notifications.filter(n => 
        new Date(n.created_at).getTime() > Date.now() - 10000 // Dernières 10 secondes
      );
      
      const hasRelevantUpdates = recentNotifications.some(n => 
        ['like', 'match', 'visit', 'message', 'unlike'].includes(n.type)
      );
      
      if (hasRelevantUpdates) {
        // Mise à jour des compteurs suite aux notifications
        refreshStats();
      }
    }
  }, [notifications]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 pb-8">
      {/* Welcome Section améliorée */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <Card className="bg-gradient-to-r from-primary/10 via-sunset/5 to-peach/10 border-0 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
          <CardContent className="p-4 sm:p-6 relative">
            <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left">
              <div className="mb-6 sm:mb-0">
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-display font-bold text-twilight mb-2"
                >
                  Bonjour {user?.first_name || user?.username} ! 
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="inline-block ml-2"
                  >
                    👋
                  </motion.span>
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-twilight/70 text-base mb-3"
                >
                  Prêt(e) à faire de nouvelles rencontres aujourd'hui ?
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <Button 
                    onClick={() => navigate('/browsing')}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Commencer à matcher
                  </Button>
                  <Button 
                    onClick={() => navigate('/browsing')}
                    variant="outline" 
                    className="border-2 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60 font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Découvrir des profils
                  </Button>
                </motion.div>
              </div>
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="hidden sm:block"
              >
                <div className="w-20 h-20 rounded-full shadow-2xl relative overflow-hidden border-3 border-white/50">
                  {userProfile?.photos && userProfile.photos.length > 0 ? (
                    <img 
                      src={getProfilePictureUrl(userProfile.photos, 'http://localhost:3001', {
                        first_name: userProfile.first_name,
                        last_name: userProfile.last_name,
                        gender: userProfile.gender
                      })}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback en cas d'erreur d'image
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.fallback-avatar')) {
                          parent.innerHTML = `
                            <div class="fallback-avatar w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                              <span class="text-white font-bold text-lg">${(user?.first_name || user?.username || 'U').charAt(0)}</span>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Heart className="w-10 h-10 text-white" fill="currentColor" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-white/30 rounded-full animate-pulse"></div>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Compteurs dans le thème du site */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-3 sm:gap-4 mb-6 justify-between"
      >
        {[
          { icon: Heart, value: stats.likes, label: "Likes", color: "text-primary" },
          { icon: Star, value: stats.matches, label: "Matches", color: "text-sunset" },
          { icon: MessageCircle, value: stats.messages, label: "Messages", color: "text-accent" },
          { icon: Eye, value: stats.visits, label: "Vues", color: "text-twilight" }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.02 }}
            className="flex-1"
          >
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 text-center border-0 shadow-md hover:shadow-lg transition-all duration-300">
              <div className={`w-8 h-8 mx-auto mb-2 bg-gradient-to-br from-primary/10 to-sunset/10 rounded-full flex items-center justify-center`}>
                <stat.icon 
                  className={`w-4 h-4 ${stat.color}`} 
                  fill={stat.icon === Heart || stat.icon === Star ? "currentColor" : "none"}
                />
              </div>
              <div className="text-xl font-bold text-twilight mb-1">{stat.value}</div>
              <div className="text-xs text-twilight/60 font-medium">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Notification profil incomplet uniquement */}
      {completionPercentage < 100 && !profileLoading && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Card className="border-l-4 border-l-sunset bg-gradient-to-r from-sunset/10 to-primary/5 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sunset rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" fill="currentColor" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-twilight">Complétez votre profil</h4>
                    <p className="text-sm text-twilight/70">
                      Votre profil est à {completionPercentage}% - Ajoutez plus d'infos pour plus de matches !
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/profile-edit')}
                  size="sm"
                  className="bg-gradient-to-r from-sunset to-primary text-white hover:shadow-lg transition-all duration-200"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Compléter
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Sections principales : Matches et Likes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 auto-rows-fr min-h-0">
        {/* Matches section - Gauche */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="min-h-0 flex flex-col"
        >
          <div className="flex-1 max-h-[500px] xl:max-h-[600px] overflow-hidden">
            <MatchesSection limit={6} />
          </div>
        </motion.div>

        {/* Likes reçus - Droite */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="min-h-0 flex flex-col"
        >
          <div className="flex-1 max-h-[500px] xl:max-h-[600px] overflow-hidden">
            <LikesHistory 
              limit={6}
              showHeader={false}
              compact={true}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UserDashboard; 
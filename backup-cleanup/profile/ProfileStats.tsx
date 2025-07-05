import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Eye, Star, Users, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { profileApi, LikeHistoryItem, VisitHistoryItem, CompleteProfile } from '../../services/profileApi';

interface ProfileStatsProps {
  profile: CompleteProfile;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({ profile }) => {
  const [likesHistory, setLikesHistory] = useState<LikeHistoryItem[]>([]);
  const [visitsHistory, setVisitsHistory] = useState<VisitHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'likes' | 'visits'>('overview');

  // Charger l'historique
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const [likes, visits] = await Promise.all([
        profileApi.getLikesHistory(20),
        profileApi.getVisitsHistory(20)
      ]);
      
      setLikesHistory(likes);
      setVisitsHistory(visits);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculer les statistiques
  const stats = {
    fameRating: profile.fame_rating || 0,
    likesReceived: likesHistory.length,
    profileViews: visitsHistory.length,
    // Matches: seront disponibles quand le système de match sera implémenté
    matches: 0 
  };

  // Formater une date relative
  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR');
  };

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
    { id: 'likes', label: `Likes (${stats.likesReceived})`, icon: Heart },
    { id: 'visits', label: `Visites (${stats.profileViews})`, icon: Eye }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Navigation des onglets */}
      <div className="flex justify-center">
        <div className="bg-muted/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-border">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-md'
                      : 'text-twilight hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenu des onglets */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Fame Rating */}
            <Card className="text-center glow-gentle">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary" fill="currentColor" />
                </div>
                <div className="text-3xl font-bold text-primary mb-2">{stats.fameRating}</div>
                <div className="text-sm text-twilight/70 font-medium mb-3">Fame Rating</div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-peach-gradient h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.fameRating, 100)}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            {/* Likes reçus */}
            <Card className="text-center glow-gentle">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-sunset/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-sunset" fill="currentColor" />
                </div>
                <div className="text-3xl font-bold text-sunset mb-2">{stats.likesReceived}</div>
                <div className="text-sm text-twilight/70 font-medium">Likes reçus</div>
              </CardContent>
            </Card>

            {/* Vues de profil */}
            <Card className="text-center glow-gentle">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-accent/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-accent" />
                </div>
                <div className="text-3xl font-bold text-accent mb-2">{stats.profileViews}</div>
                <div className="text-sm text-twilight/70 font-medium">Vues de profil</div>
              </CardContent>
            </Card>

            {/* Matches */}
            <Card className="text-center glow-gentle">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-blue-500 mb-2">{stats.matches}</div>
                <div className="text-sm text-twilight/70 font-medium">Matches</div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'likes' && (
          <Card className="glow-gentle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-sunset" fill="currentColor" />
                Historique des likes reçus
              </CardTitle>
              <CardDescription>
                Les personnes qui ont aimé votre profil
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-twilight/60">Chargement...</p>
                </div>
              ) : likesHistory.length > 0 ? (
                <div className="space-y-4">
                  {likesHistory.map((like) => (
                    <motion.div
                      key={like.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 bg-sunset/5 rounded-xl border border-sunset/10"
                    >
                      <div className="w-12 h-12 bg-sunset/20 rounded-full flex items-center justify-center">
                        <Heart className="w-6 h-6 text-sunset" fill="currentColor" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-twilight">
                          {like.first_name} {like.last_name}
                        </h4>
                        <p className="text-sm text-twilight/60">
                          @{like.username}
                          {like.age && ` • ${like.age} ans`}
                          {like.city && ` • ${like.city}`}
                        </p>
                      </div>
                      <div className="text-sm text-twilight/50">
                        {formatRelativeDate(like.created_at)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="w-16 h-16 text-sunset/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-twilight mb-2">Aucun like pour le moment</h3>
                  <p className="text-twilight/60">
                    Complétez votre profil pour attirer plus d'attention !
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'visits' && (
          <Card className="glow-gentle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-accent" />
                Historique des visites
              </CardTitle>
              <CardDescription>
                Les personnes qui ont consulté votre profil
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-twilight/60">Chargement...</p>
                </div>
              ) : visitsHistory.length > 0 ? (
                <div className="space-y-4">
                  {visitsHistory.map((visit) => (
                    <motion.div
                      key={visit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 bg-accent/5 rounded-xl border border-accent/10"
                    >
                      <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                        <Eye className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-twilight">
                          {visit.first_name} {visit.last_name}
                        </h4>
                        <p className="text-sm text-twilight/60">
                          @{visit.username}
                          {visit.age && ` • ${visit.age} ans`}
                          {visit.city && ` • ${visit.city}`}
                        </p>
                      </div>
                      <div className="text-sm text-twilight/50">
                        {formatRelativeDate(visit.visited_at)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-16 h-16 text-accent/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-twilight mb-2">Aucune visite pour le moment</h3>
                  <p className="text-twilight/60">
                    Votre profil sera bientôt découvert par d'autres utilisateurs !
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Bouton de rafraîchissement */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={loadHistory}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Actualisation...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              Actualiser
            </>
          )}
        </Button>
      </div>
    </div>
  );
}; 
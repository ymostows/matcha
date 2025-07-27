import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { MatchCard } from '../matches/MatchCard';
import { profileApi, MatchItem } from '../../services/profileApi';
import { useToast } from '../../hooks/useToast';

interface MatchesSectionProps {
  limit?: number;
}

export const MatchesSection: React.FC<MatchesSectionProps> = ({ 
  limit = 6
}) => {
  const { success: successToast, error: errorToast } = useToast();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [limit]);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      const response = await profileApi.getMatches(limit, 0);
      setMatches(response.matches);
    } catch (error) {
      console.error('Erreur lors du chargement des matches:', error);
      errorToast('Impossible de charger vos matches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnmatch = async (matchId: number) => {
    try {
      await profileApi.unmatchUser(matchId);
      setMatches(prev => prev.filter(match => match.match_id !== matchId));
      successToast('Match supprimé avec succès');
    } catch (error) {
      errorToast('Impossible de supprimer le match');
      throw error;
    }
  };

  const displayedMatches = matches;

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-sunset/5 to-peach/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sunset" />
            Matches récents
          </CardTitle>
          <CardDescription>
            Chargement de vos connexions...
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="bg-gradient-to-r from-sunset/5 to-peach/5 border-b border-primary/10">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-sunset" />
          Matches récents {matches.length > 0 && `(${matches.length})`}
        </CardTitle>
        <CardDescription>
          {matches.length === 0 
            ? 'Commencez à liker des profils pour créer vos premiers matches !' 
            : 'Vos nouvelles connexions vous attendent'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 flex-1 flex flex-col">
        {matches.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-twilight mb-2">
              Aucun match pour le moment
            </h3>
            <p className="text-twilight/60 mb-4">
              Commencez à liker des profils pour créer vos premiers matches !
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 overflow-y-auto overflow-x-hidden scrollbar-none" style={{ overflowAnchor: 'none' }}>
              <AnimatePresence mode="popLayout">
                {displayedMatches.map((match, index) => (
                  <motion.div
                    key={match.match_id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: 0.1 * index }}
                    layout
                    className="h-fit"
                    style={{ contain: 'layout' }}
                  >
                    <MatchCard 
                      match={match} 
                      onUnmatch={handleUnmatch}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
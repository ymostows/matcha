import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Search, 
  Filter,
  Loader2,
  Users,
  Sparkles,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MatchCard } from './MatchCard';
import { profileApi, MatchItem } from '../../services/profileApi';
import { useToast } from '../../hooks/useToast';

type SortOption = 'recent' | 'name' | 'age' | 'fame';
type SortOrder = 'asc' | 'desc';

interface MatchesListProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  onMatchCountChange?: (count: number) => void;
}

export const MatchesList: React.FC<MatchesListProps> = ({ 
  limit = 100, 
  showHeader = true, 
  compact = false,
  onMatchCountChange 
}) => {
  const { success: successToast, error: errorToast } = useToast();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const loadMatches = useCallback(async () => {
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
  }, [limit, errorToast]);

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...matches];

    // Filtrage par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(match => 
        match.first_name.toLowerCase().includes(query) ||
        match.last_name.toLowerCase().includes(query) ||
        match.username.toLowerCase().includes(query) ||
        match.city?.toLowerCase().includes(query) ||
        match.interests?.some(interest => interest.toLowerCase().includes(query))
      );
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'recent':
          comparison = new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime();
          break;
        case 'name':
          comparison = a.first_name.localeCompare(b.first_name);
          break;
        case 'age':
          comparison = (a.age || 0) - (b.age || 0);
          break;
        case 'fame':
          comparison = (b.fame_rating || 0) - (a.fame_rating || 0);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredMatches(filtered);
  }, [matches, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [matches, searchQuery, sortBy, sortOrder, applyFiltersAndSort]);

  useEffect(() => {
    if (onMatchCountChange) {
      onMatchCountChange(matches.length);
    }
  }, [matches, onMatchCountChange]);

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

  const toggleSort = (newSortBy: SortOption) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (option: SortOption) => {
    if (sortBy !== option) return null;
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <Card className="glow-gentle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary" fill="currentColor" />
              Mes Matches
            </CardTitle>
            <CardDescription>
              Découvrez vos connexions réciproques
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-twilight/60 text-lg">Chargement de vos matches...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (matches.length === 0 && !compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glow-gentle">
          <CardContent className="p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-2xl font-display font-bold text-twilight mb-4">
              Aucun match pour le moment
            </h3>
            <p className="text-twilight/60 text-lg mb-8 max-w-md mx-auto">
              Likez des profils pour créer vos premiers matches ! Quand quelqu'un que vous avez liké vous like en retour, vous apparaîtrez ici.
            </p>
            <Button 
              onClick={() => window.location.href = '/browsing'}
              className="bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              <Heart className="w-5 h-5 mr-2" />
              Découvrir des profils
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      {showHeader && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-sunset/5 to-peach/10 border-0 shadow-xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
            <CardContent className="p-6 relative">
              <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left">
                <div className="mb-6 sm:mb-0">
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl font-display font-bold text-twilight mb-3 flex items-center gap-3"
                  >
                    <Heart className="w-8 h-8 text-primary" fill="currentColor" />
                    Mes Matches
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="inline-block"
                    >
                      ✨
                    </motion.span>
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-twilight/70 text-lg mb-4"
                  >
                    {matches.length === 0 
                      ? 'Commencez à liker des profils pour créer vos premiers matches !' 
                      : `${matches.length} match${matches.length > 1 ? 'es' : ''} vous attend${matches.length > 1 ? 'ent' : ''}`
                    }
                  </motion.p>
                </div>
                {!compact && (
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="hidden sm:block"
                  >
                    <div className="w-20 h-20 bg-peach-gradient rounded-full flex items-center justify-center shadow-2xl">
                      <Users className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {matches.length > 0 && (
        <>
          {/* Barre de recherche et filtres */}
          {!compact && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <Card className="glow-gentle">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Recherche */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Rechercher par nom, ville, centres d'intérêt..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Bouton filtres */}
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      Trier
                    </Button>
                  </div>
                  
                  {/* Options de tri */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-gray-200"
                      >
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={sortBy === 'recent' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleSort('recent')}
                            className="flex items-center gap-2"
                          >
                            Plus récents
                            {getSortIcon('recent')}
                          </Button>
                          <Button
                            variant={sortBy === 'name' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleSort('name')}
                            className="flex items-center gap-2"
                          >
                            Nom
                            {getSortIcon('name')}
                          </Button>
                          <Button
                            variant={sortBy === 'age' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleSort('age')}
                            className="flex items-center gap-2"
                          >
                            Âge
                            {getSortIcon('age')}
                          </Button>
                          <Button
                            variant={sortBy === 'fame' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleSort('fame')}
                            className="flex items-center gap-2"
                          >
                            Popularité
                            {getSortIcon('fame')}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Résultats */}
          {filteredMatches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Card className="glow-gentle">
                <CardContent className="p-8">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-twilight mb-2">
                    Aucun match trouvé
                  </h3>
                  <p className="text-twilight/60">
                    Essayez de modifier vos critères de recherche
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`grid gap-6 ${
                compact 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}
            >
              <AnimatePresence>
                {filteredMatches.map((match, index) => (
                  <motion.div
                    key={match.match_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MatchCard 
                      match={match} 
                      onUnmatch={handleUnmatch}
                      compact={compact}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};
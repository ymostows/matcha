import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Search, 
  Filter,
  Loader2,
  Users,
  Sparkles,
  SortAsc,
  SortDesc,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MatchCard } from '../matches/MatchCard';
import { profileApi, MatchItem } from '../../services/profileApi';
import { useToast } from '../../hooks/useToast';

type SortOption = 'recent' | 'name' | 'age' | 'fame';
type SortOrder = 'asc' | 'desc';

interface MatchesSectionProps {
  expanded?: boolean;
  limit?: number;
  onToggleExpanded?: () => void;
}

export const MatchesSection: React.FC<MatchesSectionProps> = ({ 
  expanded = false, 
  limit = 6, 
  onToggleExpanded 
}) => {
  const { success: successToast, error: errorToast } = useToast();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [matches, searchQuery, sortBy, sortOrder]);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      const response = await profileApi.getMatches(100, 0);
      setMatches(response.matches);
    } catch (error) {
      console.error('Erreur lors du chargement des matches:', error);
      errorToast('Impossible de charger vos matches');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...matches];

    // Filtrage par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(match => 
        match.first_name.toLowerCase().includes(query) ||
        match.username.toLowerCase().includes(query) ||
        match.city?.toLowerCase().includes(query)
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
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredMatches(filtered);
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

  const displayedMatches = expanded ? filteredMatches : filteredMatches.slice(0, limit);

  if (isLoading) {
    return (
      <Card className="glow-gentle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sunset" />
            Mes Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glow-gentle">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sunset" />
              Mes Matches {matches.length > 0 && `(${matches.length})`}
            </CardTitle>
            <CardDescription>
              {matches.length === 0 
                ? 'Commencez à liker des profils pour créer vos premiers matches !' 
                : 'Vos connexions réciproques vous attendent'
              }
            </CardDescription>
          </div>
          
          {expanded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          )}
        </div>

        {/* Filters - Only show when expanded */}
        <AnimatePresence>
          {expanded && showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-gray-100"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher par nom ou ville..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2 border border-gray-200 rounded-md text-sm"
                  >
                    <option value="recent">Plus récents</option>
                    <option value="name">Nom</option>
                    <option value="age">Âge</option>
                    <option value="fame">Popularité</option>
                  </select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>

      <CardContent className="p-6">
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-twilight mb-2">
              Aucun match pour le moment
            </h3>
            <p className="text-twilight/60 mb-6">
              Likez des profils pour créer vos premiers matches ! Quand quelqu'un que vous avez liké vous like en retour, vous apparaîtrez ici.
            </p>
          </div>
        ) : (
          <>
            <div className={`grid gap-4 ${
              expanded 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              <AnimatePresence mode="popLayout">
                {displayedMatches.map((match, index) => (
                  <motion.div
                    key={match.match_id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: expanded ? 0 : 0.1 * index }}
                    layout
                  >
                    <MatchCard 
                      match={match} 
                      onUnmatch={handleUnmatch}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {/* Show expand/collapse toggle */}
            {!expanded && matches.length > limit && (
              <div className="mt-6 text-center">
                <Button 
                  onClick={onToggleExpanded}
                  variant="outline" 
                  className="text-primary border-primary/20 hover:bg-primary/5"
                >
                  Voir tous les matches ({matches.length})
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {expanded && filteredMatches.length > displayedMatches.length && (
              <div className="mt-6 text-center">
                <p className="text-sm text-twilight/60">
                  Affichage de {displayedMatches.length} sur {filteredMatches.length} matches
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
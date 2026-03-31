import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Loader2, MapPin, Calendar, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { profileApi, VisitHistoryItem } from '../../services/profileApi';
import { getPhotoUrl } from '../../utils/imageUtils';
import { useNavigate } from 'react-router-dom';
import { getTimeAgo } from '../../utils/dateUtils';

interface VisitsHistoryProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export const VisitsHistory: React.FC<VisitsHistoryProps> = ({
  limit = 20,
  showHeader = true,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<VisitHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadVisitsHistory = useCallback(async () => {
    try {
      if (!isInitialized) setIsLoading(true);
      const data = await profileApi.getVisitsHistory(limit);
      setVisits(data);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique des visites:', error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [limit, isInitialized]);

  useEffect(() => {
    loadVisitsHistory();
  }, [loadVisitsHistory]);

  if (isLoading && !isInitialized) {
    return (
      <Card className="glow-gentle">
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Visites reçues
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visits.length === 0) {
    return (
      <Card className="glow-gentle">
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Visites reçues
            </CardTitle>
            <CardDescription>Découvrez qui a consulté votre profil</CardDescription>
          </CardHeader>
        )}
        <CardContent className="py-10 text-center">
          <Users className="w-12 h-12 text-twilight/30 mx-auto mb-4" />
          <p className="text-twilight/60 font-medium">Aucune visite pour le moment</p>
          <p className="text-twilight/40 text-sm mt-1">Votre profil sera bientôt découvert ✨</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      {showHeader && (
        <Card className="glow-gentle mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary" />
              Visites reçues
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {visits.length}
              </Badge>
            </CardTitle>
            <CardDescription>Découvrez qui a consulté votre profil</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
        {visits.map((visit) => (
          <Card
            key={visit.id}
            className="glow-gentle hover:glow-intense transition-all duration-300 group cursor-pointer border-blue-200/30 hover:border-primary/40"
            onClick={() => navigate(`/profile/${visit.visitor_id}`)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 relative flex-shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center border-2 border-white shadow-md">
                    {visit.photo_id ? (
                      <img
                        src={getPhotoUrl(visit.photo_id)}
                        alt={`${visit.first_name} ${visit.last_name}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `<span class="text-white font-bold text-sm">${visit.first_name[0]}${visit.last_name[0]}</span>`;
                          }
                        }}
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {visit.first_name[0]}{visit.last_name[0]}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-sm">
                    <Eye className="w-2 h-2 text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="font-semibold text-twilight text-sm truncate">
                      {visit.first_name} {visit.last_name}
                    </p>
                    {visit.age && (
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 px-1 h-4 flex-shrink-0">
                        {visit.age}
                      </Badge>
                    )}
                  </div>

                  {visit.city && (
                    <div className="flex items-center gap-1 text-[10px] text-twilight/60 mb-0.5">
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{visit.city}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[10px] text-twilight/50">
                    <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                    <span>{getTimeAgo(visit.visited_at)}</span>
                  </div>
                </div>

                {/* Bouton voir */}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0 h-7 px-2 text-xs border-primary/30 text-primary hover:bg-primary hover:text-white"
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${visit.visitor_id}`); }}
                >
                  Voir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

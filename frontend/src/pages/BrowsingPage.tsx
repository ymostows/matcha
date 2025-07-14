import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ServerCrash, Heart, MapPin, UserCheck, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { profileApi, CompleteProfile } from '@/services/profileApi';
import { API_BASE_URL } from '@/services/api';
import { useNavigate } from 'react-router-dom';

const ProfileCard: React.FC<{ profile: CompleteProfile }> = ({ profile }) => {
  const navigate = useNavigate();
  const profilePicture = profile.photos?.find(p => p.is_profile_picture)?.filename || profile.photos?.[0]?.filename;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer"
      onClick={() => navigate(`/profile/${profile.user_id}`)}
    >
      <div className="relative">
        <img 
          src={profilePicture ? `${API_BASE_URL}/${profilePicture}` : `https://source.unsplash.com/random/400x500?portrait&sig=${profile.id}`}
          alt={profile.first_name}
          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4 text-white">
          <h3 className="text-xl font-bold">{profile.first_name}, {profile.age}</h3>
          <div className="flex items-center text-sm opacity-90">
            <MapPin className="w-4 h-4 mr-1" />
            {profile.city || 'Non spécifié'}
          </div>
        </div>
        <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <Heart className="w-3 h-3" /> {profile.fame_rating}
        </div>
      </div>
    </motion.div>
  );
};

const BrowsingPage: React.FC = () => {
  const [profiles, setProfiles] = useState<CompleteProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        // Pour l'instant, on charge quelques profils au hasard.
        // Plus tard, on pourra ajouter des filtres.
        const fetchedProfiles = await profileApi.searchProfiles({});
        setProfiles(fetchedProfiles);
      } catch (err) {
        setError("Impossible de charger les profils pour le moment.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-display font-bold text-twilight mb-2">Découvrez des profils</h1>
        <p className="text-lg text-twilight/60">Trouvez des personnes qui partagent vos centres d'intérêt.</p>
      </header>
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
          <p className="text-twilight/60">Chargement des profils...</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ServerCrash className="w-20 h-20 text-red-400 mb-4" />
          <h3 className="text-2xl font-semibold text-twilight mb-2">Oups, une erreur est survenue</h3>
          <p className="text-twilight/60 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer de charger la page
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
        >
          {profiles.map(profile => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default BrowsingPage; 
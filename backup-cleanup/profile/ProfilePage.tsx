import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Heart, Eye, Star, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ProfileForm } from './ProfileForm';
import { ProfileStats } from './ProfileStats';
import { profileApi, ProfileData, CompleteProfile } from '../../services/profileApi';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'history'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<CompleteProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger le profil au montage du composant
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await profileApi.getMyProfile();
      setProfileData(profile);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      // Le profil n'existe peut-être pas encore, ce n'est pas grave
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Sauvegarder le profil
  const handleSaveProfile = async (data: ProfileData) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedProfile = await profileApi.updateProfile(data);
      setProfileData(updatedProfile);
      alert('Profil sauvegardé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError('Erreur lors de la sauvegarde du profil');
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Mon Profil', icon: User },
    { id: 'stats', label: 'Statistiques', icon: Star },
    { id: 'history', label: 'Historique', icon: Eye }
  ] as const;

  return (
    <div className="min-h-screen bg-sunset-soft p-4">
      <div className="max-w-6xl mx-auto">
        {/* Bouton retour */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/profile')}
            className="text-twilight hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au profil
          </Button>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-display font-bold text-twilight mb-2">
            Gestion du <span className="font-romantic text-sunset-glow">Profil</span>
          </h1>
          <p className="text-twilight/70 text-lg">
            Complétez et gérez votre profil pour maximiser vos chances de matches
          </p>
        </motion.div>

        {/* Navigation des onglets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-muted/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-border">
            <div className="flex gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
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
        </motion.div>

        {/* Contenu des onglets */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'profile' && (
            <ProfileForm
              initialData={profileData || undefined}
              onSave={handleSaveProfile}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'stats' && profileData && (
            <ProfileStats profile={profileData} />
          )}

          {activeTab === 'history' && (
            <Card className="glow-gentle">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-sunset" />
                  Historique des interactions
                </CardTitle>
                <CardDescription>
                  Vos likes et visites de profil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Heart className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-twilight mb-2">Aucun historique pour le moment</h3>
                  <p className="text-twilight/60">
                    Commencez à explorer des profils pour voir votre historique ici
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}; 
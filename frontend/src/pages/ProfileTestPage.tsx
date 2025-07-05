import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileFormSimple } from '../components/profile/ProfileFormSimple';
import { profileApi, CompleteProfile } from '../services/profileApi';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { ArrowLeft, User } from 'lucide-react';

export const ProfileTestPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CompleteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger le profil au montage
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await profileApi.getMyProfile();
      setProfile(response);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (success: boolean) => {
    if (success) {
      // Recharger le profil après sauvegarde
      loadProfile();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-twilight/60">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="text-twilight hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au dashboard
          </Button>
          
          <div className="flex items-center gap-2 text-twilight/60">
            <User className="w-4 h-4" />
            <span>Test du système de profil</span>
          </div>
        </div>

        {/* Contenu */}
        <div className="space-y-8">
          {/* Informations utilisateur */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold text-twilight mb-4">Utilisateur connecté</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Email</label>
                <p className="text-twilight">{user?.email || 'Non défini'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Nom d'utilisateur</label>
                <p className="text-twilight">{user?.username || 'Non défini'}</p>
              </div>
            </div>
          </div>

          {/* Profil actuel */}
          {profile && (
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-xl font-semibold text-twilight mb-4">Profil actuel</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Nom complet</label>
                  <p className="text-twilight">{profile.first_name} {profile.last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Âge</label>
                  <p className="text-twilight">{profile.age || 'Non défini'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Genre</label>
                  <p className="text-twilight">{profile.gender || 'Non défini'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Ville</label>
                  <p className="text-twilight">{profile.city || 'Non définie'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600">Biographie</label>
                  <p className="text-twilight">{profile.biography || 'Non définie'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600">Centres d'intérêt</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.interests && profile.interests.length > 0 ? (
                      profile.interests.map((interest: string, index: number) => (
                        <span key={index} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                          {interest}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">Aucun centre d'intérêt défini</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire de modification */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <ProfileFormSimple 
              initialData={profile || undefined} 
              onSave={handleSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 
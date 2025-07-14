import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Save, User, Camera, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserInfoForm } from '@/components/profile/UserInfoForm';
import { PhotoUploadAdvanced } from '@/components/profile/PhotoUploadAdvanced';
import { LocationPickerSimple } from '@/components/profile/LocationPickerSimple';
import { profileApi } from '@/services/profileApi';
import { useAuth } from '@/contexts/AuthContext';
import { CompleteProfile, ProfileData, UserUpdateData } from '@/services/profileApi';

type EditableProfile = Partial<CompleteProfile & UserUpdateData & ProfileData>;

export const ProfileEditPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await profileApi.getMyProfile();
        setProfile(profileData);
      } catch (error) {
        setError('Impossible de charger votre profil.');
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleProfileDataChange = useCallback((data: EditableProfile) => {
    setProfile((prev) => (prev ? { ...prev, ...data } : data));
  }, []);

  const handleLocationChange = useCallback((loc: { latitude: number | null; longitude: number | null; city: string }) => {
    handleProfileDataChange({ 
      latitude: loc.latitude ?? undefined,
      longitude: loc.longitude ?? undefined,
      city: loc.city
    });
  }, [handleProfileDataChange]);

  const initialLocation = useMemo(() => ({
    city: profile?.city,
    latitude: profile?.latitude,
    longitude: profile?.longitude,
  }), [profile?.city, profile?.latitude, profile?.longitude]);

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Les photos sont gérées par leur propre composant
      // On sauvegarde les informations utilisateur et profil
      const userData = {
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
      };

      const profileData = {
        age: profile.age,
        gender: profile.gender,
        sexual_orientation: profile.sexual_orientation,
        biography: profile.biography,
        interests: profile.interests,
        city: profile.city,
        latitude: profile.latitude,
        longitude: profile.longitude,
      };

      await Promise.all([
        profileApi.updateUserInfo(userData),
        profileApi.updateProfile(profileData)
      ]);
      
      await refreshUser();
      setSuccessMessage('Votre profil a été mis à jour avec succès !');
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-twilight/60">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 bg-gray-50">
        <p>{error || "Impossible de charger le profil."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-twilight">Modifier le profil</h1>
            <p className="text-twilight/60 mt-1">Mettez à jour vos informations personnelles et vos photos.</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </header>

        {successMessage && <div className="p-4 bg-green-100 text-green-800 rounded-lg">{successMessage}</div>}
        {error && <div className="p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User /> Informations Personnelles</CardTitle>
            <CardDescription>Données de base de votre compte.</CardDescription>
          </CardHeader>
          <CardContent>
            <UserInfoForm profileData={profile} onDataChange={handleProfileDataChange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Camera /> Vos Photos</CardTitle>
            <CardDescription>Gérez vos photos de profil.</CardDescription>
          </CardHeader>
          <CardContent>
            <PhotoUploadAdvanced
              photos={profile.photos || []}
              onPhotosChange={(photos) => handleProfileDataChange({ photos: photos as any })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin /> Votre Localisation</CardTitle>
            <CardDescription>Aidez les autres à vous trouver.</CardDescription>
          </CardHeader>
          <CardContent>
            <LocationPickerSimple
              initialLocation={initialLocation}
              onLocationChange={handleLocationChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 
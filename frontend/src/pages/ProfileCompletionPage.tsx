import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Camera, MapPin, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserInfoForm } from '@/components/profile/UserInfoForm';
import { PhotoUploadAdvanced } from '@/components/profile/PhotoUploadAdvanced';
import { LocationPickerSimple } from '@/components/profile/LocationPickerSimple';
import { profileApi } from '@/services/profileApi';
import { useAuth } from '@/contexts/AuthContext';
import { checkProfileCompletion } from '@/hooks/useProfileCompletion';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
}

export const ProfileCompletionPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<any>(null); // null pour l'état initial
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const handleProfileDataChange = useCallback((data: any) => {
    setProfile((prev: any) => ({ ...prev, ...data }));
  }, []);

  const handlePhotosChange = useCallback((photos: any[]) => {
    setProfile((prev: any) => ({ ...prev, photos }));
  }, []);

  const handleLocationChange = useCallback((loc: any) => {
    setProfile((prev: any) => ({ ...prev, ...loc }));
  }, []);

  const steps = [
    { id: 0, title: "Profil", description: "Parlez-nous de vous", icon: Heart },
    { id: 1, title: "Photos", description: "Ajoutez des photos", icon: Camera },
    { id: 2, title: "Localisation", description: "Où vous situez-vous ?", icon: MapPin },
  ];

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await profileApi.getMyProfile();
        setProfile(profileData);
      } catch (error) {
        setProfile({}); // Initialiser comme objet vide si pas de profil
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const saveFullProfile = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      if (!profile || !user) return false;

      const userInfoToSave = {
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: user.email,
      };
      
      const profileDataToSave = {
        gender: profile.gender,
        sexual_orientation: profile.sexual_orientation,
        biography: profile.biography,
        interests: profile.interests,
        city: profile.city,
        latitude: profile.latitude,
        longitude: profile.longitude,
        age: profile.age
      };

      await Promise.all([
        profileApi.updateUserInfo(userInfoToSave),
        profileApi.updateProfile(profileDataToSave)
      ]);
      
      // On rafraîchit le contexte global ici, une fois que tout est sauvegardé.
      await refreshUser();
      
      return true;
    } catch (error) {
      setCompletionError("Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  const goToNext = async () => {
    // La sauvegarde des étapes individuelles est retirée.
    // La validation et la sauvegarde se font uniquement à la fin.
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Étape finale : valider, sauvegarder, et rediriger
      const { isComplete, missingFields } = checkProfileCompletion(profile);
      if (isComplete) {
        const saved = await saveFullProfile();
        if (saved) {
          navigate('/dashboard');
        }
      } else {
        setCompletionError(`Veuillez compléter les champs suivants pour terminer : ${missingFields.join(', ')}`);
      }
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  const renderStepContent = () => {
    const animationProps = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.2 },
    };

    switch (currentStep) {
      case 0:
        return (
          <motion.div key={0} {...animationProps}>
            <UserInfoForm
              profileData={profile}
              onDataChange={handleProfileDataChange}
            />
          </motion.div>
        );
      case 1:
        return (
          <motion.div key={1} {...animationProps}>
            <PhotoUploadAdvanced
              photos={profile?.photos || []}
              onPhotosChange={handlePhotosChange}
            />
          </motion.div>
        );
      case 2:
        return (
          <motion.div key={2} {...animationProps}>
            <LocationPickerSimple
              initialLocation={{ city: profile?.city, latitude: profile?.latitude, longitude: profile?.longitude }}
              onLocationChange={handleLocationChange}
            />
          </motion.div>
        );
      default:
        return null;
    }
  };

  if (isLoading || profile === null) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                <p className="text-twilight/60">Chargement de votre profil...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <currentStepData.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-twilight">{currentStepData.title}</h1>
                <p className="text-twilight/60">{currentStepData.description}</p>
              </div>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <motion.div
              className="bg-primary h-2 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>
          
          <div className="min-h-[380px] sm:min-h-[400px] py-4">
            {renderStepContent()}
          </div>

          {completionError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg mt-4"
            >
              {completionError}
            </motion.div>
          )}

          <div className="flex justify-between mt-8">
            <Button variant="ghost" onClick={goToPrevious} disabled={currentStep === 0 || isSaving}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
            <Button onClick={goToNext} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (currentStep < steps.length - 1 ? <ArrowRight className="w-4 h-4 ml-2" /> : <Check className="w-4 h-4 ml-2" />)}
              {isSaving ? 'Sauvegarde...' : (currentStep === steps.length - 1 ? 'Terminer' : 'Suivant')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
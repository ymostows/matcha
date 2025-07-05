import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, MapPin, Heart, ArrowRight, ArrowLeft, Save, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ProfileFormSimple } from './ProfileFormSimple';
import { PhotoUploadAdvanced } from './PhotoUploadAdvanced';
import { PhotoUploadWithPreview } from './PhotoUploadWithPreview';
import { ProfilePictureSelector } from './ProfilePictureSelector';
import { LocationPickerSimple } from './LocationPickerSimple';
import { profileApi } from '../../services/profileApi';
import type { User as AuthUser } from '../../types/auth';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  isRequired: boolean;
}

export const ProfileEditPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Définir les étapes d'édition
  const steps: Step[] = [
    {
      id: 0,
      title: "Informations personnelles",
      description: "Modifiez vos informations de profil",
      icon: Heart,
      isRequired: true
    },
    {
      id: 1,
      title: "Photos de profil",
      description: "Gérez vos photos et votre photo de profil",
      icon: Camera,
      isRequired: true
    },
    {
      id: 2,
      title: "Localisation",
      description: "Modifiez votre localisation",
      icon: MapPin,
      isRequired: false
    }
  ];

  // Charger le profil
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profileData = await profileApi.getMyProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      setError('Erreur lors du chargement du profil');
    } finally {
      setIsLoading(false);
    }
  };

  // Mettre à jour les données du profil
  const updateProfile = (updates: any) => {
    setProfile((prev: any) => ({ ...prev, ...updates }));
  };

  // Fonction pour passer à l'étape suivante
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Fonction pour revenir à l'étape précédente
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Sauvegarder l'étape actuelle
  const saveCurrentStep = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const saveFunctionName = `save${steps[currentStep].title.replace(/\s+/g, '')}`;
      const saveFunction = (window as any)[saveFunctionName];
      
      if (saveFunction) {
        const result = await saveFunction();
        if (result !== false) {
          await loadProfile(); // Recharger après sauvegarde
          return true;
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde étape:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Aller à l'étape suivante
  const goToNext = async () => {
    const saved = await saveCurrentStep();
    if (saved) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleFinish();
      }
    }
  };

  // Sauvegarder et terminer
  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // Sauvegarder la dernière étape avant de terminer
      if (currentStep === 1 && (window as any).savePhotoUpload) {
        await (window as any).savePhotoUpload();
      } else if (currentStep === 0 && (window as any).saveProfileForm) {
        await (window as any).saveProfileForm();
      }
      
      // Naviguer vers le profil public avec rechargement des données
      navigate('/profile', { replace: true });
      window.location.reload(); // Force le rechargement pour éviter l'écran blanc
    } catch (error) {
      console.error('Erreur finalisation:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Affichage pendant le chargement
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
        {/* Header avec navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/profile')}
            className="text-twilight hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au profil
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/profile')}
            className="text-twilight hover:text-primary"
          >
            <Eye className="w-4 h-4 mr-2" />
            Voir mon profil public
          </Button>
        </div>

        {/* Titre principal */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-twilight mb-2">
            Modifier mon <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">profil</span>
          </h1>
          <p className="text-twilight/70 text-lg">
            Mettez à jour vos informations pour améliorer votre profil
          </p>
        </motion.div>

        {/* Indicateur de progression */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <motion.div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      index === currentStep
                        ? 'border-primary bg-primary text-white'
                        : index < currentStep
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                    whileHover={{ scale: 1.05 }}
                  >
                    <step.icon className="w-5 h-5" />
                  </motion.div>
                  <div className="mt-2 text-center max-w-24">
                    <p className={`text-xs font-medium ${
                      index === currentStep ? 'text-primary' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 transition-all duration-300 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Contenu de l'étape actuelle */}
        <div className="max-w-2xl mx-auto">
          <Card className="mb-6">
            <CardContent className="p-8">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Étape 0: Informations personnelles */}
                {currentStep === 0 && (
                  <ProfileFormSimple
                    initialData={profile}
                    onSave={() => {}}
                  />
                )}
                
                {/* Étape 1: Photos */}
                {currentStep === 1 && (
                  <PhotoUploadAdvanced
                    photos={profile?.photos || []}
                    onPhotosChange={(newPhotos: any[]) => {
                      setProfile((prev: any) => ({ ...prev, photos: newPhotos }));
                    }}
                    onSave={() => {}}
                  />
                )}
                
                {/* Étape 2: Localisation */}
                {currentStep === 2 && (
                  <LocationPickerSimple
                    initialLocation={{
                      latitude: profile?.location_lat,
                      longitude: profile?.location_lng,
                      city: profile?.city
                    }}
                    onSave={() => {}}
                  />
                )}
              </motion.div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Précédent
            </Button>
            <Button
              onClick={goToNext}
              disabled={isSaving}
              className="bg-gradient-to-r from-primary to-accent hover:shadow-lg"
            >
              {currentStep === steps.length - 1 ? 'Terminer' : 'Suivant'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 
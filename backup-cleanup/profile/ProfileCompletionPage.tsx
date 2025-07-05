import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Camera, MapPin, Heart, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { UserInfoForm } from './UserInfoForm';
import { ProfileForm } from './ProfileForm';
import { PhotoUpload } from './PhotoUpload';
import { LocationPicker } from './LocationPicker';
import { profileApi, ProfileData } from '../../services/profileApi';

interface ProfileCompletionStep {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType;
  component: React.ComponentType<any>;
  isCompleted: boolean;
  isRequired: boolean;
}

export const ProfileCompletionPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completionProgress, setCompletionProgress] = useState(0);

  // États pour chaque étape
  const [userInfoCompleted, setUserInfoCompleted] = useState(false);
  const [profileFormCompleted, setProfileFormCompleted] = useState(false);
  const [photosCompleted, setPhotosCompleted] = useState(false);
  const [locationCompleted, setLocationCompleted] = useState(false);

  // Charger le profil existant
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await profileApi.getMyProfile();
      setProfile(profileData);
      
      // Vérifier la complétion de chaque étape
      checkCompletionStatus(profileData);
    } catch (error) {
      console.log('Nouveau profil à créer');
    } finally {
      setIsLoading(false);
    }
  };

  const checkCompletionStatus = (profileData: any) => {
    // Vérifier les infos utilisateur (toujours complétées si on est là)
    setUserInfoCompleted(true);
    
    // Vérifier le profil
    const hasProfileInfo = profileData?.gender && profileData?.sexual_orientation && 
                          profileData?.biography && profileData?.interests?.length > 0;
    setProfileFormCompleted(!!hasProfileInfo);
    
    // Vérifier les photos
    const hasPhotos = profileData?.photos?.length > 0;
    setPhotosCompleted(hasPhotos);
    
    // Vérifier la localisation
    const hasLocation = profileData?.city || (profileData?.location_lat && profileData?.location_lng);
    setLocationCompleted(!!hasLocation);
    
    // Calculer le progrès
    const completedSteps = [true, hasProfileInfo, hasPhotos, hasLocation].filter(Boolean).length;
    setCompletionProgress((completedSteps / 4) * 100);
  };

  // Définir les étapes
  const steps: ProfileCompletionStep[] = [
    {
      id: 0,
      title: "Informations personnelles",
      description: "Vérifiez et complétez vos informations de base",
      icon: User,
      component: UserInfoForm,
      isCompleted: userInfoCompleted,
      isRequired: true
    },
    {
      id: 1,
      title: "Profil de rencontre",
      description: "Parlez-nous de vous et de vos préférences",
      icon: Heart,
      component: ProfileForm,
      isCompleted: profileFormCompleted,
      isRequired: true
    },
    {
      id: 2,
      title: "Photos de profil",
      description: "Ajoutez des photos pour vous présenter",
      icon: Camera,
      component: PhotoUpload,
      isCompleted: photosCompleted,
      isRequired: true
    },
    {
      id: 3,
      title: "Localisation",
      description: "Permettez-nous de vous localiser pour de meilleures suggestions",
      icon: MapPin,
      component: LocationPicker,
      isCompleted: locationCompleted,
      isRequired: false
    }
  ];

  const currentStepData = steps[currentStep];
  const CurrentComponent = currentStepData.component;

  const handleStepCompletion = () => {
    // Recharger le profil pour mettre à jour le statut
    loadProfile();
    
    // Passer à l'étape suivante ou terminer
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Toutes les étapes sont terminées
      handleCompletion();
    }
  };

  const handleCompletion = () => {
    // Vérifier si toutes les étapes requises sont complétées
    const requiredStepsCompleted = steps.filter(step => step.isRequired).every(step => step.isCompleted);
    
    if (requiredStepsCompleted || completionProgress >= 75) {
      navigate('/dashboard');
    }
  };

  const canSkipToStep = (stepIndex: number) => {
    // On peut aller à une étape si toutes les étapes précédentes requises sont complétées
    for (let i = 0; i < stepIndex; i++) {
      const step = steps[i];
      if (step.isRequired && !step.isCompleted) {
        return false;
      }
    }
    return true;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-twilight/60">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header avec progression globale */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Titre */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-display font-bold text-twilight mb-2">
              🎯 Complétez votre profil
            </h1>
            <p className="text-twilight/70 text-lg">
              Plus votre profil est complet, plus vous avez de chances de faire de belles rencontres !
            </p>
          </div>
          
          {/* Barre de progression globale */}
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-twilight">Étape {currentStep + 1} sur {steps.length}</span>
              <span className="text-sm font-medium text-primary">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            
            {/* Barre de progression par étapes */}
            <div className="flex space-x-2 mb-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    index <= currentStep
                      ? 'bg-gradient-to-r from-primary to-sunset'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            
            {/* Titre de l'étape actuelle */}
            <div className="text-center">
              <h2 className="text-xl font-semibold text-twilight">{currentStepData.title}</h2>
              <p className="text-twilight/60">{currentStepData.description}</p>
            </div>
          </div>
        </motion.div>

        {/* Contenu principal en pleine largeur */}
        <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <currentStepData.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
                        <p className="text-twilight/60">{currentStepData.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Rendu du composant de l'étape actuelle */}
                                         {currentStep === 0 && (
                       <UserInfoForm
                         initialData={{
                           first_name: user?.first_name || '',
                           last_name: user?.last_name || '',
                           email: user?.email || ''
                         }}
                         onSave={() => setUserInfoCompleted(true)}
                       />
                     )}
                     
                     {currentStep === 1 && (
                       <ProfileForm
                         initialData={profile}
                         onSave={() => setProfileFormCompleted(true)}
                         isLoading={false}
                       />
                     )}
                     
                     {currentStep === 2 && (
                       <PhotoUpload
                         photos={profile?.photos || []}
                         onPhotosChange={(newPhotos: any[]) => {
                           setProfile((prev: any) => ({ ...prev, photos: newPhotos }));
                           setPhotosCompleted(newPhotos.length > 0);
                         }}
                       />
                     )}
                     
                     {currentStep === 3 && (
                       <LocationPicker
                         initialLocation={{
                           latitude: profile?.location_lat,
                           longitude: profile?.location_lng,
                           city: profile?.city
                         }}
                         onLocationChange={() => setLocationCompleted(true)}
                       />
                     )}
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                  >
                    Précédent
                  </Button>
                  
                  <div className="flex gap-3">
                    {!currentStepData.isRequired && (
                      <Button
                        variant="ghost"
                        onClick={handleStepCompletion}
                      >
                        Passer cette étape
                      </Button>
                    )}
                    
                    <Button
                      onClick={handleStepCompletion}
                      className="flex items-center gap-2"
                    >
                      {currentStep === steps.length - 1 ? 'Terminer' : 'Suivant'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
                         </AnimatePresence>
         </div>
       </div>
     </div>
   );
 }; 
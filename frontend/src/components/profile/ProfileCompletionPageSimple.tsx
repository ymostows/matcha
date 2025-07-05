import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, MapPin, Heart, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ProfileFormSimple } from './ProfileFormSimple';
import { PhotoUploadSimple } from './PhotoUploadSimple';
import { LocationPickerSimple } from './LocationPickerSimple';

import { profileApi } from '../../services/profileApi';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  isRequired: boolean;
}

export const ProfileCompletionPageSimple: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Définir les étapes (suppression de l'étape informations personnelles)
  const steps: Step[] = [
    {
      id: 0,
      title: "Profil de rencontre",
      description: "Parlez-nous de vous et de vos préférences",
      icon: Heart,
      isRequired: true
    },
    {
      id: 1,
      title: "Photos de profil",
      description: "Ajoutez des photos pour vous présenter",
      icon: Camera,
      isRequired: true
    },
    {
      id: 2,
      title: "Localisation",
      description: "Aidez-nous à vous proposer des rencontres près de chez vous",
      icon: MapPin,
      isRequired: false // La localisation reste optionnelle
    }
  ];

  // Charger le profil existant
  useEffect(() => {
    loadProfile();
    
    // Exposer une fonction de test globale
    (window as any).testProfileCompletion = async () => {
      try {
        // console.log('🧪 Test de récupération du profil...');
        // console.log('📋 Profil récupéré:', profile);
        // console.log('✅ Vérifications:', checks);
        // console.log('🎯 Profil complet:', Object.values(checks).every(check => check));
        
        return profile;
      } catch (error) {
        // console.error('❌ Erreur test profil:', error);
        return null;
      }
    };
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await profileApi.getMyProfile();
      setProfile(profileData);
    } catch (error) {
      console.log('Nouveau profil à créer');
    } finally {
      setIsLoading(false);
    }
  };

  // Sauvegarder l'étape actuelle
  const saveCurrentStep = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      // Appeler la fonction de sauvegarde du composant actuel
      const saveFunctionName = `save${steps[currentStep].title.replace(/\s+/g, '')}`;
      const saveFunction = (window as any)[saveFunctionName];
      
      if (saveFunction) {
        const result = await saveFunction();
        if (result !== false) {
          // Recharger le profil après sauvegarde
          await loadProfile();
          return true;
        }
        return false;
      }
      return true; // Si pas de fonction de sauvegarde, continuer
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
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
        finish();
      }
    }
  };

  // Aller à l'étape précédente
  const goToPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Sauvegarder toutes les données du profil en une fois
  const saveAllProfileData = async (): Promise<boolean> => {
    setIsSaving(true);
    
    try {
      console.log('=== DEBUT SAUVEGARDE COMPLETE ===');
      console.log('📋 Profil actuel avant sauvegarde:', profile);
      
      // Vérification que nous avons toutes les données nécessaires
      if (!profile || !profile.age || !profile.gender || !profile.sexual_orientation || !profile.biography) {
        console.error('❌ Données manquantes dans le profil local:', {
          age: profile?.age,
          gender: profile?.gender,
          sexual_orientation: profile?.sexual_orientation,
          biography: profile?.biography,
          interests: profile?.interests?.length || 0
        });
        alert('Veuillez compléter toutes les étapes du profil avant de finaliser.');
        return false;
      }
      
      // 1. Sauvegarder le profil complet directement
      console.log('💾 Sauvegarde directe du profil...');
      try {
        const profileData = {
          age: profile.age,
          gender: profile.gender,
          sexual_orientation: profile.sexual_orientation,
          biography: profile.biography,
          interests: profile.interests || []
        };
        
        console.log('📝 Données à sauvegarder:', profileData);
        await profileApi.updateProfile(profileData);
        console.log('✅ Profil sauvegardé avec succès');
      } catch (error) {
        console.error('❌ Erreur sauvegarde profil:', error);
        return false;
      }
      
      // 2. Les photos sont déjà sauvegardées à l'upload individuel
      
      
      // 3. Vérifier le profil après sauvegarde
      console.log('🔍 Vérification du profil après sauvegarde...');
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
        const profileCheck = await profileApi.getMyProfile();
        console.log('📋 Profil après sauvegarde:', profileCheck);
        
        const isComplete = !!(
          profileCheck.age &&
          profileCheck.gender && 
          profileCheck.sexual_orientation && 
          profileCheck.biography && 
          profileCheck.interests && profileCheck.interests.length > 0 &&
          profileCheck.photos && profileCheck.photos.length > 0
        );
        console.log('🎯 Profil complet après sauvegarde:', isComplete);
        
        if (!isComplete) {
          console.warn('⚠️ Le profil ne semble pas complet après sauvegarde');
          console.warn('Détails manquants:', {
            age: !!profileCheck.age,
            gender: !!profileCheck.gender,
            orientation: !!profileCheck.sexual_orientation,
            bio: !!profileCheck.biography,
            interests: !!(profileCheck.interests && profileCheck.interests.length > 0),
            photos: !!(profileCheck.photos && profileCheck.photos.length > 0)
          });
        }
        
        return isComplete;
      } catch (error) {
        console.warn('⚠️ Erreur vérification profil:', error);
        // On considère que c'est OK si on ne peut pas vérifier
        return true;
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde complète:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Terminer et aller au profil public
  const finish = async () => {
    console.log('🚀 === DEBUT PROCESSUS DE FINALISATION ===');
    const saved = await saveAllProfileData();
    console.log('💾 Résultat sauvegarde:', saved);
    
    if (saved) {
      console.log('🎉 Profil créé avec succès! Redirection vers votre profil...');
      
      // Attendre un peu pour que la base soit synchronisée
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Utiliser la route spéciale sans vérification de profil complet
      try {
        console.log('🔄 Redirection vers profile-success...');
        navigate('/profile-success');
      } catch (error) {
        console.error('Erreur redirection:', error);
        // Fallback avec rechargement de page
        window.location.href = '/profile-success';
      }
    } else {
      console.error('❌ Échec de la sauvegarde du profil');
      alert('Erreur lors de la sauvegarde de votre profil. Veuillez réessayer.');
    }
  };

  const currentStepData = steps[currentStep];

  // Fonction pour tester l'état du profil (accessible via console)
  React.useEffect(() => {
    (window as any).testProfileCompletion = async () => {
      console.log('=== TEST PROFIL COMPLETION ===');
      try {
        const profile = await profileApi.getMyProfile();
        console.log('📋 Profil récupéré:', profile);
        
        const checks = {
          hasGender: !!profile.gender,
          hasOrientation: !!profile.sexual_orientation,
          hasBio: !!profile.biography,
          hasInterests: !!(profile.interests && profile.interests.length > 0),
          hasPhotos: !!(profile.photos && profile.photos.length > 0),
          hasAge: !!profile.age
        };
        
        console.log('🔍 Vérifications:', checks);
        
        const isComplete = Object.values(checks).every(Boolean);
        console.log('✅ Profil complet:', isComplete);
        
        return { profile, checks, isComplete };
      } catch (error) {
        console.error('❌ Erreur test profil:', error);
        return null;
      }
    };
    
    // Debug : aussi ajouter pour forcer la redirection
    (window as any).forceRedirectToProfile = () => {
      console.log('🔄 Force redirection to profile-success...');
      window.location.href = '/profile-success';
    };

    // Fonction pour recevoir les mises à jour du profil depuis les composants enfants
    (window as any).updateParentProfile = (profileData: any) => {
      console.log('📝 Mise à jour du profil local depuis l\'enfant:', profileData);
      setProfile((prev: any) => ({ ...prev, ...profileData }));
    };

    return () => {
      delete (window as any).testProfileCompletion;
      delete (window as any).forceRedirectToProfile;
      delete (window as any).updateParentProfile;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center pt-20 pb-8">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-twilight/60">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
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
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-twilight">Étape {currentStep + 1} sur {steps.length}</span>
              <span className="text-sm font-medium text-primary">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            
            {/* Barre de progression par étapes */}
            <div className="flex space-x-2 mb-6">
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
            
            {/* Titre simplifié de l'étape actuelle */}
            <div className="text-center">
              <p className="text-twilight/60 text-sm">Étape {currentStep + 1} : {currentStepData.description}</p>
            </div>
          </div>
        </motion.div>

        {/* Contenu principal */}
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
                {/* Rendu du composant de l'étape actuelle */}
                {currentStep === 0 && (
                  <ProfileFormSimple
                    initialData={profile}
                    onSave={() => {}} // La sauvegarde est gérée par la page
                  />
                )}
                
                {currentStep === 1 && (
                  <PhotoUploadSimple
                    photos={profile?.photos || []}
                    onPhotosChange={(newPhotos) => {
                      setProfile((prev: any) => ({ ...prev, photos: newPhotos }));
                    }}
                    onSave={() => {}} // La sauvegarde est gérée par la page
                  />
                )}
                
                {currentStep === 2 && (
                  <LocationPickerSimple
                    initialLocation={profile}
                    onSave={() => {}} // La sauvegarde est gérée par la page
                  />
                )}
              </motion.div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentStep === 0 || isSaving}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Précédent
            </Button>
            
            <div className="flex items-center gap-3">
              {/* Bouton "Passer cette étape" pour les étapes optionnelles */}
              {!currentStepData.isRequired && currentStep !== steps.length - 1 && (
                <Button
                  variant="ghost"
                  onClick={goToNext}
                  disabled={isSaving}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Passer cette étape
                </Button>
              )}
              
              <Button
                onClick={currentStep === steps.length - 1 ? finish : goToNext}
                disabled={isSaving}
                className="flex items-center gap-2 px-6"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {currentStep === steps.length - 1 ? 'Finalisation de votre profil...' : 'Passage à l\'étape suivante...'}
                  </>
                ) : currentStep === steps.length - 1 ? (
                  <>
                    <Check className="w-4 h-4" />
                    Créer mon profil
                  </>
                ) : !currentStepData.isRequired ? (
                  <>
                    Configurer et continuer
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileApi } from '../services/profileApi';

interface ProfileCompletionStatus {
  isComplete: boolean;
  isLoading: boolean;
  completionPercentage: number;
  missingFields: string[];
}

export const useProfileCompletion = (): ProfileCompletionStatus => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ProfileCompletionStatus>({
    isComplete: false,
    isLoading: true,
    completionPercentage: 0,
    missingFields: []
  });

  useEffect(() => {
    if (!user) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    checkProfileCompletion();
  }, [user]);

  const checkProfileCompletion = async () => {
    try {
      const profile = await profileApi.getMyProfile();
      
      // Définir les champs requis
      const requiredFields = [
        { key: 'gender', label: 'Genre' },
        { key: 'sexual_orientation', label: 'Orientation sexuelle' },
        { key: 'biography', label: 'Biographie' },
        { key: 'interests', label: 'Centres d\'intérêt', check: (val: any) => val && val.length > 0 },
        { key: 'photos', label: 'Photos', check: (val: any) => val && val.length > 0 }
      ];

      // Champs optionnels mais recommandés
      const optionalFields = [
        { key: 'city', label: 'Ville' },
        { key: 'location_lat', label: 'Géolocalisation' }
      ];

      const allFields = [...requiredFields, ...optionalFields];
      
      // Vérifier la complétion
      const missingFields: string[] = [];
      let completedCount = 0;

      requiredFields.forEach(field => {
        const value = profile[field.key];
        const isComplete = field.check ? field.check(value) : (value && value.toString().trim().length > 0);
        
        if (!isComplete) {
          missingFields.push(field.label);
        } else {
          completedCount++;
        }
      });

      // Ajouter les champs optionnels au score
      optionalFields.forEach(field => {
        const value = profile[field.key];
        const isComplete = field.check ? field.check(value) : (value && value.toString().trim().length > 0);
        
        if (isComplete) {
          completedCount++;
        }
      });

      const completionPercentage = Math.round((completedCount / allFields.length) * 100);
      const isComplete = missingFields.length === 0; // Tous les champs requis sont remplis

      setStatus({
        isComplete,
        isLoading: false,
        completionPercentage,
        missingFields
      });

    } catch (error) {
      console.error('Erreur lors de la vérification du profil:', error);
      
      // Si le profil n'existe pas, il n'est pas complet
      setStatus({
        isComplete: false,
        isLoading: false,
        completionPercentage: 0,
        missingFields: ['Profil complet']
      });
    }
  };

  return status;
}; 
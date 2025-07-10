import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileCompletionStatus {
  isComplete: boolean;
  isLoading: boolean;
  completionPercentage: number;
  missingFields: string[];
}

const requiredFields: Array<{ key: keyof any; label: string; check?: (val: any) => boolean }> = [
  { key: 'gender', label: 'Genre' },
  { key: 'sexual_orientation', label: 'Orientation sexuelle' },
  { key: 'biography', label: 'Biographie' },
  { key: 'interests', label: 'Centres d\'intérêt', check: (val: any) => Array.isArray(val) && val.length > 0 },
  { key: 'photos', label: 'Photos', check: (val: any) => Array.isArray(val) && val.length > 0 }
];

const optionalFields: Array<{ key: keyof any; label: string; check?: (val: any) => boolean }> = [
  { key: 'city', label: 'Ville' },
];

export const checkProfileCompletion = (profile: any): { isComplete: boolean; missingFields: string[]; completionPercentage: number } => {
  if (!profile) {
    return { isComplete: false, missingFields: ['Profil non chargé'], completionPercentage: 0 };
  }

  const allFields = [...requiredFields, ...optionalFields];
  
  const missingFields: string[] = [];
  let completedCount = 0;

  requiredFields.forEach(field => {
    const value = profile[field.key];
    const isComplete = field.check ? field.check(value) : !!value;
    
    if (!isComplete) {
      missingFields.push(field.label);
    } else {
      completedCount++;
    }
  });

  optionalFields.forEach(field => {
    const value = profile[field.key];
    const isComplete = field.check ? field.check(value) : !!value;
    if (isComplete) {
      completedCount++;
    }
  });

  const completionPercentage = Math.round((completedCount / allFields.length) * 100);
  const isComplete = missingFields.length === 0;

  return {
    isComplete,
    completionPercentage,
    missingFields,
  };
};

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
      setStatus({ isComplete: false, isLoading: false, completionPercentage: 0, missingFields: ['Profil non chargé'] });
      return;
    }

    const { isComplete, completionPercentage, missingFields } = checkProfileCompletion(user);

    setStatus({
      isComplete,
      isLoading: false,
      completionPercentage,
      missingFields
    });
  }, [user]);

  return status;
}; 
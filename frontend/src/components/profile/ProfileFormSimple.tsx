import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { profileApi, ProfileData, CompleteProfile } from '../../services/profileApi';

interface ProfileFormSimpleProps {
  initialData?: CompleteProfile;
  onSave?: (success: boolean, message?: string) => void;
  onDataChange?: (data: ProfileData) => void;
}

const POPULAR_INTERESTS = [
  '🎵 Musique', '🎬 Cinéma', '📚 Lecture', '🏃‍♂️ Sport', '🎯 Gaming',
  '🍳 Cuisine', '✈️ Voyage', '🎨 Art', '📸 Photo', '🌿 Nature',
  '💃 Danse', '🎭 Théâtre', '🏔️ Randonnée', '🏊‍♀️ Natation', '🧘‍♀️ Yoga',
  '🎸 Musique live', '🍷 Œnologie', '📱 Tech', '🐕 Animaux', '🌱 Jardinage'
];

export const ProfileFormSimple: React.FC<ProfileFormSimpleProps> = ({ 
  initialData, 
  onSave,
  onDataChange
}) => {
  const [formData, setFormData] = useState<ProfileData>({
    biography: initialData?.biography || '',
    age: initialData?.age || undefined,
    gender: initialData?.gender || undefined,
    sexual_orientation: initialData?.sexual_orientation || undefined,
    interests: Array.isArray(initialData?.interests) 
      ? initialData.interests.map((i: any) => typeof i === 'string' ? i : i.name) 
      : []
  });

  // Données utilisateur pour nom/prénom/email  
  const [userData, setUserData] = useState({
    first_name: (initialData as any)?.first_name || '',
    last_name: (initialData as any)?.last_name || '',
    email: (initialData as any)?.email || ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customInterest, setCustomInterest] = useState('');
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error' | '', message: string}>({type: '', message: ''});

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation données utilisateur
    if (!userData.first_name?.trim()) {
      newErrors.first_name = 'Le prénom est requis';
    }

    if (!userData.last_name?.trim()) {
      newErrors.last_name = 'Le nom est requis';
    }

    if (!userData.email?.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Validation données profil
    if (!formData.age || formData.age < 18 || formData.age > 100) {
      newErrors.age = 'L\'âge doit être entre 18 et 100 ans';
    }

    if (!formData.gender) {
      newErrors.gender = 'Le genre est requis';
    }

    if (!formData.sexual_orientation) {
      newErrors.sexual_orientation = 'L\'orientation sexuelle est requise';
    }

    if (!formData.biography || formData.biography.length < 10) {
      newErrors.biography = 'La biographie doit contenir au moins 10 caractères';
    }

    if (formData.biography && formData.biography.length > 500) {
      newErrors.biography = 'La biographie ne peut pas dépasser 500 caractères';
    }

    if (!formData.interests || formData.interests.length === 0) {
      newErrors.interests = 'Au moins un centre d\'intérêt est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sauvegarder les données
  const saveData = async (): Promise<boolean> => {
    console.log('🔄 Tentative de sauvegarde du profil...');
    
    if (!validateForm()) {
      setSaveStatus({type: 'error', message: 'Veuillez corriger les erreurs avant de continuer'});
      onSave?.(false, 'Validation échouée');
      return false;
    }

    setIsLoading(true);
    setSaveStatus({type: '', message: ''});
    
    try {
      // Sauvegarder le profil
      console.log('📝 Sauvegarde profil:', formData);
      await profileApi.updateProfile(formData);
      
      // Sauvegarder les données utilisateur
      console.log('👤 Sauvegarde utilisateur:', userData);
      await profileApi.updateUserInfo(userData);
      
      setSaveStatus({type: 'success', message: 'Profil sauvegardé avec succès !'});
      onSave?.(true, 'Profil sauvegardé avec succès');
      
      return true;
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde profil:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Erreur de sauvegarde';
      setSaveStatus({type: 'error', message: errorMessage});
      onSave?.(false, errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Exposer la fonction de sauvegarde via ref ou fonction globale
  React.useEffect(() => {
    (window as any).saveProfileForm = saveData;
    return () => {
      delete (window as any).saveProfileForm;
    };
  }, [formData, userData]);

  // Notifier le parent des changements de données
  React.useEffect(() => {
    onDataChange?.(formData);
  }, [formData, onDataChange]);

  // Gestion des changements
  const handleChange = (field: keyof ProfileData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Effacer le statut de sauvegarde lors de modifications
    if (saveStatus.type) {
      setSaveStatus({type: '', message: ''});
    }
  };

  // Gestion des changements utilisateur
  const handleUserDataChange = (field: string, value: string) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));

    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Effacer le statut de sauvegarde lors de modifications
    if (saveStatus.type) {
      setSaveStatus({type: '', message: ''});
    }
  };

  // Ajouter un centre d'intérêt
  const addInterest = (interest: string) => {
    if (!formData.interests?.includes(interest) && (formData.interests?.length || 0) < 10) {
      handleChange('interests', [...(formData.interests || []), interest]);
    }
  };

  // Supprimer un centre d'intérêt
  const removeInterest = (interest: string) => {
    handleChange('interests', formData.interests?.filter(i => i !== interest) || []);
  };

  // Ajouter un centre d'intérêt personnalisé
  const addCustomInterest = () => {
    if (customInterest.trim() && !formData.interests?.includes(customInterest.trim())) {
      addInterest(customInterest.trim());
      setCustomInterest('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec titre */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-twilight">Profil de rencontre</h2>
        </div>
        <p className="text-twilight/60">Parlez-nous de vous et de vos préférences</p>
      </div>

      {/* Status de sauvegarde */}
      {saveStatus.type && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            saveStatus.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {saveStatus.message}
        </motion.div>
      )}

      {/* Informations de base */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Informations personnelles */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Prénom */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-twilight">
              Prénom <span className="text-red-500">*</span>
            </label>
            <Input
              value={userData.first_name}
              onChange={(e) => handleUserDataChange('first_name', e.target.value)}
              placeholder="Votre prénom"
              className={`transition-all duration-200 ${errors.first_name ? 'border-red-400' : ''}`}
            />
            {errors.first_name && <p className="text-red-500 text-sm">{errors.first_name}</p>}
          </div>

          {/* Nom */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-twilight">
              Nom <span className="text-red-500">*</span>
            </label>
            <Input
              value={userData.last_name}
              onChange={(e) => handleUserDataChange('last_name', e.target.value)}
              placeholder="Votre nom"
              className={`transition-all duration-200 ${errors.last_name ? 'border-red-400' : ''}`}
            />
            {errors.last_name && <p className="text-red-500 text-sm">{errors.last_name}</p>}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-twilight">
            Email <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={userData.email}
            onChange={(e) => handleUserDataChange('email', e.target.value)}
            placeholder="votre.email@exemple.com"
            className={`transition-all duration-200 ${errors.email ? 'border-red-400' : ''}`}
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Âge */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-twilight">
              Âge <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.age || ''}
              onChange={(e) => handleChange('age', parseInt(e.target.value) || undefined)}
              placeholder="25"
              min="18"
              max="100"
              className={errors.age ? 'border-red-400' : ''}
            />
            {errors.age && <p className="text-red-500 text-sm">{errors.age}</p>}
          </div>

          {/* Genre */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-twilight">
              Genre <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['homme', 'femme'].map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => handleChange('gender', gender)}
                  className={`p-3 border-2 rounded-xl transition-all duration-200 ${
                    formData.gender === gender
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <span className="text-lg mr-2">
                    {gender === 'homme' ? '👨' : '👩'}
                  </span>
                  {gender === 'homme' ? 'Homme' : 'Femme'}
                </button>
              ))}
            </div>
            {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
          </div>
        </div>

        {/* Orientation sexuelle */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-twilight">
            Orientation sexuelle <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'hetero', label: 'Hétérosexuel(le)', emoji: '👫' },
              { value: 'homo', label: 'Homosexuel(le)', emoji: '👬' },
              { value: 'bi', label: 'Bisexuel(le)', emoji: '💖' }
            ].map((orientation) => (
              <button
                key={orientation.value}
                type="button"
                onClick={() => handleChange('sexual_orientation', orientation.value)}
                className={`p-3 border-2 rounded-xl transition-all duration-200 text-center ${
                  formData.sexual_orientation === orientation.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                <div className="text-lg mb-1">{orientation.emoji}</div>
                <div className="text-xs font-medium">{orientation.label}</div>
              </button>
            ))}
          </div>
          {errors.sexual_orientation && <p className="text-red-500 text-sm">{errors.sexual_orientation}</p>}
        </div>

        {/* Biographie */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-twilight">
            Biographie <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={formData.biography || ''}
            onChange={(e) => handleChange('biography', e.target.value)}
            placeholder="Parlez-nous de vous, de vos passions, de ce qui vous rend unique..."
            rows={4}
            className={errors.biography ? 'border-red-400' : ''}
          />
          <div className="flex justify-between items-center">
            {errors.biography && <p className="text-red-500 text-sm">{errors.biography}</p>}
            <p className="text-sm text-gray-500 ml-auto">
              {formData.biography?.length || 0}/500 caractères
            </p>
          </div>
        </div>

        {/* Centres d'intérêt */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-twilight">
            Centres d'intérêt <span className="text-red-500">*</span>
          </label>
          
          {/* Intérêts sélectionnés */}
          {formData.interests && formData.interests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.interests.map((interest, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="text-primary/60 hover:text-primary"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              ))}
            </div>
          )}

          {/* Intérêts populaires */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-twilight">Suggestions populaires :</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {POPULAR_INTERESTS.filter(interest => !formData.interests?.includes(interest)).map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => addInterest(interest)}
                  disabled={(formData.interests?.length || 0) >= 10}
                  className="p-2 text-sm border rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Ajouter un intérêt personnalisé */}
          <div className="flex gap-2">
            <Input
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              placeholder="Ajouter un centre d'intérêt personnalisé..."
              className="flex-1"
              disabled={(formData.interests?.length || 0) >= 10}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomInterest();
                }
              }}
            />
            <Button
              type="button"
              onClick={addCustomInterest}
              disabled={!customInterest.trim() || (formData.interests?.length || 0) >= 10}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            {formData.interests?.length || 0}/10 centres d'intérêt
          </p>
          {errors.interests && <p className="text-red-500 text-sm">{errors.interests}</p>}
        </div>

        {/* Bouton de sauvegarde manuel (pour test) */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={saveData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder le profil'
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}; 
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { profileApi, ProfileData, CompleteProfile } from '../../services/profileApi';

interface ProfileFormSimpleProps {
  initialData?: CompleteProfile;
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customInterest, setCustomInterest] = useState('');

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
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
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

      {/* Informations de base */}
      <div className="space-y-6">
        {/* Informations personnelles */}
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
      </div>
    </motion.div>
  );
}; 
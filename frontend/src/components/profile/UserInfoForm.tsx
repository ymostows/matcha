import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { UserUpdateData, ProfileData, profileApi } from '../../services/profileApi';
import { FormField } from '../ui/form';

const FALLBACK_INTERESTS = [
  '🎵 Musique', '🎬 Cinéma', '📚 Lecture', '🏃‍♂️ Sport', '🎯 Gaming',
  '🍳 Cuisine', '✈️ Voyage', '🎨 Art', '📸 Photo', '🌿 Nature',
  '💃 Danse', '🎭 Théâtre', '🏔️ Randonnée', '🏊‍♀️ Natation', '🧘‍♀️ Yoga',
  '🎸 Musique live', '🍷 Œnologie', '📱 Tech', '🐕 Animaux', '🌱 Jardinage'
];

interface UserInfoFormProps {
  profileData: Partial<EditableProfileData>;
  onDataChange: (updatedData: Partial<EditableProfileData>) => void;
  externalErrors?: Record<string, string>;
}

type EditableProfileData = UserUpdateData & ProfileData;

export const UserInfoForm: React.FC<UserInfoFormProps> = ({
  profileData,
  onDataChange,
  externalErrors = {}
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const allErrors = { ...externalErrors, ...errors };
  const [customInterest, setCustomInterest] = useState('');

  const handleChange = (field: keyof EditableProfileData, value: string | number | string[] | undefined) => {
    onDataChange({ [field]: value });
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addInterest = (interest: string) => {
    const currentInterests = profileData.interests || [];
    if (!currentInterests.includes(interest) && currentInterests.length < 10) {
      handleChange('interests', [...currentInterests, interest]);
    }
  };

  const removeInterest = (interest: string) => {
    const currentInterests = profileData.interests || [];
    handleChange('interests', currentInterests.filter(i => i !== interest));
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !profileData.interests?.includes(customInterest.trim())) {
      addInterest(customInterest.trim());
      setCustomInterest('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-twilight">Informations personnelles</h2>
        </div>
        <p className="text-twilight/60">Vérifiez et modifiez vos informations de base et de profil.</p>
      </div>

      <div className="space-y-6">
        {allErrors.general && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <p className="text-red-800">{allErrors.general}</p>
          </motion.div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            label="Prénom"
            name="first_name"
            value={profileData.first_name || ''}
            onChange={(value) => handleChange('first_name', value)}
            error={allErrors.first_name}
          />

          <FormField
            label="Nom"
            name="last_name"
            value={profileData.last_name || ''}
            onChange={(value) => handleChange('last_name', value)}
            error={allErrors.last_name}
          />
        </div>

        <FormField
          label="Email"
          name="email"
          type="email"
          value={profileData.email || ''}
          onChange={(value) => handleChange('email', value)}
          error={allErrors.email}
        />
        
        <hr className="border-gray-200"/>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-twilight">Âge <span className="text-red-500">*</span></label>
            <Input
              type="number"
              value={profileData.age || ''}
              onChange={(e) => handleChange('age', parseInt(e.target.value) || undefined)}
              placeholder="25"
              min="18"
              max="100"
              className={allErrors.age ? 'border-red-400' : ''}
            />
            {allErrors.age && <p className="text-red-500 text-sm mt-1">{allErrors.age}</p>}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-twilight">Genre <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {[{value: 'homme', label: 'Homme', emoji: '👨'}, {value: 'femme', label: 'Femme', emoji: '👩'}].map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => handleChange('gender', g.value as 'homme' | 'femme')}
                  className={`p-3 border-2 rounded-xl transition-all duration-200 ${
                    profileData.gender === g.value ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <span className="text-lg mr-2">{g.emoji}</span> {g.label}
                </button>
              ))}
            </div>
            {allErrors.gender && <p className="text-red-500 text-sm mt-1">{allErrors.gender}</p>}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-twilight">Orientation sexuelle <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { value: 'hetero', label: 'Hétérosexuel(le)', emoji: '👫' },
              { value: 'homo', label: 'Homosexuel(le)', emoji: '👬' },
              { value: 'bi', label: 'Bisexuel(le)', emoji: '💖' }
            ].map((orientation) => (
              <button
                key={orientation.value}
                type="button"
                onClick={() => handleChange('sexual_orientation', orientation.value as 'hetero' | 'homo' | 'bi')}
                className={`p-2 text-xs border-2 rounded-xl transition-all duration-200 flex flex-col sm:flex-row items-center justify-center text-center sm:p-3 sm:text-sm ${
                  profileData.sexual_orientation === orientation.value ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                <span className="text-lg mb-1 sm:mb-0 sm:mr-2">{orientation.emoji}</span>
                <span>{orientation.label}</span>
              </button>
            ))}
          </div>
          {allErrors.sexual_orientation && <p className="text-red-500 text-sm mt-1">{allErrors.sexual_orientation}</p>}
        </div>
        
        <hr className="border-gray-200"/>

        <div className="space-y-2">
          <label htmlFor="biography" className="text-sm font-medium text-twilight">Biographie <span className="text-red-500">*</span></label>
          <Textarea
            id="biography"
            value={profileData.biography || ''}
            onChange={(e) => handleChange('biography', e.target.value)}
            placeholder="Parlez un peu de vous..."
            rows={4}
            maxLength={500}
            className={`resize-none ${allErrors.biography ? 'border-red-400' : ''}`}
          />
          <p className="text-xs text-gray-500 text-right">{profileData.biography?.length || 0}/500</p>
          {allErrors.biography && <p className="text-red-500 text-sm mt-1">{allErrors.biography}</p>}
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium text-twilight">Centres d'intérêt <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {profileData.interests?.map(interest => (
              <motion.div key={interest} layout>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                  onClick={() => removeInterest(interest)}
                >
                  {interest}
                  <X className="w-3 h-3 ml-2" />
                </Button>
              </motion.div>
            ))}
          </div>
          
          <p className="text-xs text-gray-500">Sélectionnez jusqu'à 10 centres d'intérêt.</p>
          {allErrors.interests && <p className="text-red-500 text-sm mt-1">{allErrors.interests}</p>}

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-twilight/80">Suggestions</h4>
            <div className="flex flex-wrap gap-2">
              {POPULAR_INTERESTS.filter(i => !profileData.interests?.includes(i)).map(interest => (
                <Button
                  key={interest}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addInterest(interest)}
                  disabled={(profileData.interests?.length || 0) >= 10}
                >
                  {interest}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              placeholder="Ajouter un autre intérêt"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomInterest(); } }}
              disabled={(profileData.interests?.length || 0) >= 10}
            />
            <Button
              type="button"
              onClick={addCustomInterest}
              disabled={(profileData.interests?.length || 0) >= 10 || !customInterest.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 
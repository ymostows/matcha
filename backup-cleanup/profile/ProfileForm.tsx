import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Save, Plus, X, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ProfileData, CompleteProfile } from '../../services/profileApi';

interface ProfileFormProps {
  initialData?: CompleteProfile;
  onSave: (data: ProfileData) => Promise<void>;
  isLoading?: boolean;
}

const POPULAR_INTERESTS = [
  '🎵 Musique', '🎬 Cinéma', '📚 Lecture', '🏃‍♂️ Sport', '🎯 Gaming',
  '🍳 Cuisine', '✈️ Voyage', '🎨 Art', '📸 Photo', '🌿 Nature',
  '💃 Danse', '🎭 Théâtre', '🏔️ Randonnée', '🏊‍♀️ Natation', '🧘‍♀️ Yoga',
  '🎸 Musique live', '🍷 Œnologie', '📱 Tech', '🐕 Animaux', '🌱 Jardinage'
];

export const ProfileForm: React.FC<ProfileFormProps> = ({ 
  initialData, 
  onSave, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState<ProfileData>({
    biography: '',
    age: undefined,
    gender: undefined,
    sexual_orientation: undefined,
    interests: [],
    city: '',
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customInterest, setCustomInterest] = useState('');

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.age || formData.age < 18 || formData.age > 100) {
      newErrors.age = 'L\'âge doit être entre 18 et 100 ans';
    }

    if (!formData.gender) {
      newErrors.gender = 'Le genre est requis';
    }

    if (!formData.sexual_orientation) {
      newErrors.sexual_orientation = 'L\'orientation sexuelle est requise';
    }

    if (formData.biography && formData.biography.length > 500) {
      newErrors.biography = 'La biographie ne peut pas dépasser 500 caractères';
    }

    if (!formData.interests || formData.interests.length === 0) {
      newErrors.interests = 'Au moins un centre d\'intérêt est requis';
    }

    if (formData.interests && formData.interests.length > 10) {
      newErrors.interests = 'Maximum 10 centres d\'intérêt autorisés';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto glow-gentle">
      <CardHeader className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="mx-auto mb-4 w-16 h-16 bg-peach-gradient rounded-full flex items-center justify-center"
        >
          <User className="w-8 h-8 text-white" />
        </motion.div>
        <CardTitle className="text-3xl font-display text-twilight">
          Complétez votre <span className="font-romantic text-sunset-glow">Profil</span>
        </CardTitle>
        <CardDescription className="text-twilight/70 mt-2">
          Créez un profil attractif pour trouver votre âme sœur
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informations de base */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-display font-semibold text-twilight border-b border-border pb-2">
              Informations de base
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Âge */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-twilight">
                  Âge <span className="text-primary">*</span>
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

              {/* Ville */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-twilight">
                  Ville
                </label>
                <div className="flex gap-2">
                  <Input
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Paris, France"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="px-3"
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Genre */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-twilight">
                  Genre <span className="text-primary">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'homme', label: '👨 Homme' },
                    { value: 'femme', label: '👩 Femme' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('gender', option.value as any)}
                      className={`w-full p-3 rounded-xl border transition-all duration-200 text-left ${
                        formData.gender === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
              </div>

              {/* Orientation sexuelle */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-twilight">
                  Orientation sexuelle <span className="text-primary">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'hetero', label: '💕 Hétérosexuel(le)' },
                    { value: 'homo', label: '🌈 Homosexuel(le)' },
                    { value: 'bi', label: '💜 Bisexuel(le)' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('sexual_orientation', option.value as any)}
                      className={`w-full p-3 rounded-xl border transition-all duration-200 text-left ${
                        formData.sexual_orientation === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {errors.sexual_orientation && <p className="text-red-500 text-sm">{errors.sexual_orientation}</p>}
              </div>
            </div>
          </motion.div>

          {/* Biographie */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-display font-semibold text-twilight border-b border-border pb-2">
              À propos de moi
            </h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-twilight">
                Biographie
              </label>
              <textarea
                value={formData.biography || ''}
                onChange={(e) => handleChange('biography', e.target.value)}
                placeholder="Parlez-nous de vous, de vos passions, de ce que vous recherchez..."
                className={`w-full px-4 py-3 border rounded-2xl shadow-sm placeholder-twilight/50 
                          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary 
                          transition-all duration-300 bg-muted/80 backdrop-blur-sm text-twilight 
                          min-h-[120px] ${errors.biography ? 'border-red-400' : 'border-border'}`}
                maxLength={500}
              />
              <div className="flex justify-between text-sm text-twilight/60">
                <span>{formData.biography?.length || 0}/500 caractères</span>
                {errors.biography && <span className="text-red-500">{errors.biography}</span>}
              </div>
            </div>
          </motion.div>

          {/* Centres d'intérêt */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-display font-semibold text-twilight border-b border-border pb-2">
              Centres d'intérêt <span className="text-primary">*</span>
            </h3>
            
            {/* Centres d'intérêt sélectionnés */}
            {(formData.interests?.length || 0) > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-twilight">Vos centres d'intérêt :</p>
                <div className="flex flex-wrap gap-2">
                  {formData.interests?.map((interest) => (
                    <motion.span
                      key={interest}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary 
                               rounded-full text-sm font-medium border border-primary/30 hover:bg-primary/30 
                               transition-all duration-200"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {/* Centres d'intérêt populaires */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-twilight">Centres d'intérêt populaires :</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {POPULAR_INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => addInterest(interest)}
                    disabled={formData.interests?.includes(interest) || (formData.interests?.length || 0) >= 10}
                    className={`p-2 rounded-xl border text-sm transition-all duration-200 ${
                      formData.interests?.includes(interest)
                        ? 'border-primary bg-primary/20 text-primary cursor-not-allowed'
                        : (formData.interests?.length || 0) >= 10
                        ? 'border-border/50 text-twilight/50 cursor-not-allowed'
                        : 'border-border hover:border-primary/50 hover:bg-primary/5 text-twilight'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Ajouter un centre d'intérêt personnalisé */}
            {(formData.interests?.length || 0) < 10 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-twilight">Ajouter un centre d'intérêt personnalisé :</p>
                <div className="flex gap-2">
                  <Input
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    placeholder="Ex: Escalade, Cuisine japonaise..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addCustomInterest}
                    disabled={!customInterest.trim()}
                    className="px-4"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {errors.interests && <p className="text-red-500 text-sm">{errors.interests}</p>}
          </motion.div>

          {/* Section Photos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-display font-semibold text-twilight border-b border-border pb-2">
              Photos de profil
            </h3>
            
            {/* Placeholder pour PhotoUpload - sera intégré dans ProfilePage */}
            <div className="p-6 border-2 border-dashed border-primary/30 rounded-xl text-center bg-primary/5">
              <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-semibold text-twilight mb-2">Photos de profil</h4>
              <p className="text-sm text-twilight/60 mb-4">
                Ajoutez jusqu'à 5 photos pour montrer votre personnalité
              </p>
              <div className="text-xs text-twilight/50 space-y-1">
                <p>• Maximum 5 photos (JPEG, PNG, GIF)</p>
                <p>• Taille maximum : 5MB par photo</p>
                <p>• La première photo devient votre photo de profil</p>
              </div>
            </div>
          </motion.div>

          {/* Section Géolocalisation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-display font-semibold text-twilight border-b border-border pb-2">
              Localisation
            </h3>
            
            {/* Placeholder pour LocationPicker - sera intégré dans ProfilePage */}
            <div className="p-6 border-2 border-dashed border-accent/30 rounded-xl text-center bg-accent/5">
              <div className="w-16 h-16 bg-accent/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-accent" />
              </div>
              <h4 className="font-semibold text-twilight mb-2">Géolocalisation</h4>
              <p className="text-sm text-twilight/60 mb-4">
                Permettez aux autres de vous trouver selon votre proximité
              </p>
              <div className="text-xs text-twilight/50 space-y-1">
                <p>🔒 Votre position exacte n'est jamais partagée</p>
                <p>👥 Seule votre ville est visible par les autres</p>
                <p>📍 Utilisée pour les suggestions de proximité</p>
              </div>
            </div>
          </motion.div>

          {/* Bouton de sauvegarde */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-6"
          >
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-medium bg-primary hover:bg-accent"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sauvegarde...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  Sauvegarder mon profil
                </div>
              )}
            </Button>
          </motion.div>
        </form>
      </CardContent>
    </Card>
  );
}; 
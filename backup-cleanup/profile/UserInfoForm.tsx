import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Save, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { profileApi, UserUpdateData } from '../../services/profileApi';

interface UserInfoFormProps {
  initialData: {
    first_name: string;
    last_name: string;
    email: string;
  };
  onSave?: (userData: UserUpdateData) => void;
}

export const UserInfoForm: React.FC<UserInfoFormProps> = ({ 
  initialData, 
  onSave 
}) => {
  const [formData, setFormData] = useState<UserUpdateData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Le prénom est requis';
    } else if (formData.first_name.trim().length < 2) {
      newErrors.first_name = 'Le prénom doit contenir au moins 2 caractères';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Le nom est requis';
    } else if (formData.last_name.trim().length < 2) {
      newErrors.last_name = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fonction de sauvegarde exposée globalement
  useEffect(() => {
    (window as any).saveUserInfo = async () => {
      if (!validateForm()) return false;

      setIsLoading(true);
      setSuccessMessage(null);

      try {
        const response = await profileApi.updateUserInfo(formData);
        
        if (response.success) {
          setSuccessMessage('Informations mises à jour avec succès !');
          onSave?.(formData);
          return true;
        } else {
          setErrors({ general: response.message || 'Erreur lors de la mise à jour' });
          return false;
        }
      } catch (error: any) {
        console.error('Erreur lors de la mise à jour:', error);
        
        if (error.response?.data?.message) {
          setErrors({ general: error.response.data.message });
        } else {
          setErrors({ general: 'Erreur réseau. Veuillez réessayer.' });
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    };

    return () => {
      delete (window as any).saveUserInfo;
    };
  }, [formData, onSave]);

  // Gestion de la soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Utiliser la fonction de sauvegarde globale
    await (window as any).saveUserInfo?.();
  };

  // Gestion des changements de valeur
  const handleChange = (field: keyof UserUpdateData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec titre */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-twilight">Informations personnelles</h2>
        </div>
        <p className="text-twilight/60">Vérifiez et modifiez vos informations de base</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Message de succès */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-green-50 border border-green-200 rounded-xl"
          >
            <p className="text-green-800 font-medium">{successMessage}</p>
          </motion.div>
        )}

        {/* Erreur générale */}
        {errors.general && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <p className="text-red-800">{errors.general}</p>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Prénom */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-twilight">
              Prénom <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              placeholder="Votre prénom"
              className={errors.first_name ? 'border-red-300 focus:border-red-500' : ''}
            />
            {errors.first_name && (
              <p className="text-sm text-red-600">{errors.first_name}</p>
            )}
          </div>

          {/* Nom */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-twilight">
              Nom <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              placeholder="Votre nom"
              className={errors.last_name ? 'border-red-300 focus:border-red-500' : ''}
            />
            {errors.last_name && (
              <p className="text-sm text-red-600">{errors.last_name}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-twilight">
            Adresse email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-twilight/50" />
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="votre@email.com"
              className={`pl-10 ${errors.email ? 'border-red-300 focus:border-red-500' : ''}`}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Bouton de sauvegarde supprimé - géré par la page parent */}
      </form>
    </div>
  );
}; 
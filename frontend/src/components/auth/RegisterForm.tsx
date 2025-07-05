import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, User, Users, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Gestion des changements dans les inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Effacer les erreurs quand l'utilisateur tape
    if (localError) setLocalError(null);
    if (success) setSuccess(null);
  };

  // Validation côté client
  const validateForm = (): boolean => {
    // Email
    if (!formData.email.trim()) {
      setLocalError('L\'email est requis');
      return false;
    }
    
    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      setLocalError('Veuillez entrer un email valide');
      return false;
    }

    // Username
    if (!formData.username.trim()) {
      setLocalError('Le nom d\'utilisateur est requis');
      return false;
    }
    
    if (formData.username.length < 3) {
      setLocalError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      return false;
    }

    // Prénom
    if (!formData.first_name.trim()) {
      setLocalError('Le prénom est requis');
      return false;
    }

    // Nom
    if (!formData.last_name.trim()) {
      setLocalError('Le nom est requis');
      return false;
    }

    // Mot de passe
    if (!formData.password.trim()) {
      setLocalError('Le mot de passe est requis');
      return false;
    }
    
    if (formData.password.length < 8) {
      setLocalError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setLocalError('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre');
      return false;
    }

    // Confirmation du mot de passe
    if (formData.password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas');
      return false;
    }
    
    return true;
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLocalError(null);
      await register(formData);
      setSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
      
      // Rediriger vers la connexion après 2 secondes
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
      
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
    }
  };

  const displayedError = localError || error;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-lg"
    >
      <Card className="bg-white/90 backdrop-blur-md border-0 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-slate-100/50"></div>
        
        <CardHeader className="relative text-center pb-6 pt-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
            className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-lg relative"
          >
            <Users className="w-10 h-10 text-white" />
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <CardTitle className="text-4xl font-display text-twilight mb-2">
              Rejoignez{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Matcha
              </span>
            </CardTitle>
            <CardDescription className="text-twilight/70 text-lg">
              Créez votre profil et trouvez votre âme sœur 💕
            </CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent className="relative p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Prénom et Nom */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <label htmlFor="first_name" className="text-sm font-semibold text-twilight block">
                  Prénom
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-twilight/50 w-4 h-4 group-focus-within:text-sunset transition-colors" />
                  <Input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="pl-10 h-11 border-sunset/20 focus:border-sunset/50 bg-white/70 backdrop-blur-sm"
                    placeholder="Jean"
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <label htmlFor="last_name" className="text-sm font-semibold text-twilight block">
                  Nom
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-twilight/50 w-4 h-4 group-focus-within:text-sunset transition-colors" />
                  <Input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="pl-10 h-11 border-sunset/20 focus:border-sunset/50 bg-white/70 backdrop-blur-sm"
                    placeholder="Dupont"
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
            </div>

            {/* Email */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-2"
            >
              <label htmlFor="email" className="text-sm font-semibold text-twilight block">
                Adresse email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-twilight/50 w-5 h-5 group-focus-within:text-sunset transition-colors" />
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-12 h-12 border-sunset/20 focus:border-sunset/50 bg-white/70 backdrop-blur-sm"
                  placeholder="votre@email.com"
                  disabled={isLoading}
                />
              </div>
            </motion.div>

            {/* Username */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-2"
            >
              <label htmlFor="username" className="text-sm font-semibold text-twilight block">
                Nom d'utilisateur
              </label>
              <div className="relative group">
                <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-twilight/50 w-5 h-5 group-focus-within:text-sunset transition-colors" />
                <Input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-12 h-12 border-sunset/20 focus:border-sunset/50 bg-white/70 backdrop-blur-sm"
                  placeholder="jeandupont"
                  disabled={isLoading}
                />
              </div>
            </motion.div>

            {/* Mot de passe */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="space-y-2"
            >
              <label htmlFor="password" className="text-sm font-semibold text-twilight block">
                Mot de passe
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-twilight/50 w-5 h-5 group-focus-within:text-sunset transition-colors" />
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-12 pr-12 h-12 border-sunset/20 focus:border-sunset/50 bg-white/70 backdrop-blur-sm"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-twilight/50 hover:text-sunset transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {/* Confirmation mot de passe */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
              className="space-y-2"
            >
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-twilight block">
                Confirmer le mot de passe
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-twilight/50 w-5 h-5 group-focus-within:text-sunset transition-colors" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={handleChange}
                  className="pl-12 pr-12 h-12 border-sunset/20 focus:border-sunset/50 bg-white/70 backdrop-blur-sm"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-twilight/50 hover:text-sunset transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {/* Messages d'erreur/succès */}
            {displayedError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {displayedError}
              </motion.div>
            )}
            
            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {success}
                </div>
                <p className="text-xs text-green-700 pl-7">
                  📧 Un email de vérification vous a été envoyé. Cliquez sur le lien pour activer votre compte.
                </p>
              </motion.div>
            )}

            {/* Bouton de soumission */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-lg font-semibold bg-primary hover:bg-accent hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none"
              >
                {isLoading ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-3"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Création du compte...
                  </motion.div>
                ) : (
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center justify-center gap-3"
                  >
                    <Heart className="w-5 h-5" fill="currentColor" />
                    Créer mon compte
                  </motion.div>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Lien vers la connexion */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center pt-6 border-t border-sunset/10"
          >
            <p className="text-twilight/70 mb-4 text-base">
              Déjà membre ?
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={onSwitchToLogin}
              className="text-sunset hover:text-sunset/80 font-semibold text-base h-12 px-8 hover:bg-sunset/5 rounded-xl transition-all duration-200"
            >
              Se connecter 🔑
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RegisterForm; 
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { notify } from '../../services/notificationService';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gestion des changements dans les inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  // Validation côté client
  const validateForm = (): boolean => {
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Veuillez entrer un email valide');
      return false;
    }
    if (!formData.password.trim()) {
      setError('Le mot de passe est requis');
      return false;
    }
    return true;
  };

  // Soumission du formulaire
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      await login(formData.email, formData.password);
      notify.success('Connexion réussie ! Vous allez être redirigé.');
      navigate('/browsing');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Une erreur est survenue lors de la connexion.';
      notify.error(errorMessage);
      setError(errorMessage); // Met aussi à jour l'erreur locale si besoin
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md"
    >
      <Card className="bg-white/95 backdrop-blur-md border border-primary/20 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10"></div>
        
        <CardHeader className="relative text-center pb-6 pt-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
            className="mx-auto mb-6 w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg relative"
          >
            <Heart className="w-10 h-10 text-white" fill="currentColor" />
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <CardTitle className="text-4xl font-display text-charcoal mb-2">
              Bienvenue sur{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Matcha
              </span>
            </CardTitle>
            <CardDescription className="text-charcoal/70 text-lg">
              Connectez-vous pour découvrir l'amour ✨
            </CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent className="relative p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <label htmlFor="email" className="text-sm font-semibold text-charcoal block">
                Adresse email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-charcoal/50 w-5 h-5 group-focus-within:text-primary transition-colors" />
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-12 h-12 text-base border-primary/20 focus:border-primary/50 bg-white/70 backdrop-blur-sm"
                  placeholder="votre@email.com"
                  disabled={isLoading}
                />
              </div>
            </motion.div>

            {/* Mot de passe */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
            >
              <label htmlFor="password" className="text-sm font-semibold text-charcoal block">
                Mot de passe
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-charcoal/50 w-5 h-5 group-focus-within:text-primary transition-colors" />
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-12 pr-12 h-12 text-base border-primary/20 focus:border-primary/50 bg-white/70 backdrop-blur-sm"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-charcoal/50 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {/* Messages d'erreur */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {error}
              </motion.div>
            )}

            {/* Lien mot de passe oublié */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="text-center"
            >
              <a 
                href="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Mot de passe oublié ?
              </a>
            </motion.div>

            {/* Bouton de soumission */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
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
                    Connexion en cours...
                  </motion.div>
                ) : (
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center justify-center gap-3"
                  >
                    <Heart className="w-5 h-5" fill="currentColor" />
                    Se connecter
                  </motion.div>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Lien vers l'inscription */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center pt-6 border-t border-primary/10"
          >
            <p className="text-charcoal/70 mb-4 text-base">
              Nouveau sur Matcha ?
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={onSwitchToRegister}
              className="text-primary hover:text-primary/80 font-semibold text-base h-12 px-8 hover:bg-primary/5 rounded-xl transition-all duration-200"
            >
              Créer un compte gratuitement ✨
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LoginForm; 
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { apiService } from '../../services/api';

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const data = await apiService.resetPassword(token!, password);

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: data.message || 'Mot de passe réinitialisé avec succès ! Redirection...' 
        });
        // Rediriger vers la page de connexion après 3 secondes
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de la réinitialisation. Veuillez réessayer.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Vérification client-side du mot de passe en temps réel
  const getPasswordStrength = () => {
    if (!password) return null;
    
    let score = 0;
    const issues = [];

    if (password.length >= 8) score++;
    else issues.push('au moins 8 caractères');

    if (/[a-z]/.test(password)) score++;
    else issues.push('une lettre minuscule');

    if (/[A-Z]/.test(password)) score++;
    else issues.push('une lettre majuscule');

    if (/\d/.test(password)) score++;
    else issues.push('un chiffre');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    else issues.push('un caractère spécial');

    const strength = score <= 2 ? 'Très faible' : 
                    score <= 3 ? 'Faible' : 
                    score <= 4 ? 'Moyen' : 'Fort';

    const color = score <= 2 ? 'text-red-600' : 
                  score <= 3 ? 'text-orange-600' : 
                  score <= 4 ? 'text-yellow-600' : 'text-green-600';

    return { strength, color, issues };
  };

  const passwordStrength = getPasswordStrength();

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Lien invalide</h1>
          <p className="text-slate-600 mb-6">
            Ce lien de réinitialisation est invalide ou a expiré.
          </p>
          <Button onClick={() => navigate('/forgot-password')} className="w-full">
            Demander un nouveau lien
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-primary text-5xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Nouveau mot de passe
          </h1>
          <p className="text-slate-600">
            Choisissez un mot de passe sécurisé pour votre compte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Nouveau mot de passe
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              required
              disabled={isLoading}
            />
            {passwordStrength && (
              <div className="mt-2">
                <p className={`text-sm font-medium ${passwordStrength.color}`}>
                  Force : {passwordStrength.strength}
                </p>
                {passwordStrength.issues.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Manque : {passwordStrength.issues.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
              Confirmer le mot de passe
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmer le mot de passe"
              required
              disabled={isLoading}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-600 mt-1">
                Les mots de passe ne correspondent pas
              </p>
            )}
          </div>

          {message && (
            <div className={`rounded-lg p-4 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || password !== confirmPassword}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Réinitialisation...
              </div>
            ) : (
              'Réinitialiser le mot de passe'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/login')}
            className="w-full"
          >
            Retour à la connexion
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ResetPasswordPage; 
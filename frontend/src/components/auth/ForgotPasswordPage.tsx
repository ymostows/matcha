import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { apiService } from '../../services/api';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ type: 'error', text: 'Veuillez entrer votre adresse email' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const data = await apiService.forgotPassword(email);

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: data.message || 'Si cet email existe, vous recevrez un lien de réinitialisation sous peu.' 
        });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-primary text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Mot de passe oublié ?
          </h1>
          <p className="text-slate-600">
            Pas de problème ! Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Adresse email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              disabled={isLoading}
            />
          </div>

          {message && (
            <div className={`rounded-lg p-4 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm">{message.text}</p>
              {message.type === 'success' && (
                <p className="text-xs mt-2 text-green-700">
                  N'oubliez pas de vérifier vos spams si vous ne recevez rien.
                </p>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Envoi en cours...
              </div>
            ) : (
              'Envoyer le lien de réinitialisation'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-600 mb-3">
            Vous vous souvenez de votre mot de passe ?
          </p>
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

export default ForgotPasswordPage; 
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import apiService from '../../services/api';

const ResendVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setStatus('idle');

    try {
      const response = await apiService.post('/auth/resend-verification', { email }) as any;
      if (response.success) {
        setStatus('success');
        setMessage(response.message || 'Email de vérification renvoyé avec succès !');
      } else {
        setStatus('error');
        setMessage(response.message || 'Erreur lors du renvoi');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Erreur lors du renvoi de l\'email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 via-white to-rose-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Renvoyer l'email de vérification
          </h1>
          <p className="text-gray-600">
            Entrez votre adresse email pour recevoir un nouveau lien de vérification.
          </p>
        </div>

        {status === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{message}</p>
          </div>
        )}

        {status !== 'success' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-gradient-to-r from-red-600 to-pink-500 hover:from-red-700 hover:to-pink-600 disabled:opacity-50"
            >
              {isLoading ? 'Envoi en cours...' : 'Renvoyer l\'email'}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
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

export default ResendVerificationPage; 
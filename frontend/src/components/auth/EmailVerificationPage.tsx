import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import apiService from '../../services/api';

const EmailVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Token de vérification manquant');
        return;
      }

      // Empêcher les appels multiples
      if (hasVerified.current) {
        return;
      }
      hasVerified.current = true;

      try {
        const response = await apiService.verifyEmail(token);
        
        if (response.success === true) {
          setStatus('success');
          setMessage(response.message || 'Email vérifié avec succès !');
        } else {
          const message = response.message || '';
          
          if (response.expired || message.includes('expiré')) {
            setStatus('expired');
            setMessage(message || 'Token de vérification expiré');
          } else if (message.includes('invalide')) {
            setStatus('error');
            setMessage('Token de vérification invalide. Veuillez demander un nouveau lien.');
          } else {
            setStatus('error');
            setMessage(message || 'Erreur lors de la vérification');
          }
        }
      } catch {
        setStatus('error');
        setMessage('Erreur de connexion au serveur. Veuillez réessayer.');
      }
    };

    verifyEmail();
  }, [token]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = async () => {
    navigate('/resend-verification');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 via-white to-rose-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          )}
          
          {status === 'success' && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {(status === 'error' || status === 'expired') && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {status === 'loading' && 'Vérification en cours...'}
          {status === 'success' && 'Email vérifié !'}
          {status === 'error' && 'Erreur de vérification'}
          {status === 'expired' && 'Token expiré'}
        </h1>

        <p className="text-gray-600 mb-6">
          {status === 'loading' && 'Nous vérifions votre email, veuillez patienter...'}
          {status === 'success' && message}
          {status === 'error' && message}
          {status === 'expired' && message}
        </p>





        <div className="space-y-3">
          {status === 'success' && (
            <Button 
              onClick={handleGoToLogin}
              className="w-full bg-gradient-to-r from-red-600 to-pink-500 hover:from-red-700 hover:to-pink-600"
            >
              Se connecter
            </Button>
          )}
          
          {(status === 'error' || status === 'expired') && (
            <>
              <Button 
                onClick={handleResendEmail}
                className="w-full bg-gradient-to-r from-red-600 to-pink-500 hover:from-red-700 hover:to-pink-600"
              >
                Renvoyer l'email de vérification
              </Button>
              <Button 
                onClick={handleGoToLogin}
                variant="outline"
                className="w-full"
              >
                Retour à la connexion
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EmailVerificationPage; 
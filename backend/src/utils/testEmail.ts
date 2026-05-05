import { sendPasswordResetEmail, sendVerificationEmail } from '../config/email';

// Utilitaire pour tester l'envoi d'emails en développement
export const testEmailService = async () => {
  
  try {
    const testEmail = 'test@example.com';
    const testToken = 'test-token-123';
    
    await sendVerificationEmail(testEmail, testToken);
    
    await sendPasswordResetEmail(testEmail, testToken);
    
    
  } catch (error) {
  }
};

// Fonction pour valider qu'un token est bien formé
export const validateToken = (token: string): boolean => {
  return !!(token && token.length === 64 && /^[a-f0-9]{64}$/.test(token));
};

// Fonction pour afficher les URLs de test en développement
export const logTestUrls = (email: string, verificationToken?: string, resetToken?: string) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  
  if (verificationToken) {
  }
  
  if (resetToken) {
  }
  
}; 
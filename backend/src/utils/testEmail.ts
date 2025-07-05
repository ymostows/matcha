import { sendPasswordResetEmail, sendVerificationEmail } from '../config/email';

// Utilitaire pour tester l'envoi d'emails en développement
export const testEmailService = async () => {
  console.log('📧 === TEST SERVICE EMAIL ===');
  
  try {
    const testEmail = 'test@example.com';
    const testToken = 'test-token-123';
    
    console.log('📬 Test envoi email de vérification...');
    await sendVerificationEmail(testEmail, testToken);
    console.log('✅ Email de vérification envoyé avec succès');
    
    console.log('📬 Test envoi email de reset...');
    await sendPasswordResetEmail(testEmail, testToken);
    console.log('✅ Email de reset envoyé avec succès');
    
    console.log('📧 === TEST EMAIL RÉUSSI ===');
    
  } catch (error) {
    console.error('❌ === ERREUR TEST EMAIL ===');
    console.error(error);
    console.error('📧 Vérifiez la configuration email dans config/email.ts');
  }
};

// Fonction pour valider qu'un token est bien formé
export const validateToken = (token: string): boolean => {
  return !!(token && token.length === 64 && /^[a-f0-9]{64}$/.test(token));
};

// Fonction pour afficher les URLs de test en développement
export const logTestUrls = (email: string, verificationToken?: string, resetToken?: string) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  console.log('\n📧 === URLS DE TEST ===');
  console.log(`👤 Email: ${email}`);
  
  if (verificationToken) {
    console.log(`✨ Vérification: ${baseUrl}/verify-email/${verificationToken}`);
  }
  
  if (resetToken) {
    console.log(`🔑 Reset password: ${baseUrl}/reset-password/${resetToken}`);
  }
  
  console.log('📧 === FIN URLS ===\n');
}; 
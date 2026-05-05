import dotenv from 'dotenv';
dotenv.config();

import { UserModel } from '../models/User';
import { testEmailService, logTestUrls } from '../utils/testEmail';
import { initializeEmailTransporter, sendPasswordResetEmail } from '../config/email';
import crypto from 'crypto';

// Script de test pour le système de réinitialisation de mot de passe
const testPasswordResetSystem = async () => {

  try {
    // 1. Initialiser le service email
    await initializeEmailTransporter();

    // 2. Tester l'envoi d'email
    await testEmailService();

    // 3. Créer un utilisateur de test s'il n'existe pas
    const testEmail = 'test.reset@example.com';
    
    let testUser = await UserModel.findByEmail(testEmail);
    
    if (!testUser) {
      testUser = await UserModel.create({
        email: testEmail,
        username: 'test_reset_user',
        password: 'TempPassword123!',
        first_name: 'Test',
        last_name: 'Reset'
      });
      
      // Vérifier automatiquement l'utilisateur de test
      await UserModel.verifyAccount(testUser.verification_token!);
    } else {
    }
    

    // 4. Générer un token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    const tokenSet = await UserModel.setPasswordResetToken(testEmail, resetToken);
    if (!tokenSet) {
      throw new Error('Impossible de définir le token de reset');
    }

    // 5. Tester l'envoi de l'email de reset
    try {
      await sendPasswordResetEmail(testEmail, resetToken);
    } catch (emailError) {
    }

    // 6. Afficher les URLs de test
    logTestUrls(testEmail, undefined, resetToken);

    // 7. Vérifier que le token fonctionne
    const userWithToken = await UserModel.findByResetToken(resetToken);
    if (userWithToken) {
    } else {
    }


  } catch (error) {
    
  }

  process.exit(0);
};

// Lancer le test
if (require.main === module) {
  testPasswordResetSystem();
}

export { testPasswordResetSystem }; 
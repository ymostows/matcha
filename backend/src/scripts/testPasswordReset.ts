import dotenv from 'dotenv';
dotenv.config();

import { UserModel } from '../models/User';
import { testEmailService, logTestUrls } from '../utils/testEmail';
import { initializeEmailTransporter, sendPasswordResetEmail } from '../config/email';
import crypto from 'crypto';

// Script de test pour le système de réinitialisation de mot de passe
const testPasswordResetSystem = async () => {
  console.log('🔧 === TEST SYSTÈME RESET PASSWORD ===\n');

  try {
    // 1. Initialiser le service email
    console.log('📧 1. Initialisation du service email...');
    await initializeEmailTransporter();
    console.log('✅ Service email initialisé\n');

    // 2. Tester l'envoi d'email
    console.log('📬 2. Test d\'envoi d\'email...');
    await testEmailService();
    console.log('✅ Test d\'envoi réussi\n');

    // 3. Créer un utilisateur de test s'il n'existe pas
    console.log('👤 3. Création/vérification utilisateur de test...');
    const testEmail = 'test.reset@example.com';
    
    let testUser = await UserModel.findByEmail(testEmail);
    
    if (!testUser) {
      console.log('👤 Création d\'un nouvel utilisateur de test...');
      testUser = await UserModel.create({
        email: testEmail,
        username: 'test_reset_user',
        password: 'TempPassword123!',
        first_name: 'Test',
        last_name: 'Reset'
      });
      
      // Vérifier automatiquement l'utilisateur de test
      await UserModel.verifyAccount(testUser.verification_token!);
      console.log('✅ Utilisateur de test créé et vérifié');
    } else {
      console.log('✅ Utilisateur de test existant trouvé');
    }
    
    console.log(`📧 Email test: ${testEmail}\n`);

    // 4. Générer un token de reset
    console.log('🔑 4. Génération du token de reset...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    const tokenSet = await UserModel.setPasswordResetToken(testEmail, resetToken);
    if (!tokenSet) {
      throw new Error('Impossible de définir le token de reset');
    }
    console.log('✅ Token de reset généré et sauvegardé');
    console.log(`🔑 Token: ${resetToken}\n`);

    // 5. Tester l'envoi de l'email de reset
    console.log('📬 5. Test envoi email de reset...');
    try {
      await sendPasswordResetEmail(testEmail, resetToken);
      console.log('✅ Email de reset envoyé avec succès');
    } catch (emailError) {
      console.warn('⚠️ Email non envoyé (normal en développement):', emailError);
    }

    // 6. Afficher les URLs de test
    console.log('\n🔗 6. URLs de test générées:');
    logTestUrls(testEmail, undefined, resetToken);

    // 7. Vérifier que le token fonctionne
    console.log('🔍 7. Vérification du token...');
    const userWithToken = await UserModel.findByResetToken(resetToken);
    if (userWithToken) {
      console.log('✅ Token de reset valide et trouvé en base');
      console.log(`👤 Utilisateur: ${userWithToken.email} (ID: ${userWithToken.id})`);
    } else {
      console.error('❌ Token de reset non trouvé ou expiré');
    }

    console.log('\n🎉 === TEST COMPLET RÉUSSI ===');
    console.log('📝 Instructions pour tester manuellement:');
    console.log('1. Utilisez l\'URL de reset ci-dessus');
    console.log('2. Ou appelez POST /api/auth/forgot-password avec l\'email:', testEmail);
    console.log('3. Puis POST /api/auth/reset-password/{token} avec un nouveau mot de passe');
    console.log('4. Vérifiez avec GET /api/auth/debug/reset-tokens pour voir les tokens actifs\n');

  } catch (error) {
    console.error('❌ === ERREUR DURANT LE TEST ===');
    console.error(error);
    
    console.log('\n🔧 === VÉRIFICATIONS SUGGÉRÉES ===');
    console.log('1. Vérifiez que la base de données est connectée');
    console.log('2. Vérifiez les colonnes reset_password_token et reset_password_expires dans la table users');
    console.log('3. Vérifiez la configuration email dans config/email.ts');
    console.log('4. Consultez les logs du serveur pour plus de détails');
  }

  process.exit(0);
};

// Lancer le test
if (require.main === module) {
  testPasswordResetSystem();
}

export { testPasswordResetSystem }; 
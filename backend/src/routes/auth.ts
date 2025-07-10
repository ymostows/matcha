import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validatePassword } from '../utils/validation';
import pool from '../config/database';
import { 
  sendVerificationEmail,
  sendPasswordResetEmail 
} from '../config/email';
import { logTestUrls } from '../utils/testEmail';
import crypto from 'crypto';

// Fonctions utilitaires pour générer les tokens
const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const router = express.Router();

// Route POST /register - Inscription avec vérification email obligatoire
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, first_name, last_name } = req.body;
    
    // Validation basique
    if (!email || !username || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }
    
    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Format d\'email invalide'
      });
      return;
    }

    // Validation du mot de passe sécurisé
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe ne respecte pas les critères de sécurité.',
        errors: passwordErrors
      });
    }
    
    // Vérifier que l'utilisateur n'existe pas déjà
    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      res.status(409).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
      return;
    }

    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Ce nom d\'utilisateur est déjà pris'
      });
    }
    
    // Créer l'utilisateur avec token de vérification
    const newUser = await UserModel.create({
      email,
      username,
      password,
      first_name,
      last_name
    });

    // Envoyer l'email de vérification
    try {
      await sendVerificationEmail(email, newUser.verification_token!);
      console.log('✅ Email de vérification envoyé avec succès');
    } catch (emailError) {
      console.error('❌ Erreur envoi email:', emailError);
      // Continue même si l'email échoue (pour le développement)
    }
    
    // En mode développement, afficher l'URL de vérification
    if (process.env.NODE_ENV !== 'production') {
      logTestUrls(email, newUser.verification_token!);
    }
    
    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès ! Vérifiez votre email pour activer votre compte.',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        is_verified: newUser.is_verified
      }
    });
    
  } catch (error: any) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
});

// Route GET /verify-email/:token - Vérification de l'email
router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Token de vérification requis'
      });
      return;
    }

    // Trouver l'utilisateur avec ce token (vérifie automatiquement l'expiration)
    const user = await UserModel.findByVerificationToken(token);
    
    if (!user) {
      // Vérifier si c'est parce que le token a expiré ou s'il est invalide
      const expiredTokenQuery = `
        SELECT email, verification_token_expires 
        FROM users 
        WHERE verification_token = $1
      `;
      const client = await pool.connect();
      try {
        const result = await client.query(expiredTokenQuery, [token]);
        if (result.rows.length > 0) {
          const tokenExpires = result.rows[0].verification_token_expires;
          const now = new Date();
          
          // Vérifier si le token est vraiment expiré
          if (tokenExpires && new Date(tokenExpires) <= now) {
            res.status(400).json({
              success: false,
              message: 'Token de vérification expiré. Vous pouvez demander un nouveau lien de vérification.',
              expired: true,
              email: result.rows[0].email
            });
            return;
          }
        }
      } finally {
        client.release();
      }
      
      res.status(400).json({
        success: false,
        message: 'Token de vérification invalide'
      });
      return;
    }

    if (user.is_verified) {
      res.json({
        success: true,
        message: 'Ce compte est déjà vérifié ! Vous pouvez vous connecter.'
      });
      return;
    }

    // Vérifier le compte
    const verified = await UserModel.verifyAccount(token);
    
    if (!verified) {
      res.status(400).json({
        success: false,
        message: 'Échec de la vérification du compte'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.'
    });
    
  } catch (error: any) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification'
    });
  }
});

// Route POST /resend-verification - Renvoyer l'email de vérification
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email requis'
      });
      return;
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Aucun compte trouvé avec cet email'
      });
      return;
    }

    if (user.is_verified) {
      res.status(400).json({
        success: false,
        message: 'Ce compte est déjà vérifié'
      });
      return;
    }

    // Générer un nouveau token et l'envoyer
    const newToken = generateVerificationToken();
    const tokenSet = await UserModel.setVerificationToken(email, newToken);
    
    if (!tokenSet) {
      res.status(400).json({
        success: false,
        message: 'Impossible de générer un nouveau token de vérification'
      });
      return;
    }
    
    try {
      await sendVerificationEmail(email, newToken);
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi de l\'email'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Email de vérification renvoyé avec succès'
    });
    
  } catch (error: any) {
    console.error('Erreur renvoi vérification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route POST /login - Connexion avec vérification email obligatoire
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
      return;
    }
    
    // Trouver l'utilisateur
    const user = await UserModel.findByEmail(email);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
      return;
    }

    // Vérifier que le compte est activé
    if (!user.is_verified) {
      res.status(403).json({
        success: false,
        message: 'Compte non vérifié. Vérifiez votre email ou demandez un nouveau lien de vérification.',
        needs_verification: true
      });
      return;
    }
    
    // Vérifier le mot de passe
    const isValid = await UserModel.verifyPassword(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
      return;
    }
    
    // Créer le token JWT
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      res.status(500).json({
        success: false,
        message: 'Erreur configuration serveur'
      });
      return;
    }
    
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Mettre à jour la dernière connexion
    await UserModel.updateLastSeen(user.id);
    
    res.json({
      success: true,
      message: 'Connexion réussie !',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        is_verified: user.is_verified
      }
    });
    
  } catch (error: any) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
});

// Route POST /forgot-password - Demande de reset de mot de passe
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email requis'
      });
      return;
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      // Ne pas révéler si l'email existe ou non pour la sécurité
      res.json({
        success: true,
        message: 'Si cet email existe, vous recevrez un lien de réinitialisation'
      });
      return;
    }

    if (!user.is_verified) {
      res.status(400).json({
        success: false,
        message: 'Compte non vérifié. Vérifiez d\'abord votre email.'
      });
      return;
    }

    // Générer un token de reset
    const resetToken = generateResetToken();
    const tokenSet = await UserModel.setPasswordResetToken(email, resetToken);
    
    if (!tokenSet) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du token'
      });
      return;
    }

    // Envoyer l'email de reset
    try {
      await sendPasswordResetEmail(email, resetToken);
      console.log('✅ Email de réinitialisation envoyé avec succès');
    } catch (emailError) {
      console.error('❌ Erreur envoi email reset:', emailError);
      // Continue même si l'email échoue (pour le développement)
      console.warn('⚠️ Email de réinitialisation non envoyé, mais token généré et sauvegardé');
    }
    
    // En mode développement, afficher l'URL de reset
    if (process.env.NODE_ENV !== 'production') {
      logTestUrls(email, undefined, resetToken);
    }

    res.json({
      success: true,
      message: 'Si cet email existe, vous recevrez un lien de réinitialisation. Vérifiez également vos spams.'
    });
    
  } catch (error: any) {
    console.error('Erreur forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route POST /reset-password/:token - Réinitialisation du mot de passe
router.post('/reset-password/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!token || !password) {
      res.status(400).json({
        success: false,
        message: 'Token et nouveau mot de passe requis'
      });
      return;
    }

    // Valider le nouveau mot de passe
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe ne respecte pas les critères de sécurité.',
        errors: passwordErrors
      });
    }

    // Vérifier le token
    const user = await UserModel.findByResetToken(token);
    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
      return;
    }

    // Réinitialiser le mot de passe
    const resetSuccess = await UserModel.resetPassword(token, password);
    if (!resetSuccess) {
      res.status(400).json({
        success: false,
        message: 'Échec de la réinitialisation du mot de passe'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.'
    });
    
  } catch (error: any) {
    console.error('Erreur reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la réinitialisation'
    });
  }
});

// Routes /profile déplacées vers routes/profile.ts

// Route de test pour debug du système de reset password (DEVELOPMENT UNIQUEMENT)
router.get('/debug/reset-tokens', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        success: false,
        message: 'Route de debug non disponible en production'
      });
      return;
    }
    
    const client = await pool.connect();
    try {
      const query = `
        SELECT id, email, reset_password_token, reset_password_expires
        FROM users 
        WHERE reset_password_token IS NOT NULL 
        ORDER BY reset_password_expires DESC
        LIMIT 10
      `;
      const result = await client.query(query);
      
      res.json({
        success: true,
        message: 'Tokens de reset actifs (DEBUG)',
        tokens: result.rows.map(row => ({
          user_id: row.id,
          email: row.email,
          token: row.reset_password_token,
          expires: row.reset_password_expires,
          reset_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${row.reset_password_token}`
        }))
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Erreur debug reset tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur debug'
    });
  }
});

export default router; 
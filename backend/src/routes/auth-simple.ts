import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/UserSimple';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Route POST /register - Inscription simplifiée
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, first_name, last_name } = req.body;
    
    // Validation basique
    if (!email || !username || !password || !first_name || !last_name) {
      res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
      return;
    }
    
    // Vérifier que l'utilisateur n'existe pas
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
      return;
    }
    
    // Créer l'utilisateur
    const newUser = await UserModel.create({
      email,
      username,
      password,
      first_name,
      last_name
    });
    
    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès!',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username
      }
    });
    
  } catch (error: any) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route POST /login - Connexion simplifiée
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
      message: 'Connexion réussie!',
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
      message: 'Erreur serveur'
    });
  }
});

// Route /profile déplacée vers routes/profile.ts

export default router; 
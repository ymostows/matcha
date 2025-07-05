import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ProfileModel } from '../models/Profile';
import { UserModel } from '../models/User';
import { CreateProfileData } from '../types/user';

const router = Router();

// GET /api/profile - Obtenir son propre profil
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const profile = await ProfileModel.findCompleteProfile(userId);
    
    if (!profile) {
      res.status(404).json({ 
        success: false, 
        message: 'Profil non trouvé' 
      });
      return;
    }
    
    res.json({ 
      success: true, 
      profile 
    });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/profile - Créer ou mettre à jour son profil
router.put('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const profileData: CreateProfileData = req.body;
    
    // Validation simple
    if (profileData.age !== undefined && (profileData.age < 18 || profileData.age > 100)) {
      res.status(400).json({ 
        success: false, 
        message: 'L\'âge doit être entre 18 et 100 ans' 
      });
      return;
    }
    
    if (profileData.biography && profileData.biography.length > 500) {
      res.status(400).json({ 
        success: false, 
        message: 'La biographie ne peut pas dépasser 500 caractères' 
      });
      return;
    }
    
    if (profileData.interests && profileData.interests.length > 10) {
      res.status(400).json({ 
        success: false, 
        message: 'Maximum 10 centres d\'intérêt' 
      });
      return;
    }
    
    const updatedProfile = await ProfileModel.createOrUpdate(userId, profileData);
    
    res.json({ 
      success: true, 
      message: 'Profil mis à jour avec succès', 
      profile: updatedProfile 
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/profile/user - Mettre à jour les informations utilisateur (nom, prénom, email)
router.put('/user', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { first_name, last_name, email } = req.body;
    
    // Validation simple
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      res.status(400).json({ 
        success: false, 
        message: 'Nom, prénom et email sont requis' 
      });
      return;
    }
    
    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ 
        success: false, 
        message: 'Format d\'email invalide' 
      });
      return;
    }
    
    // Vérifier si l'email n'est pas déjà pris par un autre utilisateur
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      res.status(400).json({ 
        success: false, 
        message: 'Cet email est déjà utilisé' 
      });
      return;
    }
    
    const success = await UserModel.updateUserInfo(userId, { first_name, last_name, email });
    
    if (!success) {
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour' 
      });
      return;
    }
    
    res.json({ 
      success: true, 
      message: 'Informations utilisateur mises à jour avec succès' 
    });
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

export default router; 
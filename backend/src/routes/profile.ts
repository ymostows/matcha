import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ProfileModel } from '../models/Profile';
import { UserModel } from '../models/User';

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
    const profileData = req.body;
    
    // Validation des données
    const validationErrors = validateProfileData(profileData);
    if (validationErrors.length > 0) {
      // --- Log de débogage ---
      console.error('❌ Échec de la validation du profil. Données reçues:', JSON.stringify(profileData, null, 2));
      console.error('Erreurs de validation:', validationErrors);
      // --- Fin du log ---
      res.status(400).json({ 
        success: false, 
        message: validationErrors.join(', ') 
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

// PUT /api/profile/user - Mettre à jour les informations utilisateur
router.put('/user', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { first_name, last_name, email } = req.body;
    
    // Validation des données utilisateur
    const validationErrors = validateUserData({ first_name, last_name, email });
    if (validationErrors.length > 0) {
      res.status(400).json({ 
        success: false, 
        message: validationErrors.join(', ') 
      });
      return;
    }
    
    // Vérifier si l'email n'est pas déjà pris
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

// Fonctions de validation
function validateProfileData(data: any): string[] {
  const errors: string[] = [];
  
  if (data.age !== undefined) {
    if (typeof data.age !== 'number' || data.age < 18 || data.age > 100) {
      errors.push('L\'âge doit être entre 18 et 100 ans');
    }
  }
  
  if (data.gender && !['homme', 'femme'].includes(data.gender)) {
    errors.push('Genre invalide');
  }
  
  if (data.sexual_orientation && !['hetero', 'homo', 'bi'].includes(data.sexual_orientation)) {
    errors.push('Orientation sexuelle invalide');
  }
  
  if (data.biography) {
    if (data.biography.length < 10) {
      errors.push('La biographie doit contenir au moins 10 caractères');
    }
    if (data.biography.length > 500) {
      errors.push('La biographie ne peut pas dépasser 500 caractères');
    }
  }
  
  if (data.interests) {
    if (!Array.isArray(data.interests)) {
      errors.push('Les centres d\'intérêt doivent être un tableau');
    } else if (data.interests.length > 10) {
      errors.push('Maximum 10 centres d\'intérêt');
    }
  }
  
  return errors;
}

function validateUserData(data: any): string[] {
  const errors: string[] = [];
  
  if (!data.first_name?.trim()) {
    errors.push('Le prénom est requis');
  }
  
  if (!data.last_name?.trim()) {
    errors.push('Le nom est requis');
  }
  
  if (!data.email?.trim()) {
    errors.push('L\'email est requis');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Format d\'email invalide');
    }
  }
  
  return errors;
}

export default router; 
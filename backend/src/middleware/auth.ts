import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/user';

// Interface pour étendre Request avec user
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// Middleware pour vérifier le token JWT
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // 1. Récupérer le token depuis l'header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  // 2. Si pas de token, retourner erreur 401
  if (!token) {
    // console.log('Token manquant - authHeader:', authHeader);
    res.status(401).json({ 
      success: false,
      message: 'Token d\'accès requis. Veuillez vous connecter.' 
    });
    return;
  }

  // 3. Vérifier le token avec jwt.verify()
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      console.error('JWT_SECRET non configuré');
      res.status(500).json({ 
        success: false,
        message: 'Erreur de configuration du serveur' 
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Debug temporaire - enlever plus tard
    // console.log('JWT decoded userId:', decoded.userId, typeof decoded.userId);
    
    // 4. Attacher les données user à req.user
    req.user = decoded;
    next();
    
  } catch (error) {
    // 5. Gérer les erreurs de token
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        success: false,
        message: 'Token expiré. Veuillez vous reconnecter.' 
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        success: false,
        message: 'Token invalide.' 
      });
      return;
    }
    
    // Erreur inattendue
    console.error('Erreur lors de la vérification du token:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la vérification du token' 
    });
  }
};
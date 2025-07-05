import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

// Fonction pour échapper le HTML et prévenir XSS
export const sanitizeHtml = (str: string): string => {
  if (!str) return str;
  return validator.escape(str);
};

// Fonction pour nettoyer récursivement un objet
export const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

// Middleware pour sanitiser automatiquement req.body
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Middleware spécifique pour les uploads de fichiers
export const validateFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  const files = req.files as Express.Multer.File[];
  
  if (files && files.length > 0) {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    
    for (const file of files) {
      // Vérifier le type MIME
      if (!allowedMimeTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          message: `Type de fichier non autorisé: ${file.mimetype}. Types autorisés: ${allowedMimeTypes.join(', ')}`
        });
        return;
      }
      
      // Vérifier la taille
      if (file.size > maxFileSize) {
        res.status(400).json({
          success: false,
          message: `Fichier trop volumineux: ${Math.round(file.size / (1024 * 1024))}MB. Taille maximum: 5MB`
        });
        return;
      }
      
      // Vérifier l'extension du fichier
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const fileExtension = file.originalname.toLowerCase().split('.').pop();
      if (!fileExtension || !allowedExtensions.includes(`.${fileExtension}`)) {
        res.status(400).json({
          success: false,
          message: `Extension de fichier non autorisée. Extensions autorisées: ${allowedExtensions.join(', ')}`
        });
        return;
      }
    }
  }
  
  next();
}; 
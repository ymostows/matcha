import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

// Fonction pour échapper le HTML et prévenir XSS
export const sanitizeHtml = (str: string): string => {
  if (!str) return str;
  return validator.escape(str);
};

// Fonction pour nettoyer récursivement un objet
export const sanitizeObject = (obj: any, excludeKeys: string[] = []): any => {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, excludeKeys));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Ne pas sanitizer les clés exclues (comme les mots de passe)
        if (excludeKeys.includes(key)) {
          sanitized[key] = obj[key];
        } else {
          sanitized[key] = sanitizeObject(obj[key], excludeKeys);
        }
      }
    }
    return sanitized;
  }
  
  return obj;
};

// Middleware pour sanitiser automatiquement req.body
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Clés à exclure de la sanitisation (mots de passe, tokens, etc.)
  const excludeKeys = ['password', 'token', 'verification_token', 'reset_token'];
  
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body, excludeKeys);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query, excludeKeys);
  }
  
  next();
};

// Vérifie les magic bytes réels du fichier pour confirmer son type
function checkMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
  // WebP: RIFF????WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  // GIF87a / GIF89a
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';

  return null;
}

// Middleware spécifique pour les uploads de fichiers
export const validateFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  const files = req.files as Express.Multer.File[];

  if (files && files.length > 0) {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      // Vérifier le type MIME déclaré par le client
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

      // Vérifier les magic bytes réels du fichier (le client ne peut pas les falsifier)
      const realType = checkMagicBytes(file.buffer);
      if (!realType) {
        res.status(400).json({
          success: false,
          message: 'Le fichier ne correspond pas à une image valide.'
        });
        return;
      }
    }
  }

  next();
}; 
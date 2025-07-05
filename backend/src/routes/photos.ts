import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { PhotoModel } from '../models/Photo';
import multer from 'multer';

const router = Router();

// Configuration multer simple
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// POST /api/photos - Upload de photos
router.post('/', authenticateToken, upload.array('photos', 5), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Aucune photo fournie' 
      });
      return;
    }
    
    const savedPhotos = [];
    
    // Vérifier si l'utilisateur a déjà des photos
    const existingPhotosCount = await PhotoModel.countByUserId(userId);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      
      try {
        // Convertir en base64
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        
        const photo = await PhotoModel.create({
          user_id: userId,
          filename: `photo-${Date.now()}-${Math.random()}.jpg`,
          image_data: base64,
          mime_type: file.mimetype,
          // Première photo de profil SEULEMENT si l'utilisateur n'a aucune photo
          is_profile_picture: existingPhotosCount === 0 && savedPhotos.length === 0
        });
        
        savedPhotos.push(photo);
        
      } catch (error) {
        console.error('Erreur sauvegarde photo:', error);
      }
    }
    
    res.json({ 
      success: true, 
      message: `${savedPhotos.length} photo(s) uploadée(s)`,
      photos: savedPhotos
    });
  } catch (error) {
    console.error('❌ Erreur upload:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// DELETE /api/photos/:id - Supprimer une photo
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const photoId = parseInt(req.params.id || '0');
    
    if (!photoId) {
      res.status(400).json({ success: false, message: 'ID invalide' });
      return;
    }
    
    const success = await PhotoModel.delete(photoId, userId);
    
    res.json({ 
      success: success, 
      message: success ? 'Photo supprimée' : 'Photo non trouvée' 
    });
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/photos/:id/profile-picture - Définir photo de profil
router.put('/:id/profile-picture', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const photoId = parseInt(req.params.id || '0');
    
    if (!photoId) {
      res.status(400).json({ success: false, message: 'ID invalide' });
      return;
    }
    
    const success = await PhotoModel.setAsProfilePicture(userId, photoId);
    
    res.json({ 
      success: success, 
      message: success ? 'Photo de profil mise à jour' : 'Échec mise à jour' 
    });
  } catch (error) {
    console.error('Erreur photo de profil:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/photos/:id/image - Servir une image
router.get('/:id/image', async (req: Request, res: Response): Promise<void> => {
  try {
    const photoId = parseInt(req.params.id || '0');
    
    if (!photoId) {
      res.status(400).json({ success: false, message: 'ID invalide' });
      return;
    }
    
    const photo = await PhotoModel.findById(photoId);
    
    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo non trouvée' });
      return;
    }
    
    // Décoder base64
    const matches = photo.image_data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      res.status(500).json({ success: false, message: 'Format invalide' });
      return;
    }
    
    const mimeType = matches[1] || 'image/jpeg';
    const base64Data = matches[2];
    
    if (!base64Data) {
      res.status(500).json({ success: false, message: 'Données image manquantes' });
      return;
    }
    
    const buffer = Buffer.from(base64Data, 'base64');
    
    res.setHeader('Content-Type', mimeType);
    res.send(buffer);
  } catch (error) {
    console.error('Erreur service image:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router; 
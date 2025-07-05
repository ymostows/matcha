import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ProfileModel } from '../models/Profile';
import { PhotoModel } from '../models/Photo';
import { CreateProfileData } from '../types/user';
import { GeolocationService } from '../utils/geolocation';
const router = Router();

// Middleware de debug pour les uploads
router.use('/photos', (req, res, next) => {
  console.log(`🚀 ${req.method} /api/profile/photos appelé`);
  console.log('📋 Headers:', Object.keys(req.headers));
  console.log('🔑 Authorization présent:', !!req.headers.authorization);
  console.log('📦 Content-Type:', req.headers['content-type']);
  console.log('📏 Content-Length:', req.headers['content-length']);
  next();
});

// GET /api/profile/search - Recherche de profils (DOIT ÊTRE AVANT /:id)
router.get('/search', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const {
      ageMin,
      ageMax,
      city,
      interests,
      gender,
      sexual_orientation,
      limit = 20,
      offset = 0
    } = req.query;
    
    const filters = {
      ageMin: ageMin ? parseInt(ageMin as string) : undefined,
      ageMax: ageMax ? parseInt(ageMax as string) : undefined,
      city: city as string || undefined,
      interests: interests ? (interests as string).split(',') : undefined,
      gender: gender as string || undefined,
      sexual_orientation: sexual_orientation as string
    };
    
    const profiles = await ProfileModel.searchProfiles(
      userId,
      filters,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json({ 
      success: true, 
      profiles,
      total: profiles.length
    });
  } catch (error) {
    console.error('Erreur lors de la recherche de profils:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile - Obtenir le profil de l'utilisateur connecté
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
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile/:id - Obtenir un profil public par ID
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const viewerId = (req as any).user.userId;
    const profileIdParam = req.params.id;
    
    if (!profileIdParam) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de profil requis' 
      });
      return;
    }
    
    const profileId = parseInt(profileIdParam);
    
    if (isNaN(profileId)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de profil invalide' 
      });
      return;
    }
    
    const profile = await ProfileModel.findCompleteProfile(profileId);
    
    if (!profile) {
      res.status(404).json({ 
        success: false, 
        message: 'Profil non trouvé' 
      });
      return;
    }
    
    // Enregistrer la visite (sauf si c'est son propre profil)
    if (viewerId !== profileId) {
      await ProfileModel.recordVisit(viewerId, profileId);
    }
    
    // Masquer les informations sensibles pour les profils publics
    const publicProfile = {
      ...profile,
      email: undefined // Ne jamais exposer l'email
    };
    
    res.json({ 
      success: true, 
      profile: publicProfile 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil public:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/profile - Créer ou mettre à jour le profil
router.put('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const profileData: CreateProfileData = req.body;
    
    // Validation des données
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
        message: 'Maximum 10 centres d\'intérêt autorisés' 
      });
      return;
    }
    
    const updatedProfile = await ProfileModel.createOrUpdate(userId, profileData);
    
    // Mettre à jour le fame rating
    await ProfileModel.updateFameRating(userId);
    
    res.json({ 
      success: true, 
      message: 'Profil mis à jour avec succès', 
      profile: updatedProfile 
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/profile/location - Mettre à jour la géolocalisation
router.put('/location', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { latitude, longitude, city } = req.body;
    
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ 
        success: false, 
        message: 'Latitude et longitude requises (nombres)' 
      });
      return;
    }
    
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      res.status(400).json({ 
        success: false, 
        message: 'Coordonnées géographiques invalides' 
      });
      return;
    }
    
    const success = await ProfileModel.updateLocation(userId, latitude, longitude, city);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Localisation mise à jour' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Profil non trouvé' 
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la localisation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile/history/likes - Historique des likes reçus
router.get('/history/likes', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const likesHistory = await ProfileModel.getLikesHistory(userId, limit);
    
    res.json({ 
      success: true, 
      likes: likesHistory 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des likes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile/history/visits - Historique des visites reçues
router.get('/history/visits', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const visitsHistory = await ProfileModel.getVisitsHistory(userId, limit);
    
    res.json({ 
      success: true, 
      visits: visitsHistory 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des visites:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Route de test simple pour vérifier la connectivité
router.get('/test-endpoint', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    res.json({
      success: true,
      message: 'Endpoint de test fonctionnel',
      userId: userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur endpoint test' 
    });
  }
});



// POST /api/profile/photos - Upload de photos en base64 (stockage en DB)
router.post('/photos', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🎯 === DEBUT UPLOAD BASE64 DB ===');
    const userId = (req as any).user.userId;
    console.log('👤 User ID:', userId);
    console.log('📦 Taille body:', JSON.stringify(req.body).length, 'characters');
    console.log('📋 Keys dans body:', Object.keys(req.body));
    

    
    const { images } = req.body;
    console.log('📸 Images reçues:', images?.length || 0);
    console.log('📝 Type de images:', typeof images);
    console.log('📝 Est-ce un array?:', Array.isArray(images));
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      console.log('❌ Aucune image reçue');
      res.status(400).json({ 
        success: false, 
        message: 'Aucune photo fournie' 
      });
      return;
    }
    
    // Vérifier le nombre total de photos de l'utilisateur
    const currentPhotoCount = await PhotoModel.countByUserId(userId);
    
    if (currentPhotoCount + images.length > 5) {
      res.status(400).json({ 
        success: false, 
        message: 'Maximum 5 photos autorisées au total' 
      });
      return;
    }
    
    const savedPhotos = [];
    
    console.log('💾 Début sauvegarde en base de données...');
    
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      const { base64, filename, type } = imageData;
      
      // Validation stricte des données
      if (!base64 || !filename || !type) {
        console.log(`❌ Données manquantes pour l'image ${i+1}`);
        continue;
      }
      
      // Vérifier que c'est bien une image base64 valide
      if (!base64.startsWith('data:image/')) {
        console.log(`❌ Format base64 invalide pour ${filename}`);
        continue;
      }
      
      // Décoder le type s'il est encodé en HTML  
      const decodedType = type?.replace('&#x2F;', '/') || '';
      
      // Valider le type MIME
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(decodedType)) {
        console.log(`❌ Type MIME invalide: ${decodedType} pour ${filename}`);
        continue;
      }
      
      // Vérifier la taille de l'image (limite à 5MB en base64)
      const base64Size = base64.length;
      const imageSizeBytes = (base64Size * 3) / 4; // Approximation taille réelle
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB
      
      if (imageSizeBytes > maxSizeBytes) {
        console.log(`❌ Image trop volumineuse: ${(imageSizeBytes / 1024 / 1024).toFixed(2)}MB pour ${filename}`);
        continue;
      }
      
      // Générer un nom de fichier unique (pour référence)
      const uniqueFilename = `photo-${Date.now()}-${Math.round(Math.random() * 1E9)}${getFileExtension(decodedType)}`;
      
      console.log(`💾 Sauvegarde photo ${i+1} en DB: ${uniqueFilename}`);
      console.log(`📏 Taille base64: ${base64.length} caractères`);
      
      try {
              // Sauvegarder directement en base de données
      console.log(`💾 Tentative sauvegarde photo ${i+1}:`, {
        user_id: userId,
        filename: uniqueFilename,
        mime_type: decodedType,
        base64_length: base64.length,
        is_profile_picture: currentPhotoCount === 0 && savedPhotos.length === 0
      });
      
      const photo = await PhotoModel.create({
        user_id: userId,
        filename: uniqueFilename,
        image_data: base64,
        mime_type: decodedType,
        is_profile_picture: currentPhotoCount === 0 && savedPhotos.length === 0
      });
      
      console.log(`✅ Photo ${i+1} sauvegardée en DB:`, {
        id: photo.id,
        filename: photo.filename,
        mime_type: photo.mime_type,
        is_profile_picture: photo.is_profile_picture,
        upload_date: photo.upload_date
      });
      
      savedPhotos.push({
        id: photo.id,
        filename: photo.filename,
        mime_type: photo.mime_type,
        is_profile_picture: photo.is_profile_picture,
        upload_date: photo.upload_date
      });
      
      console.log(`📊 savedPhotos.length maintenant:`, savedPhotos.length);
      } catch (dbError) {
        console.error(`❌ Erreur DB pour ${uniqueFilename}:`, dbError);
        throw dbError;
      }
    }
    
    // Mettre à jour le fame rating
    await ProfileModel.updateFameRating(userId);
    
    console.log('✅ Upload réussi:', savedPhotos.length, 'photos sauvegardées en DB');
    console.log('=== FIN UPLOAD DB ===');
    
    res.json({ 
      success: true, 
      message: `${savedPhotos.length} photo(s) uploadée(s) avec succès`,
      photos: savedPhotos
    });
  } catch (error) {
    console.error('❌ ERREUR UPLOAD DB:', error);
    console.log('=== FIN ERREUR DB ===');
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur: ' + (error as Error).message
    });
  }
});

// GET /api/profile/photos/:id/image - Servir une image depuis la DB
router.get('/photos/:id/image', async (req: Request, res: Response): Promise<void> => {
  try {
    const photoIdParam = req.params.id;
    
    if (!photoIdParam) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de photo requis' 
      });
      return;
    }
    
    const photoId = parseInt(photoIdParam);
    
    if (isNaN(photoId)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de photo invalide' 
      });
      return;
    }
    
    // Récupérer la photo depuis la DB
    const photo = await PhotoModel.findById(photoId);
    
    if (!photo) {
      res.status(404).json({ 
        success: false, 
        message: 'Photo non trouvée' 
      });
      return;
    }
    
    // Décoder les entités HTML d'abord, puis le base64
    const decodedData = photo.image_data
      .replace(/&#x2F;/g, '/') // Décoder les slashes encodés
      .replace(/&quot;/g, '"') // Décoder les guillemets
      .replace(/&amp;/g, '&'); // Décoder les ampersands
    
    const base64Data = decodedData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Définir les headers appropriés avec CORS
    res.set({
      'Content-Type': photo.mime_type,
      'Content-Length': imageBuffer.length.toString(),
      'Cache-Control': 'public, max-age=31536000', // Cache 1 an
      'Access-Control-Allow-Origin': 'http://localhost:5173', // Autoriser le frontend
      'Access-Control-Allow-Credentials': 'true',
      'Cross-Origin-Resource-Policy': 'cross-origin', // Permettre l'accès cross-origin
    });
    
    res.send(imageBuffer);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// DELETE /api/profile/photos/:id - Supprimer une photo
router.delete('/photos/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const photoIdParam = req.params.id;
    
    if (!photoIdParam) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de photo requis' 
      });
      return;
    }
    
    const photoId = parseInt(photoIdParam);
    
    if (isNaN(photoId)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de photo invalide' 
      });
      return;
    }
    
    // Vérifier que la photo appartient à l'utilisateur
    const belongsToUser = await PhotoModel.belongsToUser(photoId, userId);
    if (!belongsToUser) {
      res.status(404).json({ 
        success: false, 
        message: 'Photo non trouvée' 
      });
      return;
    }
    
    // Supprimer la photo
    const deleted = await PhotoModel.delete(photoId, userId);
    
    if (deleted) {
      // Mettre à jour le fame rating
      await ProfileModel.updateFameRating(userId);
      
      res.json({ 
        success: true, 
        message: 'Photo supprimée avec succès' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Photo non trouvée' 
      });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de la photo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/profile/photos/:id/profile-picture - Définir comme photo de profil
router.put('/photos/:id/profile-picture', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const photoIdParam = req.params.id;
    
    if (!photoIdParam) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de photo requis' 
      });
      return;
    }
    
    const photoId = parseInt(photoIdParam);
    
    if (isNaN(photoId)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de photo invalide' 
      });
      return;
    }
    
    // Vérifier que la photo appartient à l'utilisateur
    const belongsToUser = await PhotoModel.belongsToUser(photoId, userId);
    if (!belongsToUser) {
      res.status(404).json({ 
        success: false, 
        message: 'Photo non trouvée' 
      });
      return;
    }
    
    // Définir comme photo de profil
    const success = await PhotoModel.setAsProfilePicture(userId, photoId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Photo de profil mise à jour' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Photo non trouvée' 
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la photo de profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// POST /api/profile/location/auto - Géolocalisation automatique basée sur l'IP
router.post('/location/auto', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    
    // Obtenir l'adresse IP du client
    const clientIP = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.connection as any)?.socket?.remoteAddress ||
                     undefined;
    
    console.log('IP client détectée:', clientIP);
    
    // Tenter la géolocalisation par IP
    const location = await GeolocationService.getLocationWithFallback(
      clientIP === '::1' || clientIP === '127.0.0.1' ? undefined : clientIP
    );
    
    if (!location) {
      // Utiliser la localisation par défaut
      const defaultLocation = GeolocationService.getDefaultLocation();
      await ProfileModel.updateLocation(
        userId, 
        defaultLocation.latitude, 
        defaultLocation.longitude, 
        defaultLocation.city
      );
      
      res.json({
        success: true,
        message: 'Localisation par défaut appliquée',
        location: defaultLocation,
        method: 'default'
      });
      return;
    }
    
    // Sauvegarder la localisation trouvée
    await ProfileModel.updateLocation(
      userId, 
      location.latitude, 
      location.longitude, 
      location.city
    );
    
    res.json({
      success: true,
      message: 'Localisation automatique mise à jour',
      location,
      method: 'ip_geolocation'
    });
    
  } catch (error) {
    console.error('Erreur lors de la géolocalisation automatique:', error);
    
    // En cas d'erreur, utiliser la localisation par défaut
    try {
      const userId = (req as any).user.userId;
      const defaultLocation = GeolocationService.getDefaultLocation();
      await ProfileModel.updateLocation(
        userId, 
        defaultLocation.latitude, 
        defaultLocation.longitude, 
        defaultLocation.city
      );
      
      res.json({
        success: true,
        message: 'Localisation par défaut appliquée (erreur réseau)',
        location: defaultLocation,
        method: 'default_fallback'
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la géolocalisation'
      });
    }
  }
});

// PUT /api/profile/location/manual - Ajustement manuel précis de la localisation
router.put('/location/manual', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { latitude, longitude, city, address } = req.body;
    
    // Validation des coordonnées
    if (!GeolocationService.validateCoordinates(latitude, longitude)) {
      res.status(400).json({ 
        success: false, 
        message: 'Coordonnées GPS invalides' 
      });
      return;
    }
    
    // Mise à jour de la localisation
    const success = await ProfileModel.updateLocation(userId, latitude, longitude, city);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Localisation manuelle mise à jour',
        location: {
          latitude,
          longitude,
          city,
          address,
          accuracy: 'manual'
        }
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Profil non trouvé' 
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour manuelle de la localisation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Fonction utilitaire pour obtenir l'extension de fichier
function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/gif': return '.gif';
    case 'image/webp': return '.webp';
    default: return '.jpg';
  }
}

export default router; 
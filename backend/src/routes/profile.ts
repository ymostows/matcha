import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ProfileModel } from '../models/Profile';
import { UserModel } from '../models/User';
import pool from '../config/database';
import { createNotification, NotificationType } from './notifications';
import { DistanceCalculator } from '../utils/distanceCalculator';

const router = Router();

// GET /api/profile - Obtenir son propre profil
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
      return;
    }
    
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

// POST /api/profile/complete - Marquer le profil comme complet
router.post('/complete', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    
    // Vérifier que le profil existe et a les informations requises
    const profile = await ProfileModel.findByUserId(userId);
    if (!profile) {
      res.status(404).json({ 
        success: false, 
        message: 'Profil non trouvé' 
      });
      return;
    }

    // Vérifier que les champs requis sont remplis
    if (!profile.biography || !profile.age || !profile.gender || !profile.sexual_orientation) {
      res.status(400).json({ 
        success: false, 
        message: 'Veuillez remplir tous les champs requis (biographie, âge, genre, orientation sexuelle)' 
      });
      return;
    }

    // Vérifier qu'il y a au moins une photo
    const photosResult = await pool.query(
      'SELECT COUNT(*) as photo_count FROM photos WHERE user_id = $1',
      [userId]
    );
    
    if (parseInt(photosResult.rows[0].photo_count) === 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Vous devez avoir au moins une photo pour terminer votre profil' 
      });
      return;
    }

    // Marquer le profil comme complet
    const updatedProfile = await ProfileModel.markAsComplete(userId);
    
    res.json({ 
      success: true, 
      message: 'Profil marqué comme complet avec succès', 
      profile: updatedProfile 
    });
  } catch (error) {
    console.error('Erreur completion profil:', error);
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

  // Validation stricte des coordonnées GPS si fournies
  if (data.location_lat !== undefined || data.location_lng !== undefined) {
    // Vérifier que les deux coordonnées sont fournies ensemble
    if ((data.location_lat !== undefined && data.location_lng === undefined) ||
        (data.location_lat === undefined && data.location_lng !== undefined)) {
      errors.push('Les coordonnées GPS doivent être fournies ensemble (latitude et longitude)');
    } else if (data.location_lat !== undefined && data.location_lng !== undefined) {
      // Validation stricte avec le service DistanceCalculator
      if (!DistanceCalculator.validateCoordinates(data.location_lat, data.location_lng)) {
        errors.push('Coordonnées GPS invalides. Vérifiez que la latitude est entre -90 et 90, la longitude entre -180 et 180, et qu\'elles ne sont pas (0,0)');
      }
      
      // Validation supplémentaire : vérifier que ce ne sont pas des coordonnées suspectes
      if (data.location_lat === data.location_lng) {
        errors.push('Coordonnées GPS suspectes (latitude et longitude identiques)');
      }
      
      // Logs de debug pour tracer les coordonnées reçues
      console.log(`📍 Coordonnées GPS reçues: ${data.location_lat}, ${data.location_lng}`);
    }
  }

  // Validation des champs de ville
  if (data.city !== undefined && typeof data.city !== 'string') {
    errors.push('La ville doit être une chaîne de caractères');
  }

  if (data.public_city !== undefined && typeof data.public_city !== 'string') {
    errors.push('La ville publique doit être une chaîne de caractères');
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

// PUT /api/profile/location/update-public-city - Mettre à jour le nom de ville public
router.put('/location/update-public-city', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    
    const updatedProfile = await ProfileModel.updatePublicCity(userId);
    
    if (!updatedProfile) {
      res.status(404).json({ 
        success: false, 
        message: 'Profil non trouvé ou coordonnées GPS manquantes' 
      });
      return;
    }
    
    res.json({ 
      success: true, 
      message: 'Nom de ville public mis à jour avec succès', 
      profile: updatedProfile 
    });
  } catch (error) {
    console.error('Erreur mise à jour ville publique:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile/browse - Obtenir les profils suggérés
router.get('/browse', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const {
      sortBy = 'distance',
      sortOrder = 'asc',
      ageMin,
      ageMax,
      maxDistance = 500,
      minFameRating = 0,
      maxFameRating = 100,
      limit: limitParam
    } = req.query;
    const limit = Math.min(parseInt(limitParam as string) || 500, 500);

    // Extraire les tableaux avec gestion correcte des paramètres multiples
    const commonTags = Array.isArray(req.query.commonTags) 
      ? req.query.commonTags as string[]
      : req.query.commonTags 
        ? [req.query.commonTags as string]
        : [];
        
    const cities = Array.isArray(req.query.cities) 
      ? req.query.cities as string[]
      : req.query.cities 
        ? [req.query.cities as string]
        : [];

    // Obtenir le profil de l'utilisateur actuel
    const currentUserProfile = await ProfileModel.findByUserId(userId);
    if (!currentUserProfile) {
      res.status(400).json({ 
        success: false, 
        message: 'Profil non trouvé. Veuillez compléter votre profil.' 
      });
      return;
    }

    // Définir l'orientation par défaut comme bisexuelle si non spécifiée
    const userOrientation = currentUserProfile.sexual_orientation || 'bi';
    const userGender = currentUserProfile.gender;

    // Déterminer les genres à afficher selon l'orientation ET la compatibilité mutuelle
    let targetGenders: string[] = [];
    let compatibleOrientations: string[] = [];
    
    if (userOrientation === 'hetero') {
      if (userGender === 'homme') {
        targetGenders = ['femme'];
        compatibleOrientations = ['hetero', 'bi']; // Femmes hétéro ou bi
      } else {
        targetGenders = ['homme'];
        compatibleOrientations = ['hetero', 'bi']; // Hommes hétéro ou bi
      }
    } else if (userOrientation === 'homo') {
      targetGenders = [userGender || 'homme'];
      compatibleOrientations = ['homo', 'bi']; // Même genre, homo ou bi
    } else { // bi ou undefined
      targetGenders = ['homme', 'femme'];
      compatibleOrientations = ['hetero', 'homo', 'bi']; // Tous compatibles
    }

    // Construire la requête de base
    let query = `
      SELECT
        u.id, u.id as user_id, u.username, u.first_name, u.last_name, u.last_seen,
        p.biography, p.age, p.gender, p.sexual_orientation, 
        COALESCE(p.interests, '{}') as interests,
        p.location_lat, p.location_lng, p.city, 
        p.city as public_city,
        p.fame_rating,
        (SELECT COUNT(*) FROM likes WHERE liked_id = u.id AND is_like = true) as likes_count,
        (
          CASE 
            WHEN p.interests IS NOT NULL AND array_length(p.interests, 1) > 0 AND $1::text[] IS NOT NULL AND array_length($1::text[], 1) > 0
            THEN (
              SELECT COUNT(*) 
              FROM unnest(p.interests) AS interest 
              WHERE interest = ANY($1::text[])
            )
            ELSE 0
          END
        ) AS common_tags_count,
        (
          CASE 
            WHEN p.location_lat IS NOT NULL AND p.location_lng IS NOT NULL 
                 AND $2::numeric IS NOT NULL AND $3::numeric IS NOT NULL
            THEN 
              6371 * acos(
                LEAST(1.0, 
                  cos(radians($2::numeric)) * cos(radians(p.location_lat)) * 
                  cos(radians(p.location_lng) - radians($3::numeric)) + 
                  sin(radians($2::numeric)) * sin(radians(p.location_lat))
                )
              )
            ELSE 999999
          END
        ) AS distance_km,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', ph.id,
              'filename', ph.filename,
              'is_profile_picture', ph.is_profile_picture
            ) ORDER BY ph.is_profile_picture DESC, ph.upload_date ASC
          ), '[]'::json)
          FROM photos ph 
          WHERE ph.user_id = u.id
        ) AS photos
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE u.id != $4 
        AND u.is_verified = true
        AND p.age IS NOT NULL
        AND p.gender IS NOT NULL
        AND p.gender = ANY($5)
        AND p.sexual_orientation = ANY($6)
        AND NOT EXISTS (
          SELECT 1 FROM likes l 
          WHERE l.liker_id = $4 AND l.liked_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks b 
          WHERE (b.blocker_id = $4 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $4)
        )
    `;

    let paramIndex = 7;
    const userInterests = currentUserProfile.interests && currentUserProfile.interests.length > 0 
      ? currentUserProfile.interests 
      : null;
    
    const params: any[] = [
      userInterests,
      currentUserProfile.location_lat || null,
      currentUserProfile.location_lng || null,
      userId,
      targetGenders,
      compatibleOrientations
    ];

    // Ajouter les filtres
    if (ageMin) {
      query += ` AND p.age >= $${paramIndex}`;
      params.push(parseInt(ageMin as string));
      paramIndex++;
    }

    if (ageMax) {
      query += ` AND p.age <= $${paramIndex}`;
      params.push(parseInt(ageMax as string));
      paramIndex++;
    }

    if (minFameRating) {
      query += ` AND p.fame_rating >= $${paramIndex}`;
      params.push(parseInt(minFameRating as string));
      paramIndex++;
    }

    if (maxFameRating) {
      query += ` AND p.fame_rating <= $${paramIndex}`;
      params.push(parseInt(maxFameRating as string));
      paramIndex++;
    }

    if (Array.isArray(commonTags) && commonTags.length > 0) {
      // Logique d'inclusion : afficher seulement les profils qui ont TOUS ces intérêts
      // Garder les tags originaux avec émojis pour un matching plus précis
      const normalizedTags = commonTags.map(tag => tag.trim());
      
      const tagConditions = normalizedTags.map((tag, index) => {
        const currentParamIndex = paramIndex + index;
        return `EXISTS (
          SELECT 1 FROM unnest(p.interests) AS interest 
          WHERE LOWER(interest) LIKE LOWER('%' || $${currentParamIndex} || '%')
        )`;
      });
      query += ` AND (${tagConditions.join(' AND ')})`;
      params.push(...normalizedTags);
      paramIndex += normalizedTags.length;
    }

    // Ajouter le filtre d'inclusion par villes spécifiques
    if (Array.isArray(cities) && cities.length > 0) {
      const cityConditions = cities.map((city, index) => {
        const currentParamIndex = paramIndex + index;
        return `LOWER(p.city) LIKE LOWER('%' || $${currentParamIndex} || '%')`;
      });
      query += ` AND (${cityConditions.join(' OR ')})`;
      params.push(...cities);
      paramIndex += cities.length;
    }

    // Ajouter le filtre de distance
    if (maxDistance && currentUserProfile.location_lat && currentUserProfile.location_lng) {
      query += ` AND (
        6371 * acos(
          cos(radians($2::numeric)) * cos(radians(p.location_lat)) * 
          cos(radians(p.location_lng) - radians($3::numeric)) + 
          sin(radians($2::numeric)) * sin(radians(p.location_lat))
        )
      ) <= $${paramIndex}`;
      params.push(parseFloat(maxDistance as string));
      paramIndex++;
    }

    // Ajouter le tri
    let orderClause = '';
    switch (sortBy) {
      case 'age':
        orderClause = `ORDER BY p.age ${sortOrder}`;
        break;
      case 'fame_rating':
        orderClause = `ORDER BY p.fame_rating ${sortOrder}`;
        break;
      case 'common_tags':
        orderClause = `ORDER BY common_tags_count ${sortOrder}, distance_km ASC`;
        break;
      case 'intelligent':
        // Matching intelligent basé sur les 3 critères combinés
        orderClause = `ORDER BY common_tags_count DESC, p.fame_rating DESC, distance_km ASC`;
        break;
      case 'distance':
      default:
        orderClause = `ORDER BY distance_km ASC, common_tags_count DESC, p.fame_rating DESC`;
        break;
    }

    query += ` ${orderClause} LIMIT ${limit}`;

    // Logs de debug pour le développement
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 RAW QUERY DEBUG:', JSON.stringify(req.query, null, 2));
      console.log('📊 Browse profiles debug:', {
        currentUser: {
          id: userId,
          location: currentUserProfile.location_lat && currentUserProfile.location_lng ? 
            `${currentUserProfile.location_lat}, ${currentUserProfile.location_lng}` : 'No GPS',
          city: currentUserProfile.city
        },
        filters: {
          sortBy, sortOrder, ageMin, ageMax, maxDistance, 
          minFameRating, maxFameRating, commonTags, cities
        },
        sqlParams: {
          userInterests: userInterests,
          userCoordinates: `${currentUserProfile.location_lat || 'null'}, ${currentUserProfile.location_lng || 'null'}`,
          parametersCount: params.length
        },
        rawQuery: {
          commonTags: req.query.commonTags,
          cities: req.query.cities,
          isCommonTagsArray: Array.isArray(req.query.commonTags),
          isCitiesArray: Array.isArray(req.query.cities)
        }
      });
      const normalizedTagsForDebug = commonTags.map(tag => tag.trim());
      console.log('✅ PROCESSED ARRAYS:', {
        commonTagsLength: commonTags.length,
        commonTagsContent: commonTags,
        normalizedTagsContent: normalizedTagsForDebug,
        citiesLength: cities.length,
        citiesContent: cities
      });
      
      // Afficher les premiers 500 caractères de la requête SQL générée
      console.log('🔍 SQL Query preview:', query.substring(0, 500) + '...');
    }

    const result = await pool.query(query, params);
    
    // Logs des résultats pour debug
    if (process.env.NODE_ENV === 'development') {
      const profilesWithDistance = result.rows.filter(p => p.distance_km && p.distance_km < 999999);
      console.log(`📍 Distance calculations: ${profilesWithDistance.length}/${result.rows.length} profiles with valid distances`);
      
      if (profilesWithDistance.length > 0) {
        const distances = profilesWithDistance.map(p => p.distance_km).sort((a, b) => a - b);
        console.log(`📏 Distance range: ${distances[0]}km - ${distances[distances.length - 1]}km`);
      }
    }
    
    res.json({
      success: true,
      profiles: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Erreur récupération profils:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile/matches - Obtenir la liste des matches
router.get('/matches', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
      return;
    }

    const query = `
      SELECT
        m.id as match_id,
        u.id as user_id, u.username, u.first_name, u.last_name, u.last_seen,
        p.biography, p.age, p.gender, p.sexual_orientation, 
        COALESCE(p.interests, '{}') as interests,
        p.location_lat, p.location_lng, p.city, p.fame_rating,
        m.created_at as matched_at,
        (
          SELECT json_build_object(
            'id', ph.id,
            'filename', ph.filename,
            'is_profile_picture', ph.is_profile_picture
          )
          FROM photos ph 
          WHERE ph.user_id = u.id AND ph.is_profile_picture = true
          LIMIT 1
        ) AS profile_photo
      FROM matches m
      JOIN users u ON (
        CASE 
          WHEN m.user1_id = $1 THEN u.id = m.user2_id
          WHEN m.user2_id = $1 THEN u.id = m.user1_id
        END
      )
      JOIN profiles p ON u.id = p.user_id
      WHERE (m.user1_id = $1 OR m.user2_id = $1)
        AND u.is_verified = true
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);

    const matches = result.rows.map(row => ({
      match_id: row.match_id,
      user_id: row.user_id,
      username: row.username,
      first_name: row.first_name,
      last_name: row.last_name,
      age: row.age,
      city: row.city,
      biography: row.biography,
      interests: Array.isArray(row.interests) ? row.interests : [],
      fame_rating: row.fame_rating || 0,
      photo_id: row.profile_photo?.id || null,
      filename: row.profile_photo?.filename || null,
      is_profile_picture: row.profile_photo?.is_profile_picture || false,
      matched_at: row.matched_at,
      last_seen: row.last_seen
    }));

    res.json({
      success: true,
      matches
    });

  } catch (error) {
    console.error('Erreur récupération matches:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// DELETE /api/profile/matches/:matchId - Supprimer un match (unmatch)
router.delete('/matches/:matchId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const matchId = parseInt(req.params.matchId as string);

    if (!userId || !matchId) {
      res.status(400).json({
        success: false,
        message: 'Données invalides'
      });
      return;
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Vérifier que le match appartient à l'utilisateur
      const matchCheck = await client.query(`
        SELECT user1_id, user2_id 
        FROM matches 
        WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)
      `, [matchId, userId]);

      if (matchCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          message: 'Match non trouvé'
        });
        return;
      }

      const match = matchCheck.rows[0];
      const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

      // Supprimer le match
      await client.query('DELETE FROM matches WHERE id = $1', [matchId]);

      // Supprimer les likes mutuels
      await client.query(`
        DELETE FROM likes 
        WHERE (liker_id = $1 AND liked_id = $2) 
           OR (liker_id = $2 AND liked_id = $1)
      `, [userId, otherUserId]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Match supprimé avec succès'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erreur suppression match:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/profile/like - Liker un profil
router.post('/like', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { targetUserId, isLike } = req.body;

    if (!targetUserId || typeof isLike !== 'boolean') {
      res.status(400).json({ 
        success: false, 
        message: 'Données manquantes' 
      });
      return;
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) {
      res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
      return;
    }

    // Vérifier que l'utilisateur qui like a au moins une photo de profil définie
    const userPhotosResult = await pool.query(
      'SELECT COUNT(*) as photo_count FROM photos WHERE user_id = $1 AND is_profile_picture = true',
      [userId]
    );

    if (parseInt(userPhotosResult.rows[0].photo_count) === 0) {
      res.status(400).json({
        success: false,
        message: 'Vous devez avoir une photo de profil pour liker.'
      });
      return;
    }

    const client = await pool.connect();
    let isMatch = false;
    try {
      // Vérifier s'il existe déjà un like de cet utilisateur vers la cible
      const existingLikeResult = await client.query(`
        SELECT is_like FROM likes 
        WHERE liker_id = $1 AND liked_id = $2
      `, [userId, targetUserId]);

      // Si c'est un like et qu'il y a déjà un match, empêcher l'action
      if (isLike) {
        const existingMatchResult = await client.query(`
          SELECT 1 FROM matches 
          WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
        `, [Math.min(userId, targetUserId), Math.max(userId, targetUserId)]);

        if (existingMatchResult.rows.length > 0) {
          client.release();
          res.status(400).json({ 
            success: false, 
            message: 'Vous êtes déjà en match avec cette personne. Utilisez la messagerie pour communiquer.' 
          });
          return;
        }
      }

      // Insérer ou mettre à jour le like
      await client.query(`
        INSERT INTO likes (liker_id, liked_id, is_like)
        VALUES ($1, $2, $3)
        ON CONFLICT (liker_id, liked_id) 
        DO UPDATE SET is_like = $3, created_at = CURRENT_TIMESTAMP
      `, [userId, targetUserId, isLike]);

      // Mettre à jour le fame rating de l'utilisateur cible
      await updateFameRating(targetUserId, client);

      // Vérifier s'il y a match (si les deux se sont likés)
      if (isLike) {
        const mutualLikeResult = await client.query(`
          SELECT 1 FROM likes 
          WHERE liker_id = $1 AND liked_id = $2 AND is_like = true
        `, [targetUserId, userId]);

        if (mutualLikeResult.rows.length > 0) {
          isMatch = true;
          // Créer le match
          await client.query(`
            INSERT INTO matches (user1_id, user2_id)
            VALUES ($1, $2)
            ON CONFLICT (user1_id, user2_id) DO NOTHING
          `, [Math.min(userId, targetUserId), Math.max(userId, targetUserId)]);
        }
      }

      res.json({
        success: true,
        message: isLike ? 'Profil liké' : 'Profil disliké',
        isMatch
      });

    } finally {
      client.release();
    }

    // Créer les notifications après avoir relâché la connexion
    if (isLike) {
      // Obtenir les infos de l'utilisateur qui a liké
      const likerProfile = await ProfileModel.findCompleteProfile(userId);
      
      if (isMatch) {
        // Notification de match pour les deux utilisateurs
        await createNotification(
          targetUserId,
          NotificationType.MATCH,
          `🎉 Vous avez un nouveau match avec ${likerProfile?.first_name}!`,
          { userId: userId, profileName: likerProfile?.first_name }
        );
        
        await createNotification(
          userId,
          NotificationType.MATCH,
          `🎉 Vous avez un nouveau match avec ${targetUser.first_name}!`,
          { userId: targetUserId, profileName: targetUser.first_name }
        );
      } else {
        // Notification de like simple
        await createNotification(
          targetUserId,
          NotificationType.LIKE,
          `❤️ ${likerProfile?.first_name} a liké votre profil!`,
          { userId: userId, profileName: likerProfile?.first_name }
        );
      }
    }

  } catch (error) {
    console.error('Erreur like profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile/liked - Obtenir les profils likés par l'utilisateur
router.get('/liked', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Debug userId - temporaire
    // console.log('Route /liked - userId reçu:', userId, typeof userId);
    
    // Vérification basique de userId
    if (!userId) {
      console.error('userId manquant dans /liked');
      res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
      return;
    }

    const query = `
      SELECT
        u.id, u.username, u.first_name, u.last_name, u.last_seen,
        p.biography, p.age, p.gender, p.sexual_orientation, 
        COALESCE(p.interests, '{}') as interests,
        p.location_lat, p.location_lng, p.city, p.fame_rating,
        l.created_at as liked_at,
        CASE WHEN m.user1_id IS NOT NULL THEN true ELSE false END as is_match,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', ph.id,
              'filename', ph.filename,
              'is_profile_picture', ph.is_profile_picture
            ) ORDER BY ph.is_profile_picture DESC, ph.upload_date ASC
          ), '[]'::json)
          FROM photos ph 
          WHERE ph.user_id = u.id
        ) AS photos
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      JOIN likes l ON l.liked_id = u.id AND l.liker_id = $1 AND l.is_like = true
      LEFT JOIN matches m ON (m.user1_id = $1 AND m.user2_id = u.id) OR (m.user1_id = u.id AND m.user2_id = $1)
      WHERE u.is_verified = true
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    
    res.json({
      success: true,
      profiles: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Erreur récupération profils likés:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// DELETE /api/profile/like/:userId - Unlike/annuler un like
router.delete('/like/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userIdParam = req.params.userId;
    
    if (!userIdParam) {
      res.status(400).json({ 
        success: false, 
        message: 'ID utilisateur manquant' 
      });
      return;
    }
    
    const targetUserId = parseInt(userIdParam);

    if (isNaN(targetUserId)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID utilisateur invalide' 
      });
      return;
    }

    const client = await pool.connect();
    let hadMatch = false;
    try {
      // Vérifier s'il y avait un match avant de supprimer le like
      const matchResult = await client.query(`
        SELECT 1 FROM matches 
        WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
      `, [Math.min(userId, targetUserId), Math.max(userId, targetUserId)]);

      hadMatch = matchResult.rows.length > 0;

      // Supprimer le like
      await client.query(`
        DELETE FROM likes 
        WHERE liker_id = $1 AND liked_id = $2
      `, [userId, targetUserId]);

      // Si il y avait un match, le supprimer
      if (hadMatch) {
        await client.query(`
          DELETE FROM matches 
          WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
        `, [Math.min(userId, targetUserId), Math.max(userId, targetUserId)]);

        // Marquer les conversations comme inactives (ou les supprimer selon le besoin)
        await client.query(`
          UPDATE conversations 
          SET is_active = false 
          WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
        `, [Math.min(userId, targetUserId), Math.max(userId, targetUserId)]);
      }

      // Mettre à jour le fame rating des deux utilisateurs
      await updateFameRating(userId, client);
      await updateFameRating(targetUserId, client);

      res.json({
        success: true,
        message: 'Like supprimé avec succès',
        hadMatch
      });

    } finally {
      client.release();
    }

    // Créer une notification d'unlike (différente selon s'il y avait un match ou pas)
    const userProfile = await ProfileModel.findCompleteProfile(userId);
    if (hadMatch) {
      await createNotification(
        targetUserId,
        NotificationType.UNLIKE,
        `💔 ${userProfile?.first_name} a annulé votre match`,
        { userId: userId, profileName: userProfile?.first_name }
      );
    } else {
      await createNotification(
        targetUserId,
        NotificationType.UNLIKE,
        `💔 ${userProfile?.first_name} a retiré son like`,
        { userId: userId, profileName: userProfile?.first_name }
      );
    }

  } catch (error) {
    console.error('Erreur suppression like:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile/history/likes - Obtenir l'historique des likes reçus
router.get('/history/likes', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await pool.query(`
      SELECT 
        l.id, l.liker_id, l.created_at,
        u.username, u.first_name, u.last_name,
        p.age, p.city,
        ph.id as photo_id, ph.filename, ph.is_profile_picture
      FROM likes l
      JOIN users u ON l.liker_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN photos ph ON u.id = ph.user_id AND ph.is_profile_picture = true
      WHERE l.liked_id = $1 AND l.is_like = true
        AND NOT EXISTS (
          SELECT 1 FROM matches m 
          WHERE (m.user1_id = $1 AND m.user2_id = l.liker_id) 
             OR (m.user1_id = l.liker_id AND m.user2_id = $1)
        )
      ORDER BY l.created_at DESC
      LIMIT $2
    `, [userId, limit]);
    
    res.json({
      success: true,
      likes: result.rows
    });
  } catch (error) {
    console.error('Erreur récupération historique likes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile/history/visits - Obtenir l'historique des visites reçues
router.get('/history/visits', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await pool.query(`
      SELECT
        v.id, v.visitor_id, v.visited_at,
        u.username, u.first_name, u.last_name,
        p.age, p.city,
        ph.id as photo_id
      FROM profile_visits v
      JOIN users u ON v.visitor_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN photos ph ON ph.user_id = u.id AND ph.is_profile_picture = true
      WHERE v.visited_id = $1
      ORDER BY v.visited_at DESC
      LIMIT $2
    `, [userId, limit]);
    
    res.json({
      success: true,
      visits: result.rows
    });
  } catch (error) {
    console.error('Erreur récupération historique visites:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// POST /api/profile/block - Bloquer un utilisateur
router.post('/block', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      res.status(400).json({ 
        success: false, 
        message: 'ID utilisateur cible manquant' 
      });
      return;
    }

    if (userId === targetUserId) {
      res.status(400).json({ 
        success: false, 
        message: 'Vous ne pouvez pas vous bloquer vous-même' 
      });
      return;
    }

    const client = await pool.connect();
    try {
      // Ajouter le blocage
      await client.query(`
        INSERT INTO blocks (blocker_id, blocked_id)
        VALUES ($1, $2)
        ON CONFLICT (blocker_id, blocked_id) DO NOTHING
      `, [userId, targetUserId]);

      // Supprimer les likes mutuels
      await client.query(`
        DELETE FROM likes 
        WHERE (liker_id = $1 AND liked_id = $2) OR (liker_id = $2 AND liked_id = $1)
      `, [userId, targetUserId]);

      // Supprimer les matches
      await client.query(`
        DELETE FROM matches 
        WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
      `, [Math.min(userId, targetUserId), Math.max(userId, targetUserId)]);

      // Mettre à jour le fame rating des deux utilisateurs
      await updateFameRating(userId, client);
      await updateFameRating(targetUserId, client);

      res.json({
        success: true,
        message: 'Utilisateur bloqué avec succès'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erreur blocage utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// POST /api/profile/report - Signaler un utilisateur
router.post('/report', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { targetUserId, reason } = req.body;

    if (!targetUserId || !reason) {
      res.status(400).json({ 
        success: false, 
        message: 'ID utilisateur cible et raison requis' 
      });
      return;
    }

    if (userId === targetUserId) {
      res.status(400).json({ 
        success: false, 
        message: 'Vous ne pouvez pas vous signaler vous-même' 
      });
      return;
    }

    await pool.query(`
      INSERT INTO reports (reporter_id, reported_id, reason)
      VALUES ($1, $2, $3)
    `, [userId, targetUserId, reason]);

    res.json({
      success: true,
      message: 'Signalement enregistré avec succès'
    });
  } catch (error) {
    console.error('Erreur signalement utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile/blocked - Liste des utilisateurs bloqués par l'utilisateur connecté
router.get('/blocked', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await pool.query(`
      SELECT b.blocked_id, b.created_at as blocked_at,
        u.username, u.first_name, u.last_name,
        p.age, p.city,
        ph.id as photo_id, ph.filename
      FROM blocks b
      JOIN users u ON b.blocked_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN photos ph ON ph.user_id = u.id AND ph.is_profile_picture = true
      WHERE b.blocker_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.json({ success: true, blocked: result.rows });
  } catch (error) {
    console.error('Erreur liste bloqués:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/profile/block/:userId - Débloquer un utilisateur
router.delete('/block/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const rawId = req.params.userId ?? '';
    const targetUserId = parseInt(rawId, 10);

    if (!rawId || isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'ID utilisateur invalide' });
      return;
    }

    await pool.query(
      'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [userId, targetUserId]
    );

    res.json({ success: true, message: 'Utilisateur débloqué' });
  } catch (error) {
    console.error('Erreur déblocage:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/profile/reported - Liste des utilisateurs signalés par l'utilisateur connecté
router.get('/reported', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await pool.query(`
      SELECT r.reported_id, r.created_at as reported_at, r.reason,
        u.username, u.first_name, u.last_name,
        p.age, p.city,
        ph.id as photo_id, ph.filename
      FROM reports r
      JOIN users u ON r.reported_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN photos ph ON ph.user_id = u.id AND ph.is_profile_picture = true
      WHERE r.reporter_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.json({ success: true, reported: result.rows });
  } catch (error) {
    console.error('Erreur liste signalés:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Fonction pour calculer et mettre à jour le fame rating
async function updateFameRating(userId: number, client: any): Promise<void> {
  try {
    const result = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM likes WHERE liked_id = $1 AND is_like = true) as likes_count,
        (SELECT COUNT(*) FROM profile_visits WHERE visited_id = $1) as visits_count,
        (SELECT COUNT(*) FROM matches WHERE user1_id = $1 OR user2_id = $1) as matches_count,
        (SELECT COUNT(*) FROM likes WHERE liked_id = $1 AND is_like = false) as dislikes_count
    `, [userId]);

    const stats = result.rows[0];
    
    // Calculer le fame rating basé sur:
    // - Likes reçus: +2 points chacun
    // - Visites: +1 point chaque
    // - Matches: +5 points chacun
    // - Dislikes: -1 point chacun
    const fameRating = Math.max(0, 
      (stats.likes_count * 2) + 
      (stats.visits_count * 1) + 
      (stats.matches_count * 5) - 
      (stats.dislikes_count * 1)
    );

    await client.query(`
      UPDATE profiles 
      SET fame_rating = $1 
      WHERE user_id = $2
    `, [fameRating, userId]);

  } catch (error) {
    console.error('Erreur mise à jour fame rating:', error);
  }
}


// Route de debug pour tester les calculs de distance (uniquement en développement)
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  router.get('/debug/distance', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const { targetLat, targetLng, debugMode = 'false' } = req.query;
      
      // Obtenir le profil de l'utilisateur actuel
      const currentUserProfile = await ProfileModel.findByUserId(userId);
      if (!currentUserProfile) {
        res.status(400).json({ 
          success: false, 
          message: 'Profil utilisateur non trouvé' 
        });
        return;
      }

      const debugInfo: any = {
        currentUser: {
          id: userId,
          coordinates: {
            latitude: currentUserProfile.location_lat,
            longitude: currentUserProfile.location_lng
          },
          city: currentUserProfile.city,
          coordinatesValid: DistanceCalculator.validateCoordinates(
            currentUserProfile.location_lat || 0, 
            currentUserProfile.location_lng || 0
          )
        }
      };

      // Si des coordonnées cibles sont fournies, calculer la distance
      if (targetLat && targetLng) {
        const targetLatNum = parseFloat(targetLat as string);
        const targetLngNum = parseFloat(targetLng as string);
        
        debugInfo.target = {
          coordinates: { latitude: targetLatNum, longitude: targetLngNum },
          coordinatesValid: DistanceCalculator.validateCoordinates(targetLatNum, targetLngNum)
        };

        if (currentUserProfile.location_lat && currentUserProfile.location_lng && 
            DistanceCalculator.validateCoordinates(currentUserProfile.location_lat, currentUserProfile.location_lng) &&
            DistanceCalculator.validateCoordinates(targetLatNum, targetLngNum)) {
          
          try {
            const distance = DistanceCalculator.calculateDistance(
              { latitude: currentUserProfile.location_lat, longitude: currentUserProfile.location_lng },
              { latitude: targetLatNum, longitude: targetLngNum }
            );
            
            debugInfo.calculation = {
              distance_km: distance,
              method: 'DistanceCalculator.calculateDistance'
            };
          } catch (error) {
            debugInfo.calculation = {
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            };
          }
          
          // Comparer avec le calcul SQL
          try {
            const sqlResult = await pool.query(`
              SELECT ${DistanceCalculator.getSQLDistanceFormula('$1', '$2', '$3::numeric', '$4::numeric')} AS sql_distance_km
            `, [currentUserProfile.location_lat, currentUserProfile.location_lng, targetLatNum, targetLngNum]);
            
            debugInfo.sqlCalculation = {
              distance_km: sqlResult.rows[0]?.sql_distance_km,
              method: 'SQL Haversine formula'
            };
          } catch (error) {
            debugInfo.sqlCalculation = {
              error: error instanceof Error ? error.message : 'Erreur SQL inconnue'
            };
          }
        }
      } else {
        // Trouver les 5 profils les plus proches pour debug
        try {
          const nearbyProfiles = await pool.query(`
            SELECT 
              u.id, u.first_name, u.last_name, p.city,
              p.location_lat, p.location_lng,
              ${DistanceCalculator.getSQLDistanceFormula('$1', '$2', 'p.location_lat', 'p.location_lng')} AS distance_km
            FROM users u
            JOIN profiles p ON u.id = p.user_id
            WHERE u.id != $3 
              AND p.location_lat IS NOT NULL 
              AND p.location_lng IS NOT NULL
              AND p.location_lat != 0 
              AND p.location_lng != 0
            ORDER BY distance_km ASC
            LIMIT 5
          `, [currentUserProfile.location_lat, currentUserProfile.location_lng, userId]);
          
          debugInfo.nearbyProfiles = nearbyProfiles.rows;
        } catch (error) {
          debugInfo.nearbyProfilesError = error instanceof Error ? error.message : 'Erreur inconnue';
        }
      }

      // Logs détaillés si demandé
      if (debugMode === 'true') {
        console.log('🔍 Debug calcul de distance:', JSON.stringify(debugInfo, null, 2));
      }
      
      res.json({
        success: true,
        debug: debugInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur route debug distance:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur serveur lors du debug' 
      });
    }
  });

  // Route pour valider les coordonnées de tous les profils existants
  router.get('/debug/validate-coordinates', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
      const { fix = 'false' } = req.query;
      
      const profiles = await pool.query(`
        SELECT id, user_id, city, location_lat, location_lng, public_city
        FROM profiles 
        WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL
      `);
      
      const results = {
        total: profiles.rows.length,
        valid: 0,
        invalid: 0,
        suspicious: 0,
        details: [] as any[]
      };
      
      for (const profile of profiles.rows) {
        const isValid = DistanceCalculator.validateCoordinates(profile.location_lat, profile.location_lng);
        const isSuspicious = profile.location_lat === profile.location_lng || 
                            (profile.location_lat === 0 && profile.location_lng === 0);
        
        if (isValid && !isSuspicious) {
          results.valid++;
        } else if (!isValid) {
          results.invalid++;
          results.details.push({
            user_id: profile.user_id,
            city: profile.city,
            coordinates: [profile.location_lat, profile.location_lng],
            reason: 'Invalid coordinates'
          });
        } else if (isSuspicious) {
          results.suspicious++;
          results.details.push({
            user_id: profile.user_id,
            city: profile.city,
            coordinates: [profile.location_lat, profile.location_lng],
            reason: 'Suspicious coordinates (same lat/lng or 0,0)'
          });
        }
      }
      
      res.json({
        success: true,
        validation: results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur validation coordonnées:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur serveur lors de la validation' 
      });
    }
  });
}

// GET /api/profile/tags/suggestions - Obtenir des suggestions de tags
router.get('/tags/suggestions', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q = '' } = req.query; // terme de recherche
    
    const query = `
      SELECT DISTINCT unnest(interests) as tag, COUNT(*) as usage_count
      FROM profiles 
      WHERE interests IS NOT NULL 
        AND array_length(interests, 1) > 0
        AND (CASE WHEN $1 != '' THEN 
          EXISTS (
            SELECT 1 FROM unnest(interests) as interest 
            WHERE LOWER(interest) LIKE LOWER('%' || $1 || '%')
          )
        ELSE true END)
      GROUP BY tag
      ORDER BY usage_count DESC, tag ASC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [q]);
    
    res.json({
      success: true,
      tags: result.rows.map(row => ({
        tag: row.tag,
        usage_count: parseInt(row.usage_count)
      }))
    });
  } catch (error) {
    console.error('Erreur suggestions tags:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/profile/cities/suggestions - Obtenir des suggestions de villes
router.get('/cities/suggestions', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q = '' } = req.query; // terme de recherche
    
    const query = `
      SELECT city, COUNT(*) as user_count
      FROM profiles 
      WHERE city IS NOT NULL 
        AND city != ''
        AND (CASE WHEN $1 != '' THEN 
          LOWER(city) LIKE LOWER('%' || $1 || '%')
        ELSE true END)
      GROUP BY city
      HAVING COUNT(*) >= 1
      ORDER BY user_count DESC, city ASC
      LIMIT 30
    `;
    
    const result = await pool.query(query, [q]);
    
    res.json({
      success: true,
      cities: result.rows.map(row => ({
        city: row.city,
        user_count: parseInt(row.user_count)
      }))
    });
  } catch (error) {
    console.error('Erreur suggestions villes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// POST /api/profile/migrate-coordinates - Migrer les profils existants pour ajouter des coordonnées GPS
router.post('/migrate-coordinates', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    
    // Vérifier si c'est un admin ou pour des tests (optionnel)
    console.log(`🔄 Migration des coordonnées demandée par l'utilisateur ${userId}`);
    
    // Trouver tous les profils sans coordonnées GPS valides
    const profilesQuery = await pool.query(`
      SELECT user_id, city 
      FROM profiles 
      WHERE city IS NOT NULL 
        AND city != ''
        AND (location_lat IS NULL OR location_lng IS NULL 
             OR location_lat = 0 OR location_lng = 0)
      LIMIT 50
    `);
    
    let migratedCount = 0;
    let failedCount = 0;
    
    for (const profile of profilesQuery.rows) {
      try {
        const coordinates = await (await import('../utils/geocoding')).GeocodingService.geocodeCity(profile.city);
        
        if (coordinates && coordinates.latitude !== 0 && coordinates.longitude !== 0) {
          await pool.query(`
            UPDATE profiles 
            SET location_lat = $1, location_lng = $2, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $3
          `, [coordinates.latitude, coordinates.longitude, profile.user_id]);
          
          console.log(`✅ Migré: ${profile.city} -> ${coordinates.latitude}, ${coordinates.longitude}`);
          migratedCount++;
        } else {
          console.log(`❌ Échec migration: ${profile.city}`);
          failedCount++;
        }
      } catch (error) {
        console.error(`Erreur migration profil ${profile.user_id}:`, error);
        failedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Migration terminée: ${migratedCount} profils migrés, ${failedCount} échecs`,
      migratedCount,
      failedCount
    });
    
  } catch (error) {
    console.error('Erreur migration coordonnées:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la migration' 
    });
  }
});

// POST /api/profile/geocode-city - Géolocaliser une ville
router.post('/geocode-city', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { cityName } = req.body;

    if (!cityName || typeof cityName !== 'string' || cityName.trim().length < 2) {
      res.status(400).json({ 
        success: false, 
        message: 'Nom de ville requis (minimum 2 caractères)' 
      });
      return;
    }

    const cleanCityName = cityName.trim();
    
    // Utiliser notre service de géocodage pour trouver les coordonnées
    const coordinates = await (await import('../utils/geocoding')).GeocodingService.geocodeCity(cleanCityName);
    
    if (coordinates) {
      // Déterminer la précision en fonction de la méthode utilisée
      let precision = 'medium';
      let formattedName = cleanCityName;
      
      // Si les coordonnées ne sont pas des arrondis simples, c'est probablement de Nominatim (précis)
      if (coordinates.latitude % 0.01 !== 0 || coordinates.longitude % 0.01 !== 0) {
        precision = 'high';
        formattedName = `${cleanCityName}, France`;
      } else {
        precision = 'medium';
        formattedName = `${cleanCityName} (approximatif)`;
      }

      res.json({
        success: true,
        coordinates,
        formattedName,
        precision,
        message: 'Ville géolocalisée avec succès'
      });
    } else {
      res.json({
        success: false,
        message: 'Impossible de localiser cette ville',
        coordinates: null
      });
    }
  } catch (error) {
    console.error('Erreur géocodage ville:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la géolocalisation' 
    });
  }
});

// GET /api/profile/:userId - Obtenir un profil public par ID et enregistrer la visite
// DOIT être après toutes les routes nommées pour ne pas capturer /liked, /blocked, etc.
router.get('/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const visitorId = (req as any).user.userId;
    const userIdParam = req.params.userId;

    if (!userIdParam) {
      res.status(400).json({ success: false, message: 'ID utilisateur manquant' });
      return;
    }

    const targetUserId = parseInt(userIdParam);

    if (isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'ID utilisateur invalide' });
      return;
    }

    if (visitorId === targetUserId) {
      res.status(400).json({ success: false, message: 'Utilisez la route /profile pour votre propre profil' });
      return;
    }

    const blockCheck = await pool.query(`
      SELECT 1 FROM blocks
      WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
    `, [visitorId, targetUserId]);

    if (blockCheck.rows.length > 0) {
      res.status(403).json({ success: false, message: 'Profil non accessible' });
      return;
    }

    const visitorProfile = await ProfileModel.findByUserId(visitorId);
    let visitorCoordinates = undefined;
    if (visitorProfile && visitorProfile.location_lat && visitorProfile.location_lng) {
      visitorCoordinates = {
        latitude: typeof visitorProfile.location_lat === 'string' ? parseFloat(visitorProfile.location_lat) : visitorProfile.location_lat,
        longitude: typeof visitorProfile.location_lng === 'string' ? parseFloat(visitorProfile.location_lng) : visitorProfile.location_lng
      };
    }

    const profile = await ProfileModel.findCompleteProfile(targetUserId, visitorCoordinates);

    if (!profile) {
      res.status(404).json({ success: false, message: 'Profil non trouvé' });
      return;
    }

    const client = await pool.connect();
    let isNewVisit = false;
    try {
      const existingVisit = await client.query(`
        SELECT id FROM profile_visits
        WHERE visitor_id = $1 AND visited_id = $2 AND DATE(visited_at) = CURRENT_DATE
      `, [visitorId, targetUserId]);

      if (existingVisit.rows.length === 0) {
        await client.query(`
          INSERT INTO profile_visits (visitor_id, visited_id, visited_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
        `, [visitorId, targetUserId]);
        isNewVisit = true;
      } else {
        await client.query(`
          UPDATE profile_visits
          SET visited_at = CURRENT_TIMESTAMP
          WHERE visitor_id = $1 AND visited_id = $2 AND DATE(visited_at) = CURRENT_DATE
        `, [visitorId, targetUserId]);
      }

      await updateFameRating(targetUserId, client);
    } finally {
      client.release();
    }

    if (isNewVisit && visitorProfile) {
      const visitorFullProfile = await ProfileModel.findCompleteProfile(visitorId);
      await createNotification(
        targetUserId,
        NotificationType.VISIT,
        `👁️ ${visitorFullProfile?.first_name} a visité votre profil`,
        { userId: visitorId, profileName: visitorFullProfile?.first_name }
      );
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;

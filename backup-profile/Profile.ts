import pool from '../config/database';
import { Profile, CreateProfileData, UpdateProfileData } from '../types/user';
import { QueryResult } from 'pg';

export class ProfileModel {
  
  // Créer ou mettre à jour un profil complet
  static async createOrUpdate(userId: number, profileData: CreateProfileData): Promise<Profile> {
    const client = await pool.connect();
    
    try {
      // Vérifier si le profil existe déjà
      const existingProfile = await client.query(
        'SELECT id FROM profiles WHERE user_id = $1',
        [userId]
      );
      
      let query: string;
      let values: any[];
      
      if (existingProfile.rows.length > 0) {
        // Mise à jour du profil existant
        query = `
          UPDATE profiles 
          SET biography = $2, age = $3, gender = $4, sexual_orientation = $5, 
              interests = $6, city = $7, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
          RETURNING *
        `;
        values = [
          userId,
          profileData.biography,
          profileData.age,
          profileData.gender,
          profileData.sexual_orientation,
          profileData.interests,
          profileData.city
        ];
      } else {
        // Création d'un nouveau profil
        query = `
          INSERT INTO profiles (user_id, biography, age, gender, sexual_orientation, interests, city)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        values = [
          userId,
          profileData.biography,
          profileData.age,
          profileData.gender,
          profileData.sexual_orientation,
          profileData.interests,
          profileData.city
        ];
      }
      
      const result: QueryResult<Profile> = await client.query(query, values);
      
      if (result.rows.length === 0 || !result.rows[0]) {
        throw new Error('Échec de la création/mise à jour du profil');
      }
      
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }
  
  // Obtenir un profil par user_id
  static async findByUserId(userId: number): Promise<Profile | null> {
    const client = await pool.connect();
    
    try {
      const query = 'SELECT * FROM profiles WHERE user_id = $1';
      const result: QueryResult<Profile> = await client.query(query, [userId]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
  
  // Obtenir un profil complet avec photos
  static async findCompleteProfile(userId: number): Promise<any> {
    const client = await pool.connect();
    
    try {
      // D'abord récupérer le profil de base
      const profileQuery = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name, u.last_seen,
          p.*
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = $1
      `;
      
      const profileResult = await client.query(profileQuery, [userId]);
      
      if (profileResult.rows.length === 0) {
        return null;
      }
      
      const profile = profileResult.rows[0];
      
      // Ensuite récupérer les photos séparément
      const photosQuery = `
        SELECT 
          id, filename, is_profile_picture, upload_date
        FROM photos 
        WHERE user_id = $1 
        ORDER BY is_profile_picture DESC, upload_date ASC
      `;
      
      const photosResult = await client.query(photosQuery, [userId]);
      
      // Ajouter les photos au profil
      profile.photos = photosResult.rows || [];
      
      console.log(`📸 findCompleteProfile pour user ${userId}: ${profile.photos.length} photos trouvées`);
      
      return profile;
    } finally {
      client.release();
    }
  }
  
  // Mettre à jour la géolocalisation
  static async updateLocation(userId: number, latitude: number, longitude: number, city?: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE profiles 
        SET location_lat = $2, location_lng = $3, city = COALESCE($4, city)
        WHERE user_id = $1
      `;
      
      const result = await client.query(query, [userId, latitude, longitude, city]);
      
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }
  
  // Calculer et mettre à jour le fame rating
  static async updateFameRating(userId: number): Promise<number> {
    const client = await pool.connect();
    
    try {
      // Calculer le fame rating basé sur:
      // - Nombre de likes reçus (+1 par like)
      // - Nombre de visites de profil (+0.1 par visite)
      // - Nombre de matches (+2 par match)
      // - Nombre de photos (-1 par photo manquante, max 5)
      
      const query = `
        WITH user_stats AS (
          SELECT 
            u.id,
            COALESCE(likes_received.count, 0) as likes_count,
            COALESCE(visits_received.count, 0) as visits_count,
            COALESCE(matches_count.count, 0) as matches_count,
            COALESCE(photos_count.count, 0) as photos_count
          FROM users u
          LEFT JOIN (
            SELECT liked_id, COUNT(*) as count
            FROM likes 
            WHERE is_like = true
            GROUP BY liked_id
          ) likes_received ON u.id = likes_received.liked_id
          LEFT JOIN (
            SELECT visited_id, COUNT(*) as count
            FROM profile_visits 
            GROUP BY visited_id
          ) visits_received ON u.id = visits_received.visited_id
          LEFT JOIN (
            SELECT user_id, COUNT(*) as count
            FROM (
              SELECT user1_id as user_id FROM matches
              UNION ALL
              SELECT user2_id as user_id FROM matches
            ) all_matches
            GROUP BY user_id
          ) matches_count ON u.id = matches_count.user_id
          LEFT JOIN (
            SELECT user_id, COUNT(*) as count
            FROM photos
            GROUP BY user_id
          ) photos_count ON u.id = photos_count.user_id
          WHERE u.id = $1
        )
        UPDATE profiles 
        SET fame_rating = (
          SELECT 
            GREATEST(0, LEAST(100, 
              likes_count + 
              ROUND(visits_count * 0.1) + 
              (matches_count * 2) + 
              (photos_count * 2) + 
              (CASE WHEN photos_count >= 5 THEN 5 ELSE photos_count - 5 END)
            ))
          FROM user_stats
        )
        WHERE user_id = $1
        RETURNING fame_rating
      `;
      
      const result = await client.query(query, [userId]);
      
      return result.rows[0]?.fame_rating || 0;
    } finally {
      client.release();
    }
  }
  
  // Obtenir l'historique des likes reçus
  static async getLikesHistory(userId: number, limit: number = 20): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          l.*,
          u.username, u.first_name, u.last_name,
          p.age, p.city
        FROM likes l
        JOIN users u ON l.liker_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE l.liked_id = $1 AND l.is_like = true
        ORDER BY l.created_at DESC
        LIMIT $2
      `;
      
      const result = await client.query(query, [userId, limit]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  // Obtenir l'historique des visites reçues
  static async getVisitsHistory(userId: number, limit: number = 20): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          v.*,
          u.username, u.first_name, u.last_name,
          p.age, p.city
        FROM profile_visits v
        JOIN users u ON v.visitor_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE v.visited_id = $1
        ORDER BY v.visited_at DESC
        LIMIT $2
      `;
      
      const result = await client.query(query, [userId, limit]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  // Enregistrer une visite de profil
  static async recordVisit(visitorId: number, visitedId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Éviter les doublons (même visiteur dans les 5 dernières minutes)
      const recentVisit = await client.query(`
        SELECT id FROM profile_visits 
        WHERE visitor_id = $1 AND visited_id = $2 
        AND visited_at > NOW() - INTERVAL '5 minutes'
      `, [visitorId, visitedId]);
      
      if (recentVisit.rows.length === 0) {
        await client.query(
          'INSERT INTO profile_visits (visitor_id, visited_id) VALUES ($1, $2)',
          [visitorId, visitedId]
        );
        
        // Mettre à jour le fame rating du profil visité
        await this.updateFameRating(visitedId);
      }
    } finally {
      client.release();
    }
  }
  
  // Rechercher des profils avec filtres
  static async searchProfiles(
    userId: number,
    filters: {
      ageMin?: number;
      ageMax?: number;
      city?: string;
      interests?: string[];
      gender?: string;
      sexual_orientation?: string;
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      let whereConditions = ['u.id != $1']; // Exclure l'utilisateur actuel
      let queryParams: any[] = [userId];
      let paramIndex = 2;
      
      // Filtres d'âge
      if (filters.ageMin !== undefined) {
        whereConditions.push(`p.age >= $${paramIndex}`);
        queryParams.push(filters.ageMin);
        paramIndex++;
      }
      
      if (filters.ageMax !== undefined) {
        whereConditions.push(`p.age <= $${paramIndex}`);
        queryParams.push(filters.ageMax);
        paramIndex++;
      }
      
      // Filtre par ville
      if (filters.city) {
        whereConditions.push(`p.city ILIKE $${paramIndex}`);
        queryParams.push(`%${filters.city}%`);
        paramIndex++;
      }
      
      // Filtre par genre
      if (filters.gender) {
        whereConditions.push(`p.gender = $${paramIndex}`);
        queryParams.push(filters.gender);
        paramIndex++;
      }
      
      // Filtre par orientation sexuelle
      if (filters.sexual_orientation) {
        whereConditions.push(`p.sexual_orientation = $${paramIndex}`);
        queryParams.push(filters.sexual_orientation);
        paramIndex++;
      }
      
      // Filtre par centres d'intérêt
      if (filters.interests && filters.interests.length > 0) {
        whereConditions.push(`p.interests && $${paramIndex}`);
        queryParams.push(filters.interests);
        paramIndex++;
      }
      
      const query = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name, u.last_seen,
          p.*,
          ARRAY_AGG(
            CASE WHEN ph.id IS NOT NULL 
            THEN json_build_object(
              'id', ph.id,
              'filename', ph.filename,
              'is_profile_picture', ph.is_profile_picture,
              'upload_date', ph.upload_date,
              'image_data', ph.image_data,
              'mime_type', ph.mime_type
            )
            END
          ) FILTER (WHERE ph.id IS NOT NULL) as photos
        FROM users u
        JOIN profiles p ON u.id = p.user_id
        LEFT JOIN photos ph ON u.id = ph.user_id
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY u.id, p.id
        ORDER BY p.fame_rating DESC, p.updated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await client.query(query, queryParams);
      
      return result.rows;
    } finally {
      client.release();
    }
  }
} 
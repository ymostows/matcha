import pool from '../config/database';
import { Profile, CreateProfileData } from '../types/user';
import { QueryResult } from 'pg';

export class ProfileModel {
  
  // Créer ou mettre à jour un profil
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
        // Mise à jour
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
        // Création
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
  
  // Obtenir un profil complet avec informations utilisateur et photos
  static async findCompleteProfile(userId: number): Promise<any> {
    const client = await pool.connect();
    
    try {
      // D'abord récupérer le profil de base
      const profileQuery = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name, u.email, u.last_seen,
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
          id, filename, is_profile_picture, upload_date, mime_type
        FROM photos 
        WHERE user_id = $1 
        ORDER BY is_profile_picture DESC, upload_date ASC
      `;
      
      const photosResult = await client.query(photosQuery, [userId]);
      
      // Ajouter les photos au profil
      profile.photos = photosResult.rows || [];
      
      return profile;
    } finally {
      client.release();
    }
  }
} 
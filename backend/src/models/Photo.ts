import pool from '../config/database';
import { QueryResult } from 'pg';

export interface Photo {
  id: number;
  user_id: number;
  filename: string;
  image_data: string; // Base64 data
  mime_type: string;
  is_profile_picture: boolean;
  upload_date: Date;
}

export interface CreatePhotoData {
  user_id: number;
  filename: string;
  image_data: string; // Base64 data
  mime_type: string;
  is_profile_picture?: boolean;
}

export class PhotoModel {
  
  // Ajouter une photo
  static async create(photoData: CreatePhotoData): Promise<Photo> {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO photos (user_id, filename, image_data, mime_type, is_profile_picture)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result: QueryResult<Photo> = await client.query(query, [
        photoData.user_id,
        photoData.filename,
        photoData.image_data,
        photoData.mime_type,
        photoData.is_profile_picture || false
      ]);
      
      if (result.rows.length === 0 || !result.rows[0]) {
        throw new Error('Échec de l\'ajout de la photo');
      }
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }
  
  // Obtenir toutes les photos d'un utilisateur (sans image_data pour les listes)
  static async findByUserId(userId: number): Promise<Omit<Photo, 'image_data'>[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, user_id, filename, mime_type, is_profile_picture, upload_date 
        FROM photos 
        WHERE user_id = $1 
        ORDER BY is_profile_picture DESC, upload_date ASC
      `;
      
      const result = await client.query(query, [userId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Obtenir une photo par ID avec l'image data
  static async findById(photoId: number): Promise<Photo | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM photos WHERE id = $1
      `;
      
      const result: QueryResult<Photo> = await client.query(query, [photoId]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
  
  // Définir une photo comme photo de profil
  static async setAsProfilePicture(userId: number, photoId: number): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      // Retirer le statut de photo de profil des autres photos
      await client.query(
        'UPDATE photos SET is_profile_picture = false WHERE user_id = $1',
        [userId]
      );
      
      // Définir la nouvelle photo de profil
      const result = await client.query(
        'UPDATE photos SET is_profile_picture = true WHERE id = $1 AND user_id = $2',
        [photoId, userId]
      );
      
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }
  
  // Supprimer une photo
  static async delete(photoId: number, userId: number): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM photos WHERE id = $1 AND user_id = $2 RETURNING filename',
        [photoId, userId]
      );
      
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }
  
  // Compter le nombre de photos d'un utilisateur
  static async countByUserId(userId: number): Promise<number> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM photos WHERE user_id = $1',
        [userId]
      );
      
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }
  
  // Obtenir la photo de profil d'un utilisateur
  static async getProfilePicture(userId: number): Promise<Photo | null> {
    const client = await pool.connect();
    
    try {
      const result: QueryResult<Photo> = await client.query(
        'SELECT * FROM photos WHERE user_id = $1 AND is_profile_picture = true LIMIT 1',
        [userId]
      );
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
  
  // Vérifier si une photo appartient à un utilisateur
  static async belongsToUser(photoId: number, userId: number): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT id FROM photos WHERE id = $1 AND user_id = $2',
        [photoId, userId]
      );
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }
} 
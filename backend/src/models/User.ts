import pool from '../config/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, CreateUserRequest, Profile } from '../types/user';
import { QueryResult } from 'pg';

export class UserModel {
  
  // Créer un nouvel utilisateur
  static async create(userData: CreateUserRequest): Promise<User> {
    try {
      // Hasher le mot de passe
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(userData.password, saltRounds);
      
      // Générer un token de vérification sécurisé avec crypto
      const verification_token = crypto.randomBytes(32).toString('hex');
      
      const query = `
        INSERT INTO users (email, password_hash, username, first_name, last_name, verification_token)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        userData.email,
        password_hash,
        userData.username,
        userData.first_name,
        userData.last_name,
        verification_token
      ];
      
      const result: QueryResult<User> = await pool.query(query, values);
      
      if (result.rows.length === 0 || !result.rows[0]) {
        throw new Error('Échec de la création de l\'utilisateur');
      }
      
      const newUser = result.rows[0];
      
      // Créer un profil vide pour cet utilisateur (mais ne pas échouer si ça rate)
      try {
        await pool.query(
          'INSERT INTO profiles (user_id) VALUES ($1)',
          [newUser.id]
        );
      } catch (profileError) {
        console.warn('Erreur création profil (non critique):', profileError);
      }
      
      return newUser;
    } catch (error) {
      console.error('Erreur UserModel.create:', error);
      throw error;
    }
  }

  // Trouver un utilisateur par email
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result: QueryResult<User> = await pool.query(query, [email]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur UserModel.findByEmail:', error);
      throw error;
    }
  }

  // Trouver un utilisateur par username
  static async findByUsername(username: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result: QueryResult<User> = await pool.query(query, [username]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur UserModel.findByUsername:', error);
      throw error;
    }
  }

  // Trouver un utilisateur par ID
  static async findById(id: number): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result: QueryResult<User> = await pool.query(query, [id]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur UserModel.findById:', error);
      throw error;
    }
  }

  // Vérifier le mot de passe
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Erreur UserModel.verifyPassword:', error);
      return false;
    }
  }

  // Vérifier un compte utilisateur
  static async verifyAccount(token: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET is_verified = true, verification_token = NULL
        WHERE verification_token = $1 
          AND is_verified = false 
        RETURNING id
      `;
      
      const result = await client.query(query, [token]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  // Trouver un utilisateur par token de vérification (vérifier aussi l'expiration)
  static async findByVerificationToken(token: string): Promise<User | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM users 
        WHERE verification_token = $1 
      `;
      const result: QueryResult<User> = await client.query(query, [token]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Définir un nouveau token de vérification
  static async setVerificationToken(email: string, token: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET verification_token = $1
        WHERE email = $2 AND is_verified = false
        RETURNING id
      `;
      
      const result = await client.query(query, [token, email]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  // Définir un token de reset de mot de passe
  static async setPasswordResetToken(email: string, token: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure
      
      const query = `
        UPDATE users 
        SET reset_password_token = $1, reset_password_expires = $2
        WHERE email = $3 AND is_verified = true
        RETURNING id
      `;
      
      const result = await client.query(query, [token, expiresAt, email]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  // Trouver un utilisateur par token de reset
  static async findByResetToken(token: string): Promise<User | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM users 
        WHERE reset_password_token = $1 
          AND reset_password_expires > CURRENT_TIMESTAMP
      `;
      const result: QueryResult<User> = await client.query(query, [token]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Réinitialiser le mot de passe
  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);
      
      const query = `
        UPDATE users 
        SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL
        WHERE reset_password_token = $2 
          AND reset_password_expires > CURRENT_TIMESTAMP
        RETURNING id
      `;
      
      const result = await client.query(query, [password_hash, token]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  // Mettre à jour la dernière connexion
  static async updateLastSeen(userId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      const query = 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1';
      await client.query(query, [userId]);
    } finally {
      client.release();
    }
  }

  // Obtenir l'utilisateur avec son profil
  static async findWithProfile(userId: number): Promise<{ user: User; profile: Profile } | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          u.*,
          p.id as profile_id,
          p.biography,
          p.age,
          p.gender,
          p.sexual_orientation,
          p.interests,
          p.location_lat,
          p.location_lng,
          p.city,
          p.fame_rating,
          p.created_at as profile_created_at,
          p.updated_at as profile_updated_at
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = $1
      `;
      
      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      const user: User = {
        id: row.id,
        email: row.email,
        password_hash: row.password_hash,
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        is_verified: row.is_verified,
        verification_token: row.verification_token,
        reset_password_token: row.reset_password_token,
        reset_password_expires: row.reset_password_expires,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_seen: row.last_seen
      };
      
      const profile: Profile = {
        id: row.profile_id,
        user_id: row.id,
        biography: row.biography,
        age: row.age,
        gender: row.gender,
        sexual_orientation: row.sexual_orientation,
        interests: row.interests,
        location_lat: row.location_lat,
        location_lng: row.location_lng,
        city: row.city,
        fame_rating: row.fame_rating,
        created_at: row.profile_created_at,
        updated_at: row.profile_updated_at
      };
      
      return { user, profile };
    } finally {
      client.release();
    }
  }

  // Mettre à jour les informations utilisateur (nom, prénom, email)
  static async updateUserInfo(userId: number, userData: {
    first_name?: string;
    last_name?: string;
    email?: string;
  }): Promise<User | null> {
    const client = await pool.connect();
    
    try {
      const fields: string[] = [];
      const values: any[] = [userId];
      let paramIndex = 2;
      
      if (userData.first_name !== undefined) {
        fields.push(`first_name = $${paramIndex}`);
        values.push(userData.first_name);
        paramIndex++;
      }
      
      if (userData.last_name !== undefined) {
        fields.push(`last_name = $${paramIndex}`);
        values.push(userData.last_name);
        paramIndex++;
      }
      
      if (userData.email !== undefined) {
        fields.push(`email = $${paramIndex}`);
        values.push(userData.email);
        paramIndex++;
      }
      
      if (fields.length === 0) {
        // Aucun champ à mettre à jour
        return await this.findById(userId);
      }
      
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
} 
import pool from '../config/database';
import bcrypt from 'bcryptjs';

export class UserModel {
  
  // Créer un nouvel utilisateur
  static async create(userData: any): Promise<any> {
    const client = await pool.connect();
    
    try {
      // Hasher le mot de passe
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(userData.password, saltRounds);
      
      // Générer un token de vérification
      const verification_token = Math.random().toString(36).substring(2, 15);
      
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
      
      const result = await client.query(query, values);
      const newUser = result.rows[0];
      
      if (!newUser) {
        throw new Error('Échec de la création de l\'utilisateur');
      }
      
      // Créer un profil vide pour cet utilisateur
      await client.query(
        'INSERT INTO profiles (user_id) VALUES ($1)',
        [newUser.id]
      );
      
      return newUser;
    } finally {
      client.release();
    }
  }

  // Trouver un utilisateur par email
  static async findByEmail(email: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await client.query(query, [email]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Trouver un utilisateur par username
  static async findByUsername(username: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await client.query(query, [username]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Vérifier le mot de passe
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
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
} 
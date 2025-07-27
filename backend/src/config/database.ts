import { Pool } from 'pg';

// Configuration de la connexion PostgreSQL optimisée pour Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : 
       process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Réduit pour Neon (limite de connexions)
  min: 0, // Permet de fermer toutes les connexions si inactif
  idleTimeoutMillis: 20000, // Réduit pour économiser les connexions
  connectionTimeoutMillis: 5000, // Augmenté pour Neon (parfois plus lent)
  statement_timeout: 5000, // Timeout pour acquérir une connexion
});

// Fonction pour tester la connexion
export const testConnection = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    console.log('✅ Connexion à PostgreSQL établie');
    const result = await client.query('SELECT NOW()');
    console.log(`📅 Heure de la base de données: ${result.rows[0].now}`);
    client.release();
  } catch (error) {
    console.error('❌ Erreur de connexion à PostgreSQL:', error);
    throw error;
  }
};

// Export du pool pour les requêtes
export default pool; 
import { Pool } from 'pg';

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Nombre maximum de connexions dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
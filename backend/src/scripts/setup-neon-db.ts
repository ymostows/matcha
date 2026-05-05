#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Charger le fichier .env
config();

/**
 * Script pour configurer la base de données Neon avec le schéma complet
 */

async function setupNeonDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    process.exit(1);
  }

  if (!connectionString.includes('neon.tech')) {
  }


  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5, // Limite pour Neon
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });

  try {
    // Test de connexion
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    // Lecture du fichier de schéma
    const schemaPath = join(__dirname, '../../..', 'database', 'init.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    // Exécution du schéma
    await pool.query(schema);

    // Vérification des tables créées
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    tablesResult.rows.forEach(row => {
    });


  } catch (error) {
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécution du script
if (require.main === module) {
  setupNeonDatabase().catch((err) => { throw err; });
}

export { setupNeonDatabase };
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
    console.error('❌ DATABASE_URL n\'est pas définie dans les variables d\'environnement');
    process.exit(1);
  }

  if (!connectionString.includes('neon.tech')) {
    console.warn('⚠️  Attention: Cette URL ne semble pas être une base Neon');
  }

  console.log('🚀 Configuration de la base de données Neon...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5, // Limite pour Neon
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });

  try {
    // Test de connexion
    console.log('🔗 Test de connexion...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log(`✅ Connexion réussie - Heure serveur: ${result.rows[0].now}`);
    client.release();

    // Lecture du fichier de schéma
    const schemaPath = join(__dirname, '../../..', 'database', 'init.sql');
    console.log(`📖 Lecture du schéma depuis: ${schemaPath}`);
    const schema = readFileSync(schemaPath, 'utf8');

    // Exécution du schéma
    console.log('📊 Création du schéma de base de données...');
    await pool.query(schema);
    console.log('✅ Schéma créé avec succès !');

    // Vérification des tables créées
    console.log('🔍 Vérification des tables créées...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📋 Tables créées:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('');
    console.log('🎉 Base de données Neon configurée avec succès !');
    console.log('');
    console.log('📌 Prochaines étapes:');
    console.log('1. Copie ton DATABASE_URL Neon dans backend/.env');
    console.log('2. Lance l\'application avec: npm run dev');
    console.log('3. Optionnel: Génère des profils de test avec: npm run seed:500');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécution du script
if (require.main === module) {
  setupNeonDatabase().catch(console.error);
}

export { setupNeonDatabase };
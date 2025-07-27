import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Configuration pour la base locale (Docker)
const localPool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'matcha_db',
  user: 'matcha_user',
  password: 'matcha_password'
});

// Configuration pour Neon (pour copier les données)
const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function setupLocalDatabase(): Promise<void> {
  console.log('🚀 Configuration de la base PostgreSQL locale avec les données Neon...');
  
  const localClient = await localPool.connect();
  const neonClient = await neonPool.connect();
  
  try {
    // 1. Appliquer le nouveau schéma avec les tables manquantes
    console.log('📊 Application du nouveau schéma...');
    
    const schemaPath = path.join(__dirname, '../../../database/init.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    await localClient.query(schemaSQL);
    console.log('✅ Schéma appliqué avec succès');
    
    // 2. Copier les utilisateurs de Neon vers local
    console.log('👥 Copie des utilisateurs depuis Neon...');
    
    const usersResult = await neonClient.query(`
      SELECT id, username, email, first_name, last_name, password_hash, 
             is_verified, verification_token, verification_token_expires,
             reset_password_token, reset_password_expires, last_seen, 
             created_at, updated_at
      FROM users 
      WHERE is_verified = true 
      ORDER BY id
    `);
    
    for (const user of usersResult.rows) {
      try {
        await localClient.query(`
          INSERT INTO users (id, username, email, first_name, last_name, password_hash, 
                           is_verified, verification_token, verification_token_expires,
                           reset_password_token, reset_password_expires, last_seen, 
                           created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            is_verified = EXCLUDED.is_verified
        `, [
          user.id, user.username, user.email, user.first_name, user.last_name,
          user.password_hash, user.is_verified, user.verification_token,
          user.verification_token_expires, user.reset_password_token,
          user.reset_password_expires, user.last_seen, user.created_at, user.updated_at
        ]);
      } catch (error) {
        console.warn(`⚠️ Erreur utilisateur ${user.id}:`, error);
      }
    }
    
    console.log(`✅ ${usersResult.rows.length} utilisateurs copiés`);
    
    // 3. Copier les profils
    console.log('📋 Copie des profils...');
    
    const profilesResult = await neonClient.query(`
      SELECT user_id, biography, age, gender, sexual_orientation, interests,
             city, location_lat, location_lng, fame_rating, iscomplete,
             created_at, updated_at
      FROM profiles 
      WHERE iscomplete = true
      ORDER BY user_id
    `);
    
    for (const profile of profilesResult.rows) {
      try {
        await localClient.query(`
          INSERT INTO profiles (user_id, biography, age, gender, sexual_orientation, interests,
                              city, location_lat, location_lng, fame_rating, iscomplete,
                              created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (user_id) DO UPDATE SET
            biography = EXCLUDED.biography,
            age = EXCLUDED.age,
            gender = EXCLUDED.gender,
            sexual_orientation = EXCLUDED.sexual_orientation,
            interests = EXCLUDED.interests,
            city = EXCLUDED.city,
            location_lat = EXCLUDED.location_lat,
            location_lng = EXCLUDED.location_lng,
            iscomplete = EXCLUDED.iscomplete
        `, [
          profile.user_id, profile.biography, profile.age, profile.gender,
          profile.sexual_orientation, profile.interests, profile.city,
          profile.location_lat, profile.location_lng, profile.fame_rating,
          profile.iscomplete, profile.created_at, profile.updated_at
        ]);
      } catch (error) {
        console.warn(`⚠️ Erreur profil ${profile.user_id}:`, error);
      }
    }
    
    console.log(`✅ ${profilesResult.rows.length} profils copiés`);
    
    // 4. Copier les photos
    console.log('📸 Copie des photos...');
    
    const photosResult = await neonClient.query(`
      SELECT user_id, filename, image_data, mime_type, is_profile_picture, upload_date
      FROM photos 
      ORDER BY user_id, is_profile_picture DESC
    `);
    
    for (const photo of photosResult.rows) {
      try {
        await localClient.query(`
          INSERT INTO photos (user_id, filename, image_data, mime_type, is_profile_picture, upload_date)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (user_id, filename) DO NOTHING
        `, [
          photo.user_id, photo.filename, photo.image_data, photo.mime_type,
          photo.is_profile_picture, photo.upload_date
        ]);
      } catch (error) {
        console.warn(`⚠️ Erreur photo ${photo.filename}:`, error);
      }
    }
    
    console.log(`✅ ${photosResult.rows.length} photos copiées`);
    
    // 5. Mettre à jour les séquences
    console.log('🔧 Mise à jour des séquences...');
    
    const maxUserId = await localClient.query('SELECT MAX(id) as max_id FROM users');
    const maxPhotoId = await localClient.query('SELECT MAX(id) as max_id FROM photos');
    
    if (maxUserId.rows[0].max_id) {
      await localClient.query(`SELECT setval('users_id_seq', ${maxUserId.rows[0].max_id}, true)`);
    }
    
    if (maxPhotoId.rows[0].max_id) {
      await localClient.query(`SELECT setval('photos_id_seq', ${maxPhotoId.rows[0].max_id}, true)`);
    }
    
    console.log('✅ Séquences mises à jour');
    
    // 6. Vérification finale
    const userCount = await localClient.query('SELECT COUNT(*) as count FROM users WHERE is_verified = true');
    const profileCount = await localClient.query('SELECT COUNT(*) as count FROM profiles WHERE iscomplete = true');
    const photoCount = await localClient.query('SELECT COUNT(*) as count FROM photos');
    
    console.log('\n🎉 Configuration terminée !');
    console.log(`📊 Statistiques finales:`);
    console.log(`   👥 Utilisateurs: ${userCount.rows[0].count}`);
    console.log(`   📋 Profils: ${profileCount.rows[0].count}`);
    console.log(`   📸 Photos: ${photoCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    localClient.release();
    neonClient.release();
  }
}

// Lancer la configuration si ce script est exécuté directement
if (require.main === module) {
  setupLocalDatabase()
    .then(() => {
      console.log('\n✅ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur script:', error);
      process.exit(1);
    });
}

export { setupLocalDatabase };
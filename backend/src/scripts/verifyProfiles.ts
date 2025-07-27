import dotenv from 'dotenv';
dotenv.config();

import pool from '../config/database';

// Fonction pour vérifier l'état des profils
async function verifyProfiles(): Promise<void> {
  console.log(`🔍 Vérification des profils dans la base de données Neon...`);
  
  const client = await pool.connect();
  
  try {
    // Statistiques générales
    console.log('\n📊 Statistiques générales:');
    
    const totalUsersQuery = 'SELECT COUNT(*) as total FROM users WHERE is_verified = true';
    const totalUsersResult = await client.query(totalUsersQuery);
    console.log(`   👥 Utilisateurs vérifiés: ${totalUsersResult.rows[0]?.total || 0}`);
    
    const totalProfilesQuery = 'SELECT COUNT(*) as total FROM profiles WHERE iscomplete = true';
    const totalProfilesResult = await client.query(totalProfilesQuery);
    console.log(`   📋 Profils complets: ${totalProfilesResult.rows[0]?.total || 0}`);
    
    const totalPhotosQuery = 'SELECT COUNT(*) as total FROM photos';
    const totalPhotosResult = await client.query(totalPhotosQuery);
    console.log(`   📸 Photos: ${totalPhotosResult.rows[0]?.total || 0}`);
    
    // Répartition par genre
    console.log('\n👫 Répartition par genre:');
    const genderQuery = `
      SELECT 
        gender,
        COUNT(*) as count,
        ROUND(AVG(age), 1) as avg_age
      FROM profiles 
      WHERE iscomplete = true 
      GROUP BY gender
      ORDER BY gender
    `;
    const genderResult = await client.query(genderQuery);
    genderResult.rows.forEach(row => {
      console.log(`   ${row.gender}: ${row.count} profils (âge moyen: ${row.avg_age} ans)`);
    });
    
    // Répartition par orientation
    console.log('\n🏳️‍🌈 Répartition par orientation:');
    const orientationQuery = `
      SELECT 
        sexual_orientation,
        COUNT(*) as count
      FROM profiles 
      WHERE iscomplete = true 
      GROUP BY sexual_orientation
      ORDER BY count DESC
    `;
    const orientationResult = await client.query(orientationQuery);
    orientationResult.rows.forEach(row => {
      console.log(`   ${row.sexual_orientation}: ${row.count} profils`);
    });
    
    // Répartition géographique
    console.log('\n🗺️ Répartition géographique:');
    const cityQuery = `
      SELECT 
        city,
        COUNT(*) as count
      FROM profiles 
      WHERE iscomplete = true AND city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC
      LIMIT 8
    `;
    const cityResult = await client.query(cityQuery);
    cityResult.rows.forEach(row => {
      console.log(`   ${row.city}: ${row.count} profils`);
    });
    
    // Photos par profil
    console.log('\n📸 Statistiques photos:');
    const photosStatsQuery = `
      SELECT 
        COUNT(DISTINCT user_id) as users_with_photos,
        COUNT(*) as total_photos,
        ROUND(AVG(photos_per_user), 1) as avg_photos_per_user
      FROM (
        SELECT user_id, COUNT(*) as photos_per_user
        FROM photos
        GROUP BY user_id
      ) subquery
    `;
    const photosStatsResult = await client.query(photosStatsQuery);
    const photoStats = photosStatsResult.rows[0];
    console.log(`   👥 Utilisateurs avec photos: ${photoStats?.users_with_photos || 0}`);
    console.log(`   📸 Total photos: ${photoStats?.total_photos || 0}`);
    console.log(`   📊 Moyenne photos/utilisateur: ${photoStats?.avg_photos_per_user || 0}`);
    
    // Photos de profil
    const profilePicsQuery = 'SELECT COUNT(*) as total FROM photos WHERE is_profile_picture = true';
    const profilePicsResult = await client.query(profilePicsQuery);
    console.log(`   🖼️ Photos de profil: ${profilePicsResult.rows[0]?.total || 0}`);
    
    // Exemples de profils complets
    console.log('\n👤 Exemples de profils:');
    const examplesQuery = `
      SELECT 
        u.first_name,
        u.last_name,
        p.age,
        p.gender,
        p.sexual_orientation,
        p.city,
        array_length(p.interests, 1) as interests_count,
        (SELECT COUNT(*) FROM photos ph WHERE ph.user_id = u.id) as photo_count
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE p.iscomplete = true
      ORDER BY u.id
      LIMIT 5
    `;
    const examplesResult = await client.query(examplesQuery);
    examplesResult.rows.forEach(row => {
      console.log(`   ${row.first_name} ${row.last_name}, ${row.age} ans, ${row.gender}, ${row.sexual_orientation}`);
      console.log(`     📍 ${row.city}, 🎯 ${row.interests_count} intérêts, 📸 ${row.photo_count} photos`);
    });
    
    // Vérification de l'intégrité
    console.log('\n✅ Vérifications d\'intégrité:');
    
    const integrityChecks = [
      {
        name: 'Utilisateurs sans profil',
        query: 'SELECT COUNT(*) as count FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE p.user_id IS NULL'
      },
      {
        name: 'Profils sans utilisateur',
        query: 'SELECT COUNT(*) as count FROM profiles p LEFT JOIN users u ON p.user_id = u.id WHERE u.id IS NULL'
      },
      {
        name: 'Photos sans utilisateur',
        query: 'SELECT COUNT(*) as count FROM photos ph LEFT JOIN users u ON ph.user_id = u.id WHERE u.id IS NULL'
      },
      {
        name: 'Utilisateurs avec profil incomplet',
        query: 'SELECT COUNT(*) as count FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.is_verified = true AND p.iscomplete = false'
      }
    ];
    
    for (const check of integrityChecks) {
      const result = await client.query(check.query);
      const count = result.rows[0]?.count || 0;
      const status = count === 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${check.name}: ${count}`);
    }
    
    console.log('\n🎉 Vérification terminée !');
    
  } catch (error) {
    console.error('❌ Erreur vérification:', error);
  } finally {
    client.release();
  }
}

// Lancer la vérification si ce script est exécuté directement
if (require.main === module) {
  verifyProfiles()
    .then(() => {
      console.log('\n✅ Script de vérification terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur script:', error);
      process.exit(1);
    });
}

export { verifyProfiles };
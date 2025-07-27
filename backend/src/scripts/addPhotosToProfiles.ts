import dotenv from 'dotenv';
dotenv.config();

import pool from '../config/database';
import fetch from 'node-fetch';

// Configuration des API d'images
const IMAGE_APIS = {
  PICSUM: 'https://picsum.photos'
};

// Fonction pour télécharger une image depuis une URL
async function downloadImage(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');
    
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Erreur téléchargement image:', error);
    throw error;
  }
}

// Fonction pour obtenir une photo de profil
async function getProfilePhoto(userId: number, photoIndex: number): Promise<string> {
  try {
    // Utiliser Picsum avec des dimensions pour portraits et un seed unique
    const seed = userId * 10 + photoIndex;
    const url = `${IMAGE_APIS.PICSUM}/400/500?random=${seed}`;
    
    const imageData = await downloadImage(url);
    return imageData;
  } catch (error) {
    console.error('Erreur obtention photo:', error);
    throw error;
  }
}

// Fonction pour ajouter des photos aux profils existants
async function addPhotosToProfiles(): Promise<void> {
  console.log(`🚀 Ajout de photos aux profils existants...`);
  
  const client = await pool.connect();
  
  try {
    // Récupérer tous les profils qui n'ont pas encore de photos
    const profilesQuery = `
      SELECT u.id as user_id, u.first_name, u.last_name, p.gender
      FROM users u 
      JOIN profiles p ON u.id = p.user_id 
      WHERE p.iscomplete = true 
      AND u.id NOT IN (SELECT DISTINCT user_id FROM photos)
      ORDER BY u.id
    `;
    
    const profilesResult = await client.query(profilesQuery);
    const profiles = profilesResult.rows;
    
    console.log(`📋 ${profiles.length} profils sans photos trouvés`);
    
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      console.log(`\n📸 Ajout photos pour ${profile.first_name} ${profile.last_name} (${i + 1}/${profiles.length})`);
      
      try {
        // Ajouter 2-3 photos par profil
        const photosCount = Math.floor(Math.random() * 2) + 2; // 2 ou 3 photos
        
        for (let photoIndex = 0; photoIndex < photosCount; photoIndex++) {
          try {
            const imageData = await getProfilePhoto(profile.user_id, photoIndex);
            const filename = `profile-${profile.user_id}-${photoIndex}-${Date.now()}.jpg`;
            const isProfilePicture = photoIndex === 0; // La première photo est la photo de profil
            
            await client.query(
              'INSERT INTO photos (user_id, filename, image_data, is_profile_picture, mime_type) VALUES ($1, $2, $3, $4, $5)',
              [profile.user_id, filename, imageData, isProfilePicture, 'image/jpeg']
            );
            
            console.log(`  ✅ Photo ${photoIndex + 1}/${photosCount} ajoutée`);
            
            // Attendre un peu entre chaque téléchargement
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`  ❌ Erreur photo ${photoIndex + 1}:`, error);
          }
        }
        
        console.log(`✅ Photos ajoutées pour ${profile.first_name} ${profile.last_name}`);
        
      } catch (error) {
        console.error(`❌ Erreur profil ${profile.first_name} ${profile.last_name}:`, error);
      }
      
      // Attendre entre chaque profil
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Vérifier le résultat
    const photosCountQuery = 'SELECT COUNT(*) as total FROM photos';
    const photosCountResult = await client.query(photosCountQuery);
    const totalPhotos = photosCountResult.rows[0]?.total || 0;
    
    console.log(`\n🎉 Ajout de photos terminé !`);
    console.log(`📊 Total des photos dans la DB: ${totalPhotos}`);
    
    // Statistiques par utilisateur
    const statsQuery = `
      SELECT 
        u.first_name,
        u.last_name,
        COUNT(ph.id) as photo_count,
        SUM(CASE WHEN ph.is_profile_picture THEN 1 ELSE 0 END) as profile_pics
      FROM users u 
      JOIN profiles p ON u.id = p.user_id 
      LEFT JOIN photos ph ON u.id = ph.user_id
      WHERE p.iscomplete = true 
      GROUP BY u.id, u.first_name, u.last_name
      HAVING COUNT(ph.id) > 0
      ORDER BY u.first_name
      LIMIT 5
    `;
    const statsResult = await client.query(statsQuery);
    
    console.log(`\n📈 Exemples de profils avec photos:`);
    statsResult.rows.forEach(row => {
      console.log(`   ${row.first_name} ${row.last_name}: ${row.photo_count} photos (${row.profile_pics} photo de profil)`);
    });
    
  } catch (error) {
    console.error('❌ Erreur ajout photos:', error);
  } finally {
    client.release();
  }
}

// Lancer l'ajout de photos si ce script est exécuté directement
if (require.main === module) {
  addPhotosToProfiles()
    .then(() => {
      console.log('\n✅ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur script:', error);
      process.exit(1);
    });
}

export { addPhotosToProfiles };
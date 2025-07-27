import dotenv from 'dotenv';
dotenv.config();

import { UserModel } from '../models/User';
import pool from '../config/database';
import crypto from 'crypto';

// Noms français réalistes
const FIRST_NAMES = {
  homme: [
    'Alexandre', 'Antoine', 'Arthur', 'Baptiste', 'Benjamin', 'Clément', 'Damien',
    'David', 'Fabien', 'Gabriel', 'Hugo', 'Julien', 'Lucas', 'Marc',
    'Maxime', 'Nicolas', 'Olivier', 'Paul', 'Pierre', 'Quentin', 'Raphaël',
    'Thomas', 'Valentin', 'Xavier'
  ],
  femme: [
    'Amélie', 'Anaïs', 'Camille', 'Céline', 'Charlotte', 'Chloé', 'Claire', 'Émilie',
    'Emma', 'Jade', 'Julie', 'Léa', 'Manon', 'Marie', 'Mathilde', 'Océane',
    'Pauline', 'Sarah', 'Sophie', 'Stella', 'Zoé', 'Inès', 'Laura', 'Lucie'
  ]
};

const LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
  'Leroy', 'Moreau', 'Simon', 'Laurent', 'Michel', 'Garcia', 'David',
  'Bertrand', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier'
];

// Villes françaises
const CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier',
  'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Tours', 'Angers', 'Grenoble', 'Dijon'
];

// Centres d'intérêt
const INTERESTS = [
  'Musique', 'Cinéma', 'Lecture', 'Sport', 'Gaming', 'Art', 'Cuisine', 'Voyages', 
  'Photo', 'Théâtre', 'Natation', 'Cyclisme', 'Randonnée', 'Guitare', 'Piano', 
  'Danse', 'Yoga', 'Jardinage', 'Animaux', 'Basketball', 'Football', 'Tennis'
];

// Templates de biographies
const BIO_TEMPLATES = {
  homme: [
    "Passionné de {interest1} et {interest2}, j'aime découvrir de nouveaux horizons.",
    "Amateur de {interest1}, je recherche quelqu'un avec qui partager ma passion pour {interest2}.",
    "Sportif dans l'âme, j'adore {interest1} et {interest2}. À la recherche d'une complicité sincère.",
    "Curieux de nature, j'aime {interest1} et {interest2}. Prêt à vivre de nouvelles aventures !",
    "Entre {interest1} et {interest2}, je trouve mon équilibre. Envie de partager ça avec quelqu'un de spécial."
  ],
  femme: [
    "Amoureuse de {interest1} et {interest2}, je cherche quelqu'un pour partager mes passions.",
    "Passionnée par {interest1} et {interest2}, j'aime la spontanéité et les discussions profondes.",
    "Entre {interest1} et {interest2}, je trouve mon bonheur. À la recherche d'une belle complicité.",
    "Curieuse et aventurière, j'adore {interest1} et {interest2}. Prête pour de nouvelles découvertes !",
    "Créative et pétillante, passionnée de {interest1} et {interest2}, je cherche l'âme sœur."
  ]
};

// Fonction pour générer une biographie
function generateBiography(gender: 'homme' | 'femme', interests: string[]): string {
  const templates = BIO_TEMPLATES[gender];
  const template = templates[Math.floor(Math.random() * templates.length)] || templates[0];
  
  const shuffledInterests = [...interests].sort(() => 0.5 - Math.random());
  
  return template!
    .replace('{interest1}', shuffledInterests[0]?.toLowerCase() || 'la musique')
    .replace('{interest2}', shuffledInterests[1]?.toLowerCase() || 'le cinéma');
}

// Fonction pour générer des coordonnées GPS autour de Paris
function generateParisCoordinates() {
  const parisLat = 48.8566;
  const parisLng = 2.3522;
  
  // Rayon d'environ 30km autour de Paris
  const radius = 0.3;
  
  const lat = parisLat + (Math.random() - 0.5) * radius;
  const lng = parisLng + (Math.random() - 0.5) * radius;
  
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

// Fonction principale pour générer des profils de test
async function generateTestProfiles(count: number = 20): Promise<void> {
  console.log(`🚀 Génération de ${count} profils de test pour Neon DB...`);
  
  const client = await pool.connect();
  
  try {
    for (let i = 0; i < count; i++) {
      const gender = Math.random() > 0.5 ? 'homme' : 'femme';
      const firstNameArray = FIRST_NAMES[gender];
      const firstName = firstNameArray[Math.floor(Math.random() * firstNameArray.length)] || 'Test';
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)] || 'User';
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
      const email = `${username}@example.com`;
      
      console.log(`\n👤 Création du profil ${i + 1}/${count}: ${firstName} ${lastName} (${gender})`);
      
      try {
        // Créer l'utilisateur
        const user = await UserModel.create({
          email: email,
          username: username,
          password: 'TempPassword123!',
          first_name: firstName,
          last_name: lastName
        });
        
        // Vérifier automatiquement l'utilisateur
        await UserModel.verifyAccount(user.verification_token!);
        console.log(`✅ Utilisateur créé et vérifié: ${user.id}`);
        
        // Générer des intérêts aléatoires
        const shuffledInterests = [...INTERESTS].sort(() => 0.5 - Math.random());
        const userInterests = shuffledInterests.slice(0, Math.floor(Math.random() * 4) + 3); // 3-6 intérêts
        
        // Générer une biographie
        const biography = generateBiography(gender, userInterests);
        
        // Générer des coordonnées GPS
        const coordinates = generateParisCoordinates();
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        
        // Age aléatoire entre 20 et 45 ans
        const age = Math.floor(Math.random() * 26) + 20;
        
        // Orientation sexuelle aléatoire avec probabilités réalistes
        const orientations = ['hetero', 'hetero', 'hetero', 'hetero', 'hetero', 'hetero', 'bi', 'homo'];
        const sexual_orientation = orientations[Math.floor(Math.random() * orientations.length)];
        
        // Créer le profil directement avec une requête SQL pour éviter les problèmes de casse
        const profileQuery = `
          UPDATE profiles 
          SET 
            biography = $1,
            age = $2,
            gender = $3,
            sexual_orientation = $4,
            interests = $5,
            city = $6,
            location_lat = $7,
            location_lng = $8,
            iscomplete = $9,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $10
          RETURNING id
        `;
        
        const profileResult = await client.query(profileQuery, [
          biography,
          age,
          gender,
          sexual_orientation,
          userInterests,
          city,
          coordinates.lat,
          coordinates.lng,
          true, // iscomplete = true
          user.id
        ]);
        
        if (profileResult.rows.length > 0) {
          console.log(`✅ Profil complet créé pour ${firstName} ${lastName}`);
          console.log(`   📍 ${city} (${coordinates.lat}, ${coordinates.lng})`);
          console.log(`   🎯 Intérêts: ${userInterests.slice(0, 3).join(', ')}...`);
          console.log(`   👤 ${age} ans, ${gender}, ${sexual_orientation}`);
        } else {
          console.error(`❌ Échec création profil pour ${firstName} ${lastName}`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur création profil ${i + 1}:`, error);
      }
      
      // Petite pause pour éviter de surcharger la DB
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Vérifier le nombre de profils créés
    const countQuery = 'SELECT COUNT(*) as total FROM profiles WHERE iscomplete = true';
    const countResult = await client.query(countQuery);
    const totalProfiles = countResult.rows[0]?.total || 0;
    
    console.log(`\n🎉 Génération terminée !`);
    console.log(`📊 Total des profils complets dans la DB: ${totalProfiles}`);
    
    // Afficher quelques statistiques
    const statsQuery = `
      SELECT 
        gender,
        COUNT(*) as count,
        ROUND(AVG(age), 1) as avg_age
      FROM profiles 
      WHERE iscomplete = true 
      GROUP BY gender
    `;
    const statsResult = await client.query(statsQuery);
    
    console.log(`\n📈 Statistiques:`);
    statsResult.rows.forEach(row => {
      console.log(`   ${row.gender}: ${row.count} profils (âge moyen: ${row.avg_age} ans)`);
    });
    
  } catch (error) {
    console.error('❌ Erreur génération profils:', error);
  } finally {
    client.release();
  }
}

// Lancer la génération si ce script est exécuté directement
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 20;
  generateTestProfiles(count)
    .then(() => {
      console.log('\n✅ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur script:', error);
      process.exit(1);
    });
}

export { generateTestProfiles };
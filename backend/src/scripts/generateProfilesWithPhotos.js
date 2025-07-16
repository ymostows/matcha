// Configuration dotenv optionnelle
try {
  const dotenv = require('dotenv');
  dotenv.config();
} catch (e) {
  console.warn('Dotenv not available, using environment variables directly');
}

const { UserModel } = require('../models/User.ts');
const { ProfileModel } = require('../models/Profile.ts');
const pool = require('../config/database.ts');
const fetch = require('node-fetch');

// Configuration
const PROFILE_CONFIG = {
  defaultPhotoCount: 3,
  maxRetries: 3,
  delayBetweenProfiles: 1000,
  delayBetweenPhotos: 500
};

// Données de test
const FIRST_NAMES = {
  homme: [
    'Alexandre', 'Antoine', 'Arthur', 'Aurélien', 'Baptiste', 'Benjamin', 'Clément', 'Damien',
    'David', 'Émile', 'Fabien', 'Gabriel', 'Hugo', 'Julien', 'Kévin', 'Lucas', 'Marc',
    'Maxime', 'Nicolas', 'Olivier', 'Paul', 'Pierre', 'Quentin', 'Raphaël', 'Sébastien',
    'Thomas', 'Valentin', 'Xavier', 'Yann', 'Zacharie'
  ],
  femme: [
    'Amélie', 'Anaïs', 'Camille', 'Céline', 'Charlotte', 'Chloé', 'Claire', 'Émilie',
    'Emma', 'Jade', 'Julie', 'Léa', 'Léna', 'Manon', 'Marie', 'Mathilde', 'Océane',
    'Pauline', 'Sarah', 'Sophie', 'Stella', 'Zoé', 'Inès', 'Laura', 'Lucie', 'Nadia',
    'Nathalie', 'Noémie', 'Romane', 'Victoire'
  ]
};

const LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
  'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
  'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefèvre',
  'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez'
];

const CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier',
  'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon',
  'Angers', 'Grenoble', 'Dijon', 'Nîmes', 'Aix-en-Provence', 'Brest', 'Le Mans',
  'Amiens', 'Tours', 'Limoges', 'Clermont-Ferrand', 'Villeurbanne', 'Besançon'
];

const INTERESTS = [
  '🎵 Musique', '🎬 Cinéma', '📚 Lecture', '🏃‍♂️ Sport', '🎯 Gaming', '🎨 Art',
  '🍳 Cuisine', '✈️ Voyages', '📸 Photo', '🎭 Théâtre', '🏊‍♀️ Natation', '🚴‍♂️ Cyclisme',
  '🏔️ Randonnée', '🎸 Guitare', '🎹 Piano', '💃 Danse', '🧘‍♀️ Yoga', '🌱 Jardinage',
  '🐕 Animaux', '🍷 Œnologie', '🏄‍♂️ Surf', '🎪 Cirque', '🎮 Esport', '🔬 Sciences',
  '📝 Écriture', '🎤 Karaoké', '🏀 Basketball', '⚽ Football', '🎾 Tennis', '🏐 Volleyball'
];

const BIO_TEMPLATES = {
  homme: [
    "Passionné de {interest1} et {interest2}, j'aime découvrir de nouveaux horizons et partager des moments authentiques.",
    "Amateur de {interest1}, je recherche quelqu'un avec qui partager ma passion pour {interest2} et la vie en général.",
    "Sportif dans l'âme, j'adore {interest1} et {interest2}. À la recherche d'une complicité sincère.",
    "Curieux de nature, j'aime {interest1} et {interest2}. Prêt à vivre de nouvelles aventures !",
    "Entre {interest1} et {interest2}, je trouve mon équilibre. Envie de partager ça avec quelqu'un de spécial.",
    "Épicurien passionné de {interest1} et {interest2}, je cherche une âme sœur pour des moments inoubliables."
  ],
  femme: [
    "Amoureuse de {interest1} et {interest2}, je cherche quelqu'un pour partager mes passions et créer de beaux souvenirs.",
    "Passionnée par {interest1} et {interest2}, j'aime la spontanéité et les discussions profondes.",
    "Entre {interest1} et {interest2}, je trouve mon bonheur. À la recherche d'une belle complicité.",
    "Curieuse et aventurière, j'adore {interest1} et {interest2}. Prête pour de nouvelles découvertes !",
    "Épicurienne dans l'âme, j'aime {interest1} et {interest2}. Envie de partager ça avec la bonne personne.",
    "Créative et pétillante, passionnée de {interest1} et {interest2}, je cherche l'âme sœur."
  ]
};

// Fonction pour générer un placeholder SVG
function generatePlaceholderSVG(firstName, lastName, gender) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  const backgroundColor = gender === 'homme' ? '#3B82F6' : '#EF4444';
  const secondaryColor = gender === 'homme' ? '#1E40AF' : '#DC2626';
  
  return `
    <svg width="400" height="500" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#grad)"/>
      <circle cx="200" cy="150" r="80" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
      <text x="200" y="170" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">${initials}</text>
      <rect x="50" y="300" width="300" height="120" rx="10" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="200" y="340" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">${firstName}</text>
      <text x="200" y="370" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.8)" text-anchor="middle">${lastName}</text>
      <text x="200" y="400" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.6)" text-anchor="middle">Photo de profil</text>
    </svg>
  `;
}

// Fonction pour créer une photo placeholder
function createPlaceholderPhoto(firstName, lastName, gender, photoIndex) {
  const svg = generatePlaceholderSVG(firstName, lastName, gender);
  const base64SVG = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64SVG}`;
}

// Fonction pour essayer d'obtenir une photo depuis une API externe
async function tryGetExternalPhoto(url) {
  try {
    const response = await fetch(url, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.warn(`API externe échouée (${url}):`, error.message);
    return null;
  }
}

// Fonction pour obtenir une photo avec fallback
async function getPhotoWithFallback(firstName, lastName, gender, photoIndex) {
  // Liste des APIs à essayer
  const externalSources = [
    `https://picsum.photos/400/500?random=${Date.now()}-${photoIndex}`,
    `https://picsum.photos/400/500?random=${firstName}-${lastName}-${photoIndex}`
  ];
  
  // Essayer les sources externes
  for (const source of externalSources) {
    const photo = await tryGetExternalPhoto(source);
    if (photo) {
      console.log(`✅ Photo externe obtenue: ${source}`);
      return photo;
    }
  }
  
  // Fallback: utiliser un placeholder SVG
  console.log(`⚠️ Utilisation d'un placeholder pour ${firstName} ${lastName}`);
  return createPlaceholderPhoto(firstName, lastName, gender, photoIndex);
}

// Fonction pour créer des photos pour un utilisateur
async function createPhotosForUser(userId, firstName, lastName, gender, photoCount = 3) {
  const client = await pool.connect();
  
  try {
    for (let i = 0; i < photoCount; i++) {
      try {
        console.log(`📸 Génération photo ${i + 1}/${photoCount} pour ${firstName} ${lastName}...`);
        
        const imageData = await getPhotoWithFallback(firstName, lastName, gender, i);
        const filename = `profile-${userId}-${i + 1}-${Date.now()}.jpg`;
        const isProfilePicture = i === 0;
        const mimeType = imageData.startsWith('data:image/svg+xml') ? 'image/svg+xml' : 'image/jpeg';
        
        await client.query(
          'INSERT INTO photos (user_id, filename, image_data, mime_type, is_profile_picture) VALUES ($1, $2, $3, $4, $5)',
          [userId, filename, imageData, mimeType, isProfilePicture]
        );
        
        console.log(`✅ Photo ${i + 1}/${photoCount} créée${isProfilePicture ? ' (photo de profil)' : ''}`);
        
        // Petit délai entre les photos
        await new Promise(resolve => setTimeout(resolve, PROFILE_CONFIG.delayBetweenPhotos));
      } catch (error) {
        console.error(`❌ Erreur photo ${i + 1}:`, error);
        
        // En cas d'erreur, créer au moins un placeholder
        if (i === 0) {
          const placeholderData = createPlaceholderPhoto(firstName, lastName, gender, i);
          const filename = `placeholder-${userId}-${i + 1}-${Date.now()}.svg`;
          
          await client.query(
            'INSERT INTO photos (user_id, filename, image_data, mime_type, is_profile_picture) VALUES ($1, $2, $3, $4, $5)',
            [userId, filename, placeholderData, 'image/svg+xml', true]
          );
          
          console.log(`⚠️ Placeholder créé pour la photo de profil`);
        }
      }
    }
  } finally {
    client.release();
  }
}

// Fonction pour générer une biographie
function generateBiography(gender, interests) {
  const templates = BIO_TEMPLATES[gender];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  const shuffledInterests = [...interests].sort(() => 0.5 - Math.random());
  
  return template
    .replace('{interest1}', shuffledInterests[0]?.toLowerCase() || 'la musique')
    .replace('{interest2}', shuffledInterests[1]?.toLowerCase() || 'le cinéma');
}

// Fonction pour générer des coordonnées GPS autour de Paris
function generateParisCoordinates() {
  const parisLat = 48.8566;
  const parisLng = 2.3522;
  const radius = 0.5; // ~50km autour de Paris
  
  const lat = parisLat + (Math.random() - 0.5) * radius;
  const lng = parisLng + (Math.random() - 0.5) * radius;
  
  return { lat, lng };
}

// Fonction principale pour générer des profils avec photos
async function generateProfilesWithPhotos(count = 10) {
  console.log(`🚀 Génération de ${count} profils avec photos fonctionnelles...`);
  
  try {
    for (let i = 0; i < count; i++) {
      const gender = Math.random() > 0.5 ? 'homme' : 'femme';
      const firstName = FIRST_NAMES[gender][Math.floor(Math.random() * FIRST_NAMES[gender].length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
      const email = `${username}@example.com`;
      
      console.log(`\n👤 Création du profil ${i + 1}/${count}: ${firstName} ${lastName} (${gender})`);
      
      try {
        // Créer l'utilisateur
        const user = await UserModel.create({
          email,
          username,
          password: 'TempPassword123!',
          first_name: firstName,
          last_name: lastName
        });
        
        // Vérifier automatiquement l'utilisateur
        await UserModel.verifyAccount(user.verification_token);
        
        // Générer des intérêts aléatoires
        const shuffledInterests = [...INTERESTS].sort(() => 0.5 - Math.random());
        const userInterests = shuffledInterests.slice(0, Math.floor(Math.random() * 5) + 3);
        
        // Générer une biographie
        const biography = generateBiography(gender, userInterests);
        
        // Générer des coordonnées GPS
        const coordinates = generateParisCoordinates();
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        
        // Créer le profil
        const orientations = ['bi', 'hetero', 'homo'];
        const sexual_orientation = orientations[Math.floor(Math.random() * orientations.length)];
        
        const profileData = {
          biography,
          age: Math.floor(Math.random() * 25) + 20,
          gender,
          sexual_orientation,
          interests: userInterests,
          city
        };
        
        await ProfileModel.createOrUpdate(user.id, profileData);
        
        // Mettre à jour les coordonnées GPS
        await pool.query(
          'UPDATE profiles SET location_lat = $1, location_lng = $2 WHERE user_id = $3',
          [coordinates.lat, coordinates.lng, user.id]
        );
        
        console.log(`✅ Profil créé: ${firstName} ${lastName} à ${city}`);
        console.log(`🎯 Intérêts: ${userInterests.join(', ')}`);
        
        // Créer les photos avec fallback
        await createPhotosForUser(user.id, firstName, lastName, gender, PROFILE_CONFIG.defaultPhotoCount);
        
        console.log(`🎉 Profil ${firstName} ${lastName} terminé avec photos !`);
        
      } catch (error) {
        console.error(`❌ Erreur création profil ${i + 1}:`, error);
      }
      
      // Délai entre les profils
      await new Promise(resolve => setTimeout(resolve, PROFILE_CONFIG.delayBetweenProfiles));
    }
    
    console.log(`\n🎊 Génération terminée ! ${count} profils créés avec photos fonctionnelles.`);
    
  } catch (error) {
    console.error('❌ Erreur génération profils:', error);
  }
}

// Lancer la génération si ce script est exécuté directement
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 10;
  generateProfilesWithPhotos(count)
    .then(() => {
      console.log('\n✨ Génération terminée avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { generateProfilesWithPhotos };
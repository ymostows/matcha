require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Configuration base de données
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  database: process.env.DB_NAME || 'matcha_db',
  user: process.env.DB_USER || 'matcha_user',
  password: process.env.DB_PASSWORD || 'matcha_password',
});

// Données pour les profils
const PROFILE_DATA = {
  homme: {
    names: [
      { first: 'Alexandre', last: 'Dubois' },
      { first: 'Antoine', last: 'Martin' },
      { first: 'Arthur', last: 'Leroy' },
      { first: 'Baptiste', last: 'Bernard' },
      { first: 'Benjamin', last: 'Petit' },
      { first: 'Clément', last: 'Durand' },
      { first: 'Damien', last: 'Moreau' },
      { first: 'David', last: 'Simon' },
      { first: 'Émile', last: 'Laurent' },
      { first: 'Fabien', last: 'Lefebvre' }
    ],
    bios: [
      "Passionné de voyages et de découvertes, j'adore partager des moments authentiques.",
      "Amateur de sport et de bonne cuisine, toujours prêt pour de nouvelles aventures.",
      "Créatif dans l'âme, entre art et musique, je cherche quelqu'un pour partager ma passion.",
      "Épicurien et optimiste, j'aime les discussions profondes et les moments simples.",
      "Sportif et aventurier, j'aime explorer le monde et rencontrer des personnes inspirantes."
    ]
  },
  femme: {
    names: [
      { first: 'Amélie', last: 'Dupont' },
      { first: 'Camille', last: 'Lambert' },
      { first: 'Charlotte', last: 'Rousseau' },
      { first: 'Émilie', last: 'Faure' },
      { first: 'Emma', last: 'Blanchard' },
      { first: 'Jade', last: 'Joly' },
      { first: 'Julie', last: 'Gaillard' },
      { first: 'Léa', last: 'Barbier' },
      { first: 'Marie', last: 'Arnaud' },
      { first: 'Zoé', last: 'Gautier' }
    ],
    bios: [
      "Amoureuse de la vie et des petits bonheurs, je cherche quelqu'un avec qui partager mes passions.",
      "Créative et pétillante, entre art et nature, j'aime les belles rencontres.",
      "Passionnée de culture et de voyages, toujours curieuse de découvrir de nouveaux horizons.",
      "Épicurienne et authentique, j'adore les moments simples et vrais.",
      "Aventurière dans l'âme, j'aime les défis et les nouvelles expériences enrichissantes."
    ]
  }
};

const INTERESTS = [
  '🎵 Musique', '🎬 Cinéma', '📚 Lecture', '🏃‍♂️ Sport', '🎨 Art', '🍳 Cuisine',
  '✈️ Voyages', '📸 Photo', '🎭 Théâtre', '🏊‍♀️ Natation', '🚴‍♂️ Cyclisme',
  '🏔️ Randonnée', '🎸 Guitare', '💃 Danse', '🧘‍♀️ Yoga', '🌱 Jardinage'
];

const CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
  'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Grenoble', 'Dijon'
];

// Fonction pour créer une photo SVG avec initiales
function createInitialsPhoto(firstName, lastName, gender) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  const bgColor = gender === 'homme' ? '#2563eb' : '#dc2626';
  
  const svg = `
    <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="500" fill="${bgColor}"/>
      <text x="200" y="280" font-family="Arial, sans-serif" font-size="120" font-weight="bold" 
            text-anchor="middle" fill="white">${initials}</text>
    </svg>
  `;
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Fonction pour créer des photos avec dégradé
function createGradientPhoto(firstName, lastName, gender, index) {
  const colors = {
    homme: [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7']
    ],
    femme: [
      ['#fa709a', '#fee140'],
      ['#a8edea', '#fed6e3'],
      ['#ffecd2', '#fcb69f'],
      ['#ff9a9e', '#fecfef']
    ]
  };
  
  const colorPair = colors[gender][index % colors[gender].length];
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  
  const svg = `
    <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#gradient${index})"/>
      <text x="200" y="280" font-family="Arial, sans-serif" font-size="100" font-weight="bold" 
            text-anchor="middle" fill="white" opacity="0.9">${initials}</text>
      <text x="200" y="350" font-family="Arial, sans-serif" font-size="24" 
            text-anchor="middle" fill="white" opacity="0.8">${firstName}</text>
    </svg>
  `;
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Fonction pour créer un utilisateur
async function createUser(userData) {
  const client = await pool.connect();
  try {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const query = `
      INSERT INTO users (email, password_hash, username, first_name, last_name, verification_token)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      userData.email,
      passwordHash,
      userData.username,
      userData.first_name,
      userData.last_name,
      verificationToken
    ];
    
    const result = await client.query(query, values);
    const user = result.rows[0];
    
    // Créer un profil vide
    await client.query('INSERT INTO profiles (user_id) VALUES ($1)', [user.id]);
    
    // Vérifier automatiquement l'utilisateur
    await client.query(
      'UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1',
      [user.id]
    );
    
    return user;
  } finally {
    client.release();
  }
}

// Fonction pour créer un profil
async function createProfile(userId, profileData) {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE profiles 
      SET biography = $2, age = $3, gender = $4, sexual_orientation = $5, 
          interests = $6, city = $7, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;
    
    const values = [
      userId,
      profileData.biography,
      profileData.age,
      profileData.gender,
      profileData.sexual_orientation,
      profileData.interests,
      profileData.city
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Fonction pour créer des photos
async function createProfilePhotos(userId, firstName, lastName, gender) {
  const client = await pool.connect();
  try {
    for (let i = 0; i < 3; i++) {
      const imageData = i === 0 
        ? createInitialsPhoto(firstName, lastName, gender)
        : createGradientPhoto(firstName, lastName, gender, i);
      
      const filename = `profile-${userId}-${i}-${Date.now()}.svg`;
      const isProfilePicture = i === 0;
      
      await client.query(
        'INSERT INTO photos (user_id, filename, image_data, is_profile_picture) VALUES ($1, $2, $3, $4)',
        [userId, filename, imageData, isProfilePicture]
      );
      
      console.log(`✅ Photo ${i + 1}/3 créée`);
    }
  } finally {
    client.release();
  }
}

// Fonction pour mettre à jour les coordonnées GPS
async function updateLocation(userId, lat, lng) {
  const client = await pool.connect();
  try {
    await client.query(
      'UPDATE profiles SET location_lat = $1, location_lng = $2 WHERE user_id = $3',
      [lat, lng, userId]
    );
  } finally {
    client.release();
  }
}

// Fonction principale
async function generateProfiles(count = 10) {
  console.log(`🎯 Génération de ${count} profils avec photos personnalisées...`);
  
  try {
    for (let i = 0; i < count; i++) {
      const gender = Math.random() > 0.5 ? 'homme' : 'femme';
      const names = PROFILE_DATA[gender].names;
      const bios = PROFILE_DATA[gender].bios;
      
      const nameIndex = Math.floor(Math.random() * names.length);
      const name = names[nameIndex];
      const firstName = name.first;
      const lastName = name.last;
      
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 999)}`;
      const email = `${username}@example.com`;
      const age = Math.floor(Math.random() * 18) + 22; // 22-39 ans
      
      console.log(`\n👤 Profil ${i + 1}/${count}: ${firstName} ${lastName} (${gender}, ${age} ans)`);
      
      try {
        // Créer l'utilisateur
        const user = await createUser({
          email,
          username,
          password: 'TempPassword123!',
          first_name: firstName,
          last_name: lastName
        });
        
        // Générer des intérêts
        const shuffledInterests = [...INTERESTS].sort(() => 0.5 - Math.random());
        const userInterests = shuffledInterests.slice(0, Math.floor(Math.random() * 5) + 3);
        
        // Choisir une bio et une ville
        const bio = bios[Math.floor(Math.random() * bios.length)];
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        
        // Déterminer l'orientation sexuelle
        const orientations = ['hetero', 'homo', 'bi'];
        const orientationWeights = [0.7, 0.15, 0.15]; // 70% hetero, 15% homo, 15% bi
        const rand = Math.random();
        let orientation = 'hetero';
        if (rand < orientationWeights[2]) {
          orientation = 'bi';
        } else if (rand < orientationWeights[1] + orientationWeights[2]) {
          orientation = 'homo';
        }
        
        // Créer le profil
        const profileData = {
          biography: bio,
          age,
          gender,
          sexual_orientation: orientation,
          interests: userInterests,
          city
        };
        
        await createProfile(user.id, profileData);
        
        // Générer des coordonnées GPS (région parisienne)
        const parisLat = 48.8566;
        const parisLng = 2.3522;
        const lat = parisLat + (Math.random() - 0.5) * 0.6;
        const lng = parisLng + (Math.random() - 0.5) * 0.6;
        
        await updateLocation(user.id, lat, lng);
        
        console.log(`✅ Profil créé: ${firstName} ${lastName} à ${city}`);
        console.log(`💭 Orientation: ${orientation}`);
        console.log(`🎯 Intérêts: ${userInterests.slice(0, 3).join(', ')}`);
        
        // Créer les photos
        await createProfilePhotos(user.id, firstName, lastName, gender);
        
        console.log(`🎉 Profil complet créé !`);
        
      } catch (error) {
        console.error(`❌ Erreur profil ${i + 1}:`, error);
      }
    }
    
    console.log(`\n🎊 Génération terminée ! ${count} profils créés avec photos.`);
    
  } catch (error) {
    console.error('❌ Erreur génération:', error);
  } finally {
    await pool.end();
  }
}

// Lancer la génération
const count = process.argv[2] ? parseInt(process.argv[2]) : 10;
generateProfiles(count)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erreur:', error);
    process.exit(1);
  });
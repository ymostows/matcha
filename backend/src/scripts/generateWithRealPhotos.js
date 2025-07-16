require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Configuration base de données
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matcha_db',
  user: process.env.DB_USER || 'matcha_user',
  password: process.env.DB_PASSWORD || 'matcha_password',
});

// Sources d'images
const IMAGE_SOURCES = {
  THISPERSON: 'https://thispersondoesnotexist.com/image',
  PICSUM: 'https://picsum.photos/400/500',
  ROBOHASH: 'https://robohash.org'
};

// Fonction pour télécharger une image
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const request = client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(`data:image/jpeg;base64,${base64}`);
      });
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.abort();
      reject(new Error('Timeout'));
    });
  });
}

// Fonction pour obtenir une photo réelle
async function getRealPhoto(firstName, lastName, gender, index = 0) {
  const strategies = [
    // Stratégie 1: ThisPersonDoesNotExist
    async () => {
      const url = `${IMAGE_SOURCES.THISPERSON}?${Date.now()}-${index}`;
      return await downloadImage(url);
    },
    
    // Stratégie 2: Picsum Photos
    async () => {
      const seed = `${firstName}-${lastName}-${gender}-${index}`;
      const url = `https://picsum.photos/seed/${seed}/400/500`;
      return await downloadImage(url);
    },
    
    // Stratégie 3: Picsum aléatoire
    async () => {
      const url = `${IMAGE_SOURCES.PICSUM}?random=${Date.now()}-${index}`;
      return await downloadImage(url);
    },
    
    // Stratégie 4: RoboHash (fallback)
    async () => {
      const seed = `${firstName}${lastName}${gender}${index}`;
      const url = `${IMAGE_SOURCES.ROBOHASH}/${seed}.png?size=400x500`;
      return await downloadImage(url);
    }
  ];
  
  // Essayer chaque stratégie
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`📸 Tentative ${i + 1}/4 pour ${firstName}...`);
      const photo = await strategies[i]();
      console.log(`✅ Photo obtenue avec la stratégie ${i + 1}`);
      return photo;
    } catch (error) {
      console.warn(`❌ Stratégie ${i + 1} échouée:`, error.message);
      if (i === strategies.length - 1) {
        throw new Error('Toutes les stratégies ont échoué');
      }
    }
  }
}

// Fonction pour créer des photos SVG en fallback
function createFallbackPhoto(firstName, lastName, gender, index = 0) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  const colors = {
    homme: ['#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
    femme: ['#dc2626', '#b91c1c', '#991b1b', '#7f1d1d']
  };
  
  const bgColor = colors[gender][index % colors[gender].length];
  
  const svg = `
    <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${bgColor}dd;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#grad${index})"/>
      <text x="200" y="280" font-family="Arial, sans-serif" font-size="100" font-weight="bold" 
            text-anchor="middle" fill="white" opacity="0.9">${initials}</text>
      <text x="200" y="350" font-family="Arial, sans-serif" font-size="20" 
            text-anchor="middle" fill="white" opacity="0.7">${firstName} ${lastName}</text>
    </svg>
  `;
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Fonction pour créer des photos (avec fallback)
async function createProfilePhotos(userId, firstName, lastName, gender) {
  const client = await pool.connect();
  try {
    for (let i = 0; i < 3; i++) {
      let imageData;
      
      try {
        // Essayer d'obtenir une vraie photo
        imageData = await getRealPhoto(firstName, lastName, gender, i);
        console.log(`✅ Photo réelle ${i + 1}/3 obtenue`);
      } catch (error) {
        // Fallback vers SVG
        console.log(`⚠️ Fallback vers SVG pour la photo ${i + 1}/3`);
        imageData = createFallbackPhoto(firstName, lastName, gender, i);
      }
      
      const filename = `real-${userId}-${i}-${Date.now()}.jpg`;
      const isProfilePicture = i === 0;
      
      await client.query(
        'INSERT INTO photos (user_id, filename, image_data, is_profile_picture) VALUES ($1, $2, $3, $4)',
        [userId, filename, imageData, isProfilePicture]
      );
      
      console.log(`✅ Photo ${i + 1}/3 sauvegardée`);
      
      // Attendre entre les photos
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } finally {
    client.release();
  }
}

// Données des profils (même structure que l'autre script)
const PROFILE_DATA = {
  homme: {
    names: [
      { first: 'Alexandre', last: 'Martin' },
      { first: 'Antoine', last: 'Bernard' },
      { first: 'Arthur', last: 'Dubois' },
      { first: 'Baptiste', last: 'Thomas' },
      { first: 'Benjamin', last: 'Robert' },
      { first: 'Clément', last: 'Richard' },
      { first: 'Damien', last: 'Petit' },
      { first: 'David', last: 'Durand' },
      { first: 'Émile', last: 'Leroy' },
      { first: 'Fabien', last: 'Moreau' },
      { first: 'Gabriel', last: 'Simon' },
      { first: 'Hugo', last: 'Laurent' },
      { first: 'Julien', last: 'Lefebvre' },
      { first: 'Lucas', last: 'Michel' },
      { first: 'Maxime', last: 'Garcia' },
      { first: 'Nicolas', last: 'Roux' },
      { first: 'Olivier', last: 'Vincent' },
      { first: 'Paul', last: 'Fournier' },
      { first: 'Pierre', last: 'Morel' },
      { first: 'Thomas', last: 'Girard' }
    ],
    bios: [
      "Passionné de voyages et de découvertes, j'adore partager des moments authentiques avec des personnes sincères.",
      "Amateur de sport et de bonne cuisine, toujours prêt pour de nouvelles aventures et des rencontres enrichissantes.",
      "Créatif dans l'âme, entre art et musique, je cherche quelqu'un pour partager ma passion de la vie.",
      "Épicurien et optimiste, j'aime les discussions profondes et les moments simples qui font la beauté du quotidien.",
      "Sportif et aventurier, j'aime explorer le monde et rencontrer des personnes inspirantes sur mon chemin.",
      "Curieux de nature, j'aime apprendre et découvrir. Prêt à vivre de nouvelles expériences enrichissantes.",
      "Entre tradition et modernité, j'apprécie les petits bonheurs de la vie et la bonne compagnie.",
      "Passionné de culture et de nature, je cherche une complicité sincère pour de beaux projets ensemble."
    ]
  },
  femme: {
    names: [
      { first: 'Amélie', last: 'Dupont' },
      { first: 'Anaïs', last: 'Lambert' },
      { first: 'Camille', last: 'Rousseau' },
      { first: 'Céline', last: 'Faure' },
      { first: 'Charlotte', last: 'Blanchard' },
      { first: 'Chloé', last: 'Joly' },
      { first: 'Claire', last: 'Gaillard' },
      { first: 'Émilie', last: 'Barbier' },
      { first: 'Emma', last: 'Arnaud' },
      { first: 'Jade', last: 'Gautier' },
      { first: 'Julie', last: 'Olivier' },
      { first: 'Léa', last: 'Chevalier' },
      { first: 'Léna', last: 'Collin' },
      { first: 'Manon', last: 'Bourgeois' },
      { first: 'Marie', last: 'Lemoine' },
      { first: 'Mathilde', last: 'Menard' },
      { first: 'Océane', last: 'Dumont' },
      { first: 'Pauline', last: 'Carpentier' },
      { first: 'Sarah', last: 'Meunier' },
      { first: 'Zoé', last: 'Deschamps' }
    ],
    bios: [
      "Amoureuse de la vie et des petits bonheurs, je cherche quelqu'un avec qui partager mes passions et mes rêves.",
      "Créative et pétillante, entre art et nature, j'aime les belles rencontres et les moments magiques.",
      "Passionnée de culture et de voyages, toujours curieuse de découvrir de nouveaux horizons et de nouvelles personnes.",
      "Épicurienne et authentique, j'adore les moments simples et vrais, loin du superficiel.",
      "Aventurière dans l'âme, j'aime les défis et les nouvelles expériences qui font grandir.",
      "Sensible et déterminée, je cherche une belle complicité pour construire ensemble de beaux projets.",
      "Entre douceur et caractère, j'apprécie les discussions profondes et les fous rires partagés.",
      "Optimiste et spontanée, j'aime croquer la vie à pleines dents et partager mes découvertes."
    ]
  }
};

const INTERESTS = [
  '🎵 Musique', '🎬 Cinéma', '📚 Lecture', '🏃‍♂️ Sport', '🎨 Art', '🍳 Cuisine',
  '✈️ Voyages', '📸 Photographie', '🎭 Théâtre', '🏊‍♀️ Natation', '🚴‍♂️ Cyclisme',
  '🏔️ Randonnée', '🎸 Guitare', '🎹 Piano', '💃 Danse', '🧘‍♀️ Yoga',
  '🌱 Jardinage', '🐕 Animaux', '🍷 Œnologie', '🎮 Gaming', '🔬 Sciences',
  '📝 Écriture', '🎤 Chant', '🏀 Basketball', '⚽ Football', '🎾 Tennis'
];

const CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
  'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Saint-Étienne',
  'Toulon', 'Angers', 'Grenoble', 'Dijon', 'Nîmes', 'Aix-en-Provence'
];

// Fonctions de base (même que l'autre script)
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
    
    // Créer un profil vide et vérifier l'utilisateur
    await client.query('INSERT INTO profiles (user_id) VALUES ($1)', [user.id]);
    await client.query(
      'UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1',
      [user.id]
    );
    
    return user;
  } finally {
    client.release();
  }
}

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
async function generateWithRealPhotos(count = 10) {
  console.log(`🎨 Génération de ${count} profils avec photos réelles...`);
  console.log(`📸 Sources: ThisPersonDoesNotExist, Picsum Photos, RoboHash`);
  
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
      const age = Math.floor(Math.random() * 18) + 22;
      
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
        
        // Générer des données de profil
        const shuffledInterests = [...INTERESTS].sort(() => 0.5 - Math.random());
        const userInterests = shuffledInterests.slice(0, Math.floor(Math.random() * 6) + 3);
        
        const bio = bios[Math.floor(Math.random() * bios.length)];
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        
        // Déterminer l'orientation
        const orientations = ['hetero', 'homo', 'bi'];
        const weights = [0.75, 0.15, 0.10];
        const rand = Math.random();
        let orientation = 'hetero';
        if (rand < weights[2]) {
          orientation = 'bi';
        } else if (rand < weights[1] + weights[2]) {
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
        
        // Coordonnées GPS
        const parisLat = 48.8566;
        const parisLng = 2.3522;
        const lat = parisLat + (Math.random() - 0.5) * 0.8;
        const lng = parisLng + (Math.random() - 0.5) * 0.8;
        
        await updateLocation(user.id, lat, lng);
        
        console.log(`✅ Profil créé: ${firstName} ${lastName} à ${city}`);
        console.log(`💭 ${bio.substring(0, 50)}...`);
        console.log(`🎯 Intérêts: ${userInterests.slice(0, 3).join(', ')}`);
        
        // Créer les photos (avec téléchargement réel)
        console.log(`📸 Téléchargement des photos...`);
        await createProfilePhotos(user.id, firstName, lastName, gender);
        
        console.log(`🎉 Profil complet créé avec photos !`);
        
      } catch (error) {
        console.error(`❌ Erreur profil ${i + 1}:`, error);
      }
      
      // Attendre entre les profils
      if (i < count - 1) {
        console.log(`⏳ Attente 3 secondes avant le prochain profil...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`\n🎊 Génération terminée !`);
    console.log(`📊 ${count} profils créés avec photos réelles/de qualité`);
    console.log(`🌐 Accédez à l'application: http://localhost:5173/browsing`);
    
  } catch (error) {
    console.error('❌ Erreur génération:', error);
  } finally {
    await pool.end();
  }
}

// Lancer la génération
const count = process.argv[2] ? parseInt(process.argv[2]) : 10;
generateWithRealPhotos(count)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erreur:', error);
    process.exit(1);
  });
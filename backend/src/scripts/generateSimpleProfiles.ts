import dotenv from 'dotenv';
dotenv.config();

import { UserModel } from '../models/User';
import { ProfileModel } from '../models/Profile';
import pool from '../config/database';

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

// Fonction pour créer une photo simple avec initiales
function createInitialsPhoto(firstName: string, lastName: string, gender: 'homme' | 'femme'): string {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  const bgColor = gender === 'homme' ? '#2563eb' : '#dc2626';
  
  // Créer un SVG simple avec les initiales
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
function createGradientPhoto(firstName: string, lastName: string, gender: 'homme' | 'femme', index: number): string {
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
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#gradient)"/>
      <text x="200" y="280" font-family="Arial, sans-serif" font-size="100" font-weight="bold" 
            text-anchor="middle" fill="white" opacity="0.9">${initials}</text>
      <text x="200" y="350" font-family="Arial, sans-serif" font-size="24" 
            text-anchor="middle" fill="white" opacity="0.8">${firstName}</text>
    </svg>
  `;
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Fonction pour créer plusieurs photos pour un profil
async function createProfilePhotos(userId: number, firstName: string, lastName: string, gender: 'homme' | 'femme'): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Créer 3 photos différentes
    for (let i = 0; i < 3; i++) {
      const imageData = i === 0 
        ? createInitialsPhoto(firstName, lastName, gender)
        : createGradientPhoto(firstName, lastName, gender, i);
      
      const filename = `simple-${userId}-${i}-${Date.now()}.svg`;
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

// Fonction principale
async function generateSimpleProfiles(count: number = 10): Promise<void> {
  console.log(`🎯 Génération de ${count} profils avec photos personnalisées...`);
  
  try {
    for (let i = 0; i < count; i++) {
      const gender: 'homme' | 'femme' = Math.random() > 0.5 ? 'homme' : 'femme';
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
        const user = await UserModel.create({
          email,
          username,
          password: 'TempPassword123!',
          first_name: firstName,
          last_name: lastName
        });
        
        // Vérifier l'utilisateur
        await UserModel.verifyAccount(user.verification_token!);
        
        // Générer des intérêts
        const shuffledInterests = [...INTERESTS].sort(() => 0.5 - Math.random());
        const userInterests = shuffledInterests.slice(0, Math.floor(Math.random() * 5) + 3);
        
        // Choisir une bio et une ville
        const bio = bios[Math.floor(Math.random() * bios.length)];
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        
        // Créer le profil
        const profileData = {
          biography: bio,
          age,
          gender,
          sexual_orientation: Math.random() > 0.85 ? 'bi' : (Math.random() > 0.2 ? 'hetero' : 'homo'),
          interests: userInterests,
          city
        };
        
        await ProfileModel.createOrUpdate(user.id, profileData);
        
        // Générer des coordonnées GPS (région parisienne)
        const parisLat = 48.8566;
        const parisLng = 2.3522;
        const lat = parisLat + (Math.random() - 0.5) * 0.6;
        const lng = parisLng + (Math.random() - 0.5) * 0.6;
        
        await pool.query(
          'UPDATE profiles SET location_lat = $1, location_lng = $2 WHERE user_id = $3',
          [lat, lng, user.id]
        );
        
        console.log(`✅ Profil créé: ${firstName} ${lastName} à ${city}`);
        console.log(`🎯 Intérêts: ${userInterests.slice(0, 3).join(', ')}`);
        
        // Créer les photos
        await createProfilePhotos(user.id, firstName, lastName, gender);
        
        console.log(`🎉 Profil complet créé !`);
        
      } catch (error) {
        console.error(`❌ Erreur profil ${i + 1}:`, error);
      }
    }
    
    console.log(`\n🎊 Génération terminée ! ${count} profils créés.`);
    
  } catch (error) {
    console.error('❌ Erreur génération:', error);
  }
}

// Lancer la génération
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 10;
  generateSimpleProfiles(count)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erreur:', error);
      process.exit(1);
    });
}

export { generateSimpleProfiles };
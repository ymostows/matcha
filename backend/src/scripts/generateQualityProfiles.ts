import dotenv from 'dotenv';
dotenv.config();

import { UserModel } from '../models/User';
import { ProfileModel } from '../models/Profile';
import pool from '../config/database';
import fetch from 'node-fetch';

// Sources d'images de qualité
const IMAGE_SOURCES = {
  // ThisPersonDoesNotExist - Visages IA très réalistes
  THISPERSON: 'https://thispersondoesnotexist.com/image',
  // Picsum Photos - Photos de qualité
  PICSUM: 'https://picsum.photos/400/500',
  // Lorem Picsum avec seed pour cohérence
  PICSUM_SEED: 'https://picsum.photos/seed',
  // UI Avatars en fallback
  UI_AVATARS: 'https://ui-avatars.com/api'
};

// Fonction pour télécharger et encoder une image
async function downloadAndEncodeImage(url: string, retries: number = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`📥 Téléchargement: ${url} (tentative ${i + 1}/${retries})`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const buffer = await response.buffer();
      const base64 = buffer.toString('base64');
      
      console.log(`✅ Image téléchargée (${Math.round(buffer.length / 1024)}KB)`);
      return `data:image/jpeg;base64,${base64}`;
      
    } catch (error: any) {
      console.warn(`⚠️ Tentative ${i + 1} échouée:`, error.message);
      if (i === retries - 1) {
        throw new Error(`Échec après ${retries} tentatives: ${error.message}`);
      }
      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Impossible de télécharger l\'image');
}

// Fonction pour obtenir une photo de profil réaliste
async function getQualityProfilePhoto(firstName: string, lastName: string, gender: 'homme' | 'femme', index: number): Promise<string> {
  const strategies = [
    // Stratégie 1: ThisPersonDoesNotExist (visages IA)
    async () => {
      const url = `${IMAGE_SOURCES.THISPERSON}?${Date.now()}-${index}`;
      return await downloadAndEncodeImage(url);
    },
    
    // Stratégie 2: Picsum avec seed pour cohérence
    async () => {
      const seed = `${firstName}-${lastName}-${gender}-${index}`;
      const url = `${IMAGE_SOURCES.PICSUM_SEED}/${seed}/400/500`;
      return await downloadAndEncodeImage(url);
    },
    
    // Stratégie 3: Picsum aléatoire
    async () => {
      const url = `${IMAGE_SOURCES.PICSUM}?random=${Date.now()}-${index}`;
      return await downloadAndEncodeImage(url);
    },
    
    // Stratégie 4: UI Avatars en fallback
    async () => {
      const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
      const bgColor = gender === 'homme' ? '2563eb' : 'dc2626';
      const url = `${IMAGE_SOURCES.UI_AVATARS}/?name=${initials}&size=400&background=${bgColor}&color=fff&format=png`;
      return await downloadAndEncodeImage(url);
    }
  ];
  
  // Essayer chaque stratégie
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`📸 Stratégie ${i + 1}/4 pour ${firstName} ${lastName}...`);
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
  
  throw new Error('Impossible d\'obtenir une photo');
}

// Fonction pour créer plusieurs photos pour un profil
async function createProfilePhotos(userId: number, firstName: string, lastName: string, gender: 'homme' | 'femme', photoCount: number = 3): Promise<void> {
  const client = await pool.connect();
  
  try {
    for (let i = 0; i < photoCount; i++) {
      try {
        console.log(`\n📸 Photo ${i + 1}/${photoCount} pour ${firstName} ${lastName}...`);
        
        const imageData = await getQualityProfilePhoto(firstName, lastName, gender, i);
        const filename = `quality-${userId}-${i}-${Date.now()}.jpg`;
        const isProfilePicture = i === 0;
        
        await client.query(
          'INSERT INTO photos (user_id, filename, image_data, is_profile_picture) VALUES ($1, $2, $3, $4)',
          [userId, filename, imageData, isProfilePicture]
        );
        
        console.log(`✅ Photo ${i + 1}/${photoCount} sauvegardée`);
        
        // Attendre entre les photos pour éviter les limitations
        if (i < photoCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Erreur photo ${i + 1}:`, error);
        
        // Si c'est la photo de profil qui échoue, essayer une fois de plus
        if (i === 0) {
          try {
            console.log(`🔄 Nouvelle tentative pour la photo de profil...`);
            const imageData = await getQualityProfilePhoto(firstName, lastName, gender, i + 100);
            const filename = `quality-${userId}-${i}-retry-${Date.now()}.jpg`;
            
            await client.query(
              'INSERT INTO photos (user_id, filename, image_data, is_profile_picture) VALUES ($1, $2, $3, $4)',
              [userId, filename, imageData, true]
            );
            
            console.log(`✅ Photo de profil sauvegardée (retry)`);
          } catch (retryError) {
            console.error(`❌ Retry échoué aussi:`, retryError);
          }
        }
      }
    }
  } finally {
    client.release();
  }
}

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
      { first: 'Fabien', last: 'Lefebvre' },
      { first: 'Gabriel', last: 'Michel' },
      { first: 'Hugo', last: 'Garcia' },
      { first: 'Julien', last: 'Roux' },
      { first: 'Lucas', last: 'Vincent' },
      { first: 'Maxime', last: 'Fournier' },
      { first: 'Nicolas', last: 'Morel' },
      { first: 'Olivier', last: 'Girard' },
      { first: 'Paul', last: 'Bonnet' },
      { first: 'Pierre', last: 'François' },
      { first: 'Thomas', last: 'Mercier' }
    ],
    bios: [
      "Passionné de voyages et de découvertes, j'adore partager des moments authentiques et explorer de nouveaux horizons.",
      "Amateur de sport et de bonne cuisine, toujours prêt pour de nouvelles aventures et des discussions passionnantes.",
      "Créatif dans l'âme, entre art et musique, je cherche quelqu'un pour partager ma passion de la vie.",
      "Épicurien et optimiste, j'aime les discussions profondes autour d'un bon verre et les moments simples.",
      "Sportif et aventurier, j'aime explorer le monde et rencontrer des personnes inspirantes.",
      "Passionné de culture et de nature, je cherche une complicité sincère pour de beaux projets ensemble.",
      "Curieux de tout, j'aime apprendre et découvrir. Prêt à vivre de nouvelles expériences enrichissantes.",
      "Entre tradition et modernité, j'apprécie les petits bonheurs de la vie et la bonne compagnie."
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
      "Passionnée de culture et de voyages, toujours curieuse de découvrir de nouveaux horizons.",
      "Épicurienne et authentique, j'adore les moments simples et vrais, loin du superficiel.",
      "Aventurière dans l'âme, j'aime les défis et les nouvelles expériences enrichissantes.",
      "Sensible et déterminée, je cherche une belle complicité pour construire ensemble.",
      "Entre douceur et caractère, j'apprécie les discussions profondes et les fous rires.",
      "Optimiste et spontanée, j'aime croquer la vie à pleines dents et partager mes découvertes."
    ]
  }
};

const INTERESTS = [
  '🎵 Musique', '🎬 Cinéma', '📚 Lecture', '🏃‍♂️ Sport', '🎨 Art', '🍳 Cuisine',
  '✈️ Voyages', '📸 Photo', '🎭 Théâtre', '🏊‍♀️ Natation', '🚴‍♂️ Cyclisme',
  '🏔️ Randonnée', '🎸 Guitare', '🎹 Piano', '💃 Danse', '🧘‍♀️ Yoga',
  '🌱 Jardinage', '🐕 Animaux', '🍷 Œnologie', '🏄‍♂️ Surf', '🎮 Gaming',
  '🔬 Sciences', '📝 Écriture', '🎤 Chant', '🏀 Basketball', '⚽ Football'
];

const CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
  'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Saint-Étienne',
  'Toulon', 'Angers', 'Grenoble', 'Dijon', 'Nîmes', 'Aix-en-Provence'
];

// Fonction principale
async function generateQualityProfiles(count: number = 15): Promise<void> {
  console.log(`🎯 Génération de ${count} profils de qualité avec photos...`);
  console.log(`📱 Sources d'images: ThisPersonDoesNotExist, Picsum, UI Avatars`);
  
  try {
    for (let i = 0; i < count; i++) {
      const gender = Math.random() > 0.5 ? 'homme' : 'femme';
      const names = PROFILE_DATA[gender].names;
      const bios = PROFILE_DATA[gender].bios;
      
      const nameIndex = Math.floor(Math.random() * names.length);
      const { first: firstName, last: lastName } = names[nameIndex];
      
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
        
        // Choisir une bio
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
        console.log(`💭 Bio: ${bio.substring(0, 60)}...`);
        console.log(`🎯 Intérêts: ${userInterests.slice(0, 3).join(', ')}`);
        
        // Créer les photos
        await createProfilePhotos(user.id, firstName, lastName, gender, 3);
        
        console.log(`🎉 Profil complet créé avec photos de qualité !`);
        
      } catch (error) {
        console.error(`❌ Erreur profil ${i + 1}:`, error);
      }
      
      // Attendre entre chaque profil
      if (i < count - 1) {
        console.log(`⏱️ Attente 5 secondes avant le prochain profil...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`\n🎊 Génération terminée !`);
    console.log(`📊 ${count} profils créés avec photos de qualité`);
    console.log(`🖼️ Chaque profil a 3 photos (1 photo de profil + 2 photos supplémentaires)`);
    
  } catch (error) {
    console.error('❌ Erreur génération:', error);
  }
}

// Lancer la génération
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 15;
  generateQualityProfiles(count)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erreur:', error);
      process.exit(1);
    });
}

export { generateQualityProfiles };
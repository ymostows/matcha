import dotenv from 'dotenv';
dotenv.config();

import { UserModel } from '../models/User';
import { ProfileModel } from '../models/Profile';
import pool from '../config/database';
import crypto from 'crypto';
import fetch from 'node-fetch';

// Configuration pour les API d'images AI
const AI_IMAGE_SERVICES = {
  // Service gratuit avec des visages générés par IA
  GENERATED_PHOTOS: 'https://api.generated.photos/api/v1/faces',
  // Service THIS PERSON DOES NOT EXIST
  THISPERSONDOESNOTEXIST: 'https://thispersondoesnotexist.com/image',
  // Service RoboHash pour des avatars stylisés
  ROBOHASH: 'https://robohash.org',
  // Service UI Avatars
  UI_AVATARS: 'https://ui-avatars.com/api',
  // Service Picsum pour des photos de profil
  PICSUM: 'https://picsum.photos'
};

// Clés API (remplacez par vos vraies clés si disponibles)
const API_KEYS = {
  GENERATED_PHOTOS: process.env.GENERATED_PHOTOS_API_KEY || '',
  UNSPLASH: process.env.UNSPLASH_ACCESS_KEY || ''
};

// Fonction pour obtenir une photo depuis ThisPersonDoesNotExist
async function getThisPersonDoesNotExistPhoto(): Promise<string> {
  try {
    const response = await fetch(`${AI_IMAGE_SERVICES.THISPERSONDOESNOTEXIST}?${Date.now()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');
    
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Erreur ThisPersonDoesNotExist:', error);
    throw error;
  }
}

// Fonction pour obtenir une photo depuis Generated Photos (avec genre)
async function getGeneratedPhoto(gender: 'homme' | 'femme', age: number): Promise<string> {
  try {
    const genderParam = gender === 'homme' ? 'male' : 'female';
    const ageGroup = age < 25 ? 'young-adult' : age < 40 ? 'adult' : 'middle-aged';
    
    // URL avec paramètres pour Generated Photos
    const url = `${AI_IMAGE_SERVICES.GENERATED_PHOTOS}?gender=${genderParam}&age=${ageGroup}&order_by=random&per_page=1`;
    
    const headers: any = {
      'Authorization': `API-Key ${API_KEYS.GENERATED_PHOTOS}`,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Generated Photos API error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.faces && data.faces.length > 0) {
      const imageUrl = data.faces[0].urls.find((u: any) => u.size === 512)?.url || data.faces[0].urls[0]?.url;
      
      if (imageUrl) {
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.buffer();
        const base64 = buffer.toString('base64');
        
        return `data:image/jpeg;base64,${base64}`;
      }
    }
    
    throw new Error('Aucune image trouvée dans la réponse');
  } catch (error) {
    console.error('Erreur Generated Photos:', error);
    throw error;
  }
}

// Fonction pour obtenir une photo depuis UI Avatars (fallback)
async function getUIAvatarPhoto(firstName: string, lastName: string, gender: 'homme' | 'femme'): Promise<string> {
  try {
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
    const backgroundColor = gender === 'homme' ? '007bff' : 'dc3545';
    
    const url = `${AI_IMAGE_SERVICES.UI_AVATARS}/?name=${initials}&size=400&background=${backgroundColor}&color=fff&format=png`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`UI Avatars error! status: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');
    
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Erreur UI Avatars:', error);
    throw error;
  }
}

// Fonction pour obtenir des photos de Picsum (photos réelles variées)
async function getPicsumPhoto(seed: string): Promise<string> {
  try {
    const url = `${AI_IMAGE_SERVICES.PICSUM}/400/500?random=${seed}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Picsum error! status: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');
    
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Erreur Picsum:', error);
    throw error;
  }
}

// Fonction principale pour obtenir une photo de profil
async function getProfilePhoto(firstName: string, lastName: string, gender: 'homme' | 'femme', age: number, attempt: number = 0): Promise<string> {
  const methods = [
    () => getThisPersonDoesNotExistPhoto(),
    () => getGeneratedPhoto(gender, age),
    () => getPicsumPhoto(`${firstName}-${lastName}-${Date.now()}-${attempt}`),
    () => getUIAvatarPhoto(firstName, lastName, gender)
  ];
  
  // Essayer chaque méthode jusqu'à ce qu'une fonctionne
  for (let i = 0; i < methods.length; i++) {
    try {
      console.log(`📸 Tentative ${i + 1}/4 pour obtenir une photo...`);
      const photo = await methods[i]();
      console.log(`✅ Photo obtenue avec la méthode ${i + 1}`);
      return photo;
    } catch (error) {
      console.warn(`⚠️ Méthode ${i + 1} échouée:`, error.message);
      if (i === methods.length - 1) {
        throw new Error('Toutes les méthodes de génération de photos ont échoué');
      }
    }
  }
  
  throw new Error('Impossible d\'obtenir une photo');
}

// Fonction pour créer plusieurs photos pour un profil
async function createMultiplePhotos(userId: number, firstName: string, lastName: string, gender: 'homme' | 'femme', age: number, count: number = 3): Promise<void> {
  const client = await pool.connect();
  
  try {
    for (let i = 0; i < count; i++) {
      try {
        console.log(`📸 Génération photo ${i + 1}/${count} pour ${firstName} ${lastName}...`);
        
        const imageData = await getProfilePhoto(firstName, lastName, gender, age, i);
        const filename = `ai-profile-${userId}-${i}-${Date.now()}.jpg`;
        const isProfilePicture = i === 0;
        
        await client.query(
          'INSERT INTO photos (user_id, filename, image_data, is_profile_picture) VALUES ($1, $2, $3, $4)',
          [userId, filename, imageData, isProfilePicture]
        );
        
        console.log(`✅ Photo ${i + 1}/${count} ajoutée`);
        
        // Attendre entre chaque photo pour éviter les limitations d'API
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`❌ Erreur photo ${i + 1}:`, error);
      }
    }
  } finally {
    client.release();
  }
}

// Fonction pour créer des profils avec photos AI
async function generateAIProfiles(count: number = 10): Promise<void> {
  console.log(`🤖 Génération de ${count} profils avec photos AI de haute qualité...`);
  
  // Données pour générer des profils variés
  const NAMES = {
    homme: [
      { first: 'Alexandre', last: 'Dubois' },
      { first: 'Baptiste', last: 'Martin' },
      { first: 'Clément', last: 'Leroy' },
      { first: 'Damien', last: 'Bernard' },
      { first: 'Émile', last: 'Petit' },
      { first: 'Fabien', last: 'Durand' },
      { first: 'Gabriel', last: 'Moreau' },
      { first: 'Hugo', last: 'Simon' },
      { first: 'Julien', last: 'Laurent' },
      { first: 'Lucas', last: 'Michel' }
    ],
    femme: [
      { first: 'Amélie', last: 'Garcia' },
      { first: 'Camille', last: 'Roux' },
      { first: 'Charlotte', last: 'Vincent' },
      { first: 'Émilie', last: 'Fournier' },
      { first: 'Emma', last: 'Morel' },
      { first: 'Jade', last: 'Girard' },
      { first: 'Léa', last: 'Bonnet' },
      { first: 'Manon', last: 'François' },
      { first: 'Marie', last: 'Mercier' },
      { first: 'Zoé', last: 'Dupont' }
    ]
  };
  
  const INTERESTS = [
    '🎵 Musique', '🎬 Cinéma', '📚 Lecture', '🏃‍♂️ Sport', '🎨 Art',
    '🍳 Cuisine', '✈️ Voyages', '📸 Photographie', '🎭 Théâtre', '🏊‍♀️ Natation',
    '🚴‍♂️ Cyclisme', '🏔️ Randonnée', '🎸 Musique', '💃 Danse', '🧘‍♀️ Yoga',
    '🌱 Jardinage', '🐕 Animaux', '🍷 Œnologie', '🎮 Gaming', '🔬 Sciences'
  ];
  
  const CITIES = [
    'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
    'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Grenoble', 'Dijon'
  ];
  
  const BIOS = {
    homme: [
      "Passionné de voyages et de découvertes, j'aime partager des moments authentiques.",
      "Amateur de sport et de bonne cuisine, toujours prêt pour de nouvelles aventures.",
      "Créatif dans l'âme, entre art et musique, je cherche l'âme sœur.",
      "Épicurien et optimiste, j'adore les discussions profondes autour d'un bon verre.",
      "Sportif et aventurier, j'aime explorer le monde et rencontrer de nouvelles personnes."
    ],
    femme: [
      "Amoureuse de la vie et des petits bonheurs, je cherche quelqu'un pour les partager.",
      "Créative et pétillante, entre art et nature, j'aime les belles rencontres.",
      "Passionnée de culture et de voyages, toujours curieuse de découvrir.",
      "Épicurienne et authentique, j'adore les moments simples et vrais.",
      "Aventurière dans l'âme, j'aime les défis et les nouvelles expériences."
    ]
  };
  
  try {
    for (let i = 0; i < count; i++) {
      const gender = Math.random() > 0.5 ? 'homme' : 'femme';
      const nameIndex = Math.floor(Math.random() * NAMES[gender].length);
      const { first: firstName, last: lastName } = NAMES[gender][nameIndex];
      
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;
      const email = `${username}@example.com`;
      const age = Math.floor(Math.random() * 20) + 22; // 22-41 ans
      
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
        const userInterests = shuffledInterests.slice(0, Math.floor(Math.random() * 4) + 3);
        
        // Créer le profil
        const bio = BIOS[gender][Math.floor(Math.random() * BIOS[gender].length)];
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        
        const profileData = {
          biography: bio,
          age,
          gender,
          sexual_orientation: Math.random() > 0.8 ? 'bi' : (Math.random() > 0.15 ? 'hetero' : 'homo'),
          interests: userInterests,
          city
        };
        
        await ProfileModel.createOrUpdate(user.id, profileData);
        
        // Générer des coordonnées GPS autour de Paris
        const parisLat = 48.8566;
        const parisLng = 2.3522;
        const lat = parisLat + (Math.random() - 0.5) * 0.5;
        const lng = parisLng + (Math.random() - 0.5) * 0.5;
        
        await pool.query(
          'UPDATE profiles SET location_lat = $1, location_lng = $2 WHERE user_id = $3',
          [lat, lng, user.id]
        );
        
        console.log(`✅ Profil créé: ${firstName} ${lastName} à ${city}`);
        console.log(`🎯 Intérêts: ${userInterests.join(', ')}`);
        
        // Générer les photos AI
        await createMultiplePhotos(user.id, firstName, lastName, gender, age, 3);
        
        console.log(`🎉 Profil ${firstName} ${lastName} terminé avec photos AI !`);
        
      } catch (error) {
        console.error(`❌ Erreur profil ${i + 1}:`, error);
      }
      
      // Attendre entre chaque profil
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log(`\n🎊 Génération terminée ! ${count} profils créés avec photos AI de qualité.`);
    
  } catch (error) {
    console.error('❌ Erreur génération:', error);
  }
}

// Lancer la génération
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 10;
  generateAIProfiles(count)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erreur:', error);
      process.exit(1);
    });
}

export { generateAIProfiles };
import dotenv from 'dotenv';
dotenv.config();

import { UserModel } from '../models/User';
import { ProfileModel } from '../models/Profile';
import pool from '../config/database';
import crypto from 'crypto';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Configuration des API d'images
const IMAGE_APIS = {
  // ThisPersonDoesNotExist - API gratuite pour des visages réalistes
  THISPERSONDOESNOTEXIST: 'https://thispersondoesnotexist.com/image',
  // Generated Photos - API gratuite avec plus de contrôle
  GENERATED_PHOTOS: 'https://api.generated.photos/api/v1/faces',
  // Picsum Photos - pour des photos de profil diverses
  PICSUM: 'https://picsum.photos'
};

// Noms français réalistes
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

// Villes françaises
const CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier',
  'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon',
  'Angers', 'Grenoble', 'Dijon', 'Nîmes', 'Aix-en-Provence', 'Brest', 'Le Mans',
  'Amiens', 'Tours', 'Limoges', 'Clermont-Ferrand', 'Villeurbanne', 'Besançon'
];

// Centres d'intérêt variés
const INTERESTS = [
  '🎵 Musique', '🎬 Cinéma', '📚 Lecture', '🏃‍♂️ Sport', '🎯 Gaming', '🎨 Art',
  '🍳 Cuisine', '✈️ Voyages', '📸 Photo', '🎭 Théâtre', '🏊‍♀️ Natation', '🚴‍♂️ Cyclisme',
  '🏔️ Randonnée', '🎸 Guitare', '🎹 Piano', '💃 Danse', '🧘‍♀️ Yoga', '🌱 Jardinage',
  '🐕 Animaux', '🍷 Œnologie', '🏄‍♂️ Surf', '🎪 Cirque', '🎮 Esport', '🔬 Sciences',
  '📝 Écriture', '🎤 Karaoké', '🏀 Basketball', '⚽ Football', '🎾 Tennis', '🏐 Volleyball'
];

// Biographies templates
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

// Fonction pour télécharger une image depuis une URL
async function downloadImage(url: string, filename: string): Promise<string> {
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

// Fonction pour obtenir une photo de profil réaliste
async function getRealisticProfilePhoto(gender: 'homme' | 'femme', index: number): Promise<string> {
  try {
    // Utiliser différentes sources d'images pour plus de variété
    const sources = [
      // ThisPersonDoesNotExist - visages très réalistes
      `${IMAGE_APIS.THISPERSONDOESNOTEXIST}?${Date.now()}-${index}`,
      // Picsum avec des dimensions spécifiques pour des portraits
      `${IMAGE_APIS.PICSUM}/400/500?random=${Date.now()}-${index}`,
      // Backup avec une autre seed
      `${IMAGE_APIS.PICSUM}/400/500?random=${Date.now()}-${index}-backup`
    ];
    
    // Essayer chaque source jusqu'à ce qu'une fonctionne
    for (const source of sources) {
      try {
        const imageData = await downloadImage(source, `profile-${gender}-${index}.jpg`);
        return imageData;
      } catch (error) {
        console.warn(`Source ${source} échouée, essai suivant...`);
        continue;
      }
    }
    
    throw new Error('Toutes les sources d\'images ont échoué');
  } catch (error) {
    console.error('Erreur obtention photo:', error);
    throw error;
  }
}

// Fonction pour obtenir plusieurs photos pour un profil
async function getMultiplePhotos(gender: 'homme' | 'femme', userId: number, count: number = 3): Promise<void> {
  const client = await pool.connect();
  
  try {
    for (let i = 0; i < count; i++) {
      try {
        const imageData = await getRealisticProfilePhoto(gender, userId * 10 + i);
        const filename = `profile-${userId}-${i}-${Date.now()}.jpg`;
        const isProfilePicture = i === 0; // La première photo est la photo de profil
        
        await client.query(
          'INSERT INTO photos (user_id, filename, image_data, is_profile_picture) VALUES ($1, $2, $3, $4)',
          [userId, filename, imageData, isProfilePicture]
        );
        
        console.log(`✅ Photo ${i + 1}/${count} ajoutée pour l'utilisateur ${userId}`);
        
        // Attendre un peu entre chaque téléchargement pour éviter les limitations
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Erreur photo ${i + 1} pour utilisateur ${userId}:`, error);
      }
    }
  } finally {
    client.release();
  }
}

// Fonction pour générer une biographie réaliste
function generateBiography(gender: 'homme' | 'femme', interests: string[]): string {
  const templates = BIO_TEMPLATES[gender];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  const shuffledInterests = [...interests].sort(() => 0.5 - Math.random());
  
  return template
    .replace('{interest1}', shuffledInterests[0]?.toLowerCase() || 'la musique')
    .replace('{interest2}', shuffledInterests[1]?.toLowerCase() || 'le cinéma');
}

// Fonction pour générer des coordonnées GPS aléatoires autour de Paris
function generateParisCoordinates() {
  const parisLat = 48.8566;
  const parisLng = 2.3522;
  
  // Rayon d'environ 50km autour de Paris
  const radius = 0.5;
  
  const lat = parisLat + (Math.random() - 0.5) * radius;
  const lng = parisLng + (Math.random() - 0.5) * radius;
  
  return { lat, lng };
}

// Fonction principale pour générer des profils réalistes
async function generateRealisticProfiles(count: number = 20): Promise<void> {
  console.log(`🚀 Génération de ${count} profils réalistes avec photos AI...`);
  
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
        await UserModel.verifyAccount(user.verification_token!);
        
        // Générer des intérêts aléatoires
        const shuffledInterests = [...INTERESTS].sort(() => 0.5 - Math.random());
        const userInterests = shuffledInterests.slice(0, Math.floor(Math.random() * 5) + 3);
        
        // Générer une biographie
        const biography = generateBiography(gender, userInterests);
        
        // Générer des coordonnées GPS
        const coordinates = generateParisCoordinates();
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        
        // Créer le profil
        const profileData = {
          biography,
          age: Math.floor(Math.random() * 25) + 20, // 20-44 ans
          gender,
          sexual_orientation: Math.random() > 0.8 ? 'bi' : (Math.random() > 0.1 ? 'hetero' : 'homo'),
          interests: userInterests,
          city
        };
        
        await ProfileModel.createOrUpdate(user.id, profileData);
        
        // Mettre à jour les coordonnées GPS
        await pool.query(
          'UPDATE profiles SET location_lat = $1, location_lng = $2 WHERE user_id = $3',
          [coordinates.lat, coordinates.lng, user.id]
        );
        
        console.log(`✅ Profil créé: ${firstName} ${lastName}`);
        console.log(`📍 Ville: ${city}`);
        console.log(`🎯 Intérêts: ${userInterests.join(', ')}`);
        
        // Générer des photos réalistes
        console.log(`📸 Génération des photos...`);
        await getMultiplePhotos(gender, user.id, 3);
        
        console.log(`✅ Profil complet créé avec photos !`);
        
      } catch (error) {
        console.error(`❌ Erreur création profil ${i + 1}:`, error);
      }
      
      // Attendre entre chaque profil pour éviter les limitations d'API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎉 Génération terminée ! ${count} profils créés avec photos réalistes.`);
    
  } catch (error) {
    console.error('❌ Erreur génération profils:', error);
  }
}

// Lancer la génération si ce script est exécuté directement
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 20;
  generateRealisticProfiles(count)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erreur:', error);
      process.exit(1);
    });
}

export { generateRealisticProfiles };
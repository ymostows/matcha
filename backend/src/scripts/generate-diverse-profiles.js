const { Pool } = require('pg');

require('dotenv').config();

// Database connection - Neon uniquement
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

// Data for diverse profiles
const FIRST_NAMES = {
  homme: [
    'Alexandre', 'Antoine', 'Arthur', 'Baptiste', 'Benjamin', 'Clément', 'Damien',
    'David', 'Émile', 'Fabien', 'Gabriel', 'Hugo', 'Julien', 'Kévin', 'Lucas',
    'Marc', 'Maxime', 'Nicolas', 'Olivier', 'Paul', 'Pierre', 'Quentin', 'Raphaël',
    'Sébastien', 'Thomas', 'Valentin', 'Xavier', 'Yann', 'Zacharie'
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
  'Musique', 'Cinéma', 'Lecture', 'Sport', 'Gaming', 'Art', 'Cuisine', 'Voyages',
  'Photo', 'Théâtre', 'Natation', 'Cyclisme', 'Randonnée', 'Guitare', 'Piano',
  'Danse', 'Yoga', 'Jardinage', 'Animaux', 'Œnologie', 'Surf', 'Cirque', 'Esport',
  'Sciences', 'Écriture', 'Karaoké', 'Basketball', 'Football', 'Tennis', 'Volleyball'
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

// Functions
function generateBiography(gender, interests) {
  const templates = BIO_TEMPLATES[gender];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  const shuffledInterests = [...interests].sort(() => 0.5 - Math.random());
  
  return template
    .replace('{interest1}', shuffledInterests[0]?.toLowerCase() || 'la musique')
    .replace('{interest2}', shuffledInterests[1]?.toLowerCase() || 'le cinéma');
}

function generateParisCoordinates() {
  const parisLat = 48.8566;
  const parisLng = 2.3522;
  
  // Radius of about 50km around Paris
  const radius = 0.5;
  
  const lat = parisLat + (Math.random() - 0.5) * radius;
  const lng = parisLng + (Math.random() - 0.5) * radius;
  
  return { lat, lng };
}

function hashPassword(password) {
  // Simple hash for testing (in production, use bcrypt)
  return '$2b$12$' + Buffer.from(password).toString('base64');
}

function generateDiverseOrientations() {
  const rand = Math.random();
  if (rand < 0.1) return 'homo';     // 10% homosexual
  if (rand < 0.25) return 'bi';      // 15% bisexual
  return 'hetero';                   // 75% heterosexual
}

async function generateDiverseProfiles(count = 100) {
  console.log(`🚀 Generating ${count} diverse profiles...`);
  
  const client = await pool.connect();
  let successCount = 0;
  
  try {
    // Ensure balanced gender distribution
    const genders = [];
    for (let i = 0; i < count; i++) {
      genders.push(i % 2 === 0 ? 'homme' : 'femme');
    }
    
    // Shuffle to randomize order
    genders.sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < count; i++) {
      const gender = genders[i];
      const firstName = FIRST_NAMES[gender][Math.floor(Math.random() * FIRST_NAMES[gender].length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
      const email = `${username}@example.com`;
      
      console.log(`\n👤 Creating profile ${i + 1}/${count}: ${firstName} ${lastName} (${gender})`);
      
      try {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1 OR username = $2',
          [email, username]
        );
        
        if (existingUser.rows.length > 0) {
          console.log(`⚠️  User ${username} already exists, skipping...`);
          continue;
        }
        
        // Create user
        const userResult = await client.query(`
          INSERT INTO users (email, username, password_hash, first_name, last_name, is_verified, created_at)
          VALUES ($1, $2, $3, $4, $5, true, NOW())
          RETURNING id
        `, [email, username, hashPassword('TempPassword123!'), firstName, lastName]);
        
        const userId = userResult.rows[0].id;
        
        // Generate interests
        const shuffledInterests = [...INTERESTS].sort(() => 0.5 - Math.random());
        const userInterests = shuffledInterests.slice(0, Math.floor(Math.random() * 5) + 3);
        
        // Generate biography
        const biography = generateBiography(gender, userInterests);
        
        // Generate coordinates
        const coordinates = generateParisCoordinates();
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        
        // Generate diverse sexual orientations
        const sexualOrientation = generateDiverseOrientations();
        
        // Create profile with age diversity (18-45)
        const age = Math.floor(Math.random() * 28) + 18;
        
        await client.query(`
          INSERT INTO profiles (
            user_id, biography, age, gender, sexual_orientation, 
            interests, city, location_lat, location_lng, fame_rating, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `, [
          userId, biography, age, gender, sexualOrientation,
          userInterests, city, coordinates.lat, coordinates.lng,
          Math.floor(Math.random() * 50) + 10 // Fame rating 10-60
        ]);
        
        // Add a placeholder photo
        await client.query(`
          INSERT INTO photos (user_id, filename, image_data, is_profile_picture, upload_date)
          VALUES ($1, $2, $3, true, NOW())
        `, [
          userId, 
          `placeholder-${gender}-${userId}.jpg`,
          `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="20">${firstName}</text></svg>`).toString('base64')}`
        ]);
        
        console.log(`✅ Profile created: ${firstName} ${lastName}`);
        console.log(`📍 City: ${city}, Age: ${age}, Orientation: ${sexualOrientation}`);
        console.log(`🎯 Interests: ${userInterests.join(', ')}`);
        
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error creating profile ${i + 1}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Generation completed! ${successCount}/${count} profiles created successfully.`);
    
  } catch (error) {
    console.error('❌ Error generating profiles:', error);
  } finally {
    client.release();
  }
}

// Run the generation
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 100;
  generateDiverseProfiles(count)
    .then(() => {
      console.log('\n✅ Profile generation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { generateDiverseProfiles };
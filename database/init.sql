-- Fichier d'initialisation de la base de données Matcha
-- Ce fichier sera exécuté lors de la création du conteneur PostgreSQL

-- Création de la base de données (si elle n'existe pas déjà)
-- Elle sera créée automatiquement par Docker avec les variables d'environnement

-- Extensions PostgreSQL utiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tables de la base de données Matcha

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des profils
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  biography TEXT,
  age INTEGER CHECK (age >= 18 AND age <= 100),
  gender VARCHAR(10) CHECK (gender IN ('homme', 'femme')),
  sexual_orientation VARCHAR(10) CHECK (sexual_orientation IN ('hetero', 'homo', 'bi')),
  interests TEXT[], -- Array de strings pour les intérêts
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  fame_rating INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des photos avec base64
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  image_data TEXT NOT NULL, -- Stockage base64
  mime_type VARCHAR(50) DEFAULT 'image/jpeg',
  is_profile_picture BOOLEAN DEFAULT FALSE,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des likes/dislikes
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  liker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  liked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_like BOOLEAN NOT NULL, -- true pour like, false pour dislike
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(liker_id, liked_id)
);

-- Table des matches (quand deux personnes se likent)
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user1_id, user2_id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des visites de profil
CREATE TABLE IF NOT EXISTS profile_visits (
  id SERIAL PRIMARY KEY,
  visitor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  visited_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'like', 'match', 'message', 'visit'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  related_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_liker_id ON likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_likes_liked_id ON likes(liked_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

SELECT 'Base de données Matcha initialisée avec succès!' as message; 
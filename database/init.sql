-- Schéma unifié de la base de données Matcha
-- Version: 2.1 - CORRECTION MAJEURE - Aligné sur les modèles TypeScript réels
-- Date: 2025-07-27
-- Ce fichier remplace init.sql et corrige les incohérences détectées

-- Extensions PostgreSQL utiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- TABLES PRINCIPALES - NOMS CORRECTS
-- ========================================

-- Table des utilisateurs (avec les VRAIS noms de colonnes utilisés par le code)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,  -- CORRIGÉ: était email_verified, code utilise is_verified
  verification_token VARCHAR(255),
  verification_token_expires TIMESTAMP,  -- Ajouté car utilisé par le code
  reset_password_token VARCHAR(255),     -- Ajouté car utilisé par le code  
  reset_password_expires TIMESTAMP,      -- Ajouté car utilisé par le code
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des profils (avec les VRAIS noms de colonnes utilisés par le code)
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  biography TEXT,
  age INTEGER CHECK (age >= 18 AND age <= 100),
  gender VARCHAR(10) CHECK (gender IN ('homme', 'femme')),
  sexual_orientation VARCHAR(10) CHECK (sexual_orientation IN ('hetero', 'homo', 'bi')),
  interests TEXT[], -- Array de strings pour les intérêts
  city VARCHAR(100),
  location_lat DECIMAL(10, 8),  -- CORRIGÉ: était latitude, code utilise location_lat
  location_lng DECIMAL(11, 8),  -- CORRIGÉ: était longitude, code utilise location_lng
  fame_rating INTEGER DEFAULT 0,
  iscomplete BOOLEAN DEFAULT false NOT NULL,  -- CORRIGÉ: était isComplete, DB utilise iscomplete (lowercase)
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

-- Table des visites de profil
CREATE TABLE IF NOT EXISTS profile_visits (
  id SERIAL PRIMARY KEY,
  visitor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  visited_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des utilisateurs bloqués
CREATE TABLE IF NOT EXISTS blocks (
  id SERIAL PRIMARY KEY,
  blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocker_id, blocked_id),
  CONSTRAINT check_no_self_block CHECK (blocker_id != blocked_id)
);

-- Table des signalements
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reported_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  UNIQUE(reporter_id, reported_id)
);

-- ========================================
-- TABLES TEMPS RÉEL (avec noms corrigés)
-- ========================================

-- Table des notifications (version corrigée selon l'usage réel)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'like', 'match', 'message', 'visit'
  message TEXT NOT NULL DEFAULT '',
  data JSONB, -- Données additionnelles en JSON pour flexibilité
  is_read BOOLEAN DEFAULT FALSE, -- Nom cohérent utilisé partout
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- CORRIGÉ: était related_user_id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des connexions utilisateurs pour le temps réel
CREATE TABLE IF NOT EXISTS user_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  socket_id VARCHAR(255) NOT NULL,
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, socket_id)
);

-- Table des conversations pour le chat amélioré
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user1_id, user2_id),
  CONSTRAINT check_different_users CHECK (user1_id != user2_id)
);

-- Table des messages (version améliorée, sans conflit avec match_id)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEX POUR PERFORMANCES (avec vrais noms de colonnes)
-- ========================================

-- Index de base
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location_lat, location_lng);  -- CORRIGÉ
CREATE INDEX IF NOT EXISTS idx_profiles_iscomplete ON profiles(iscomplete);  -- CORRIGÉ
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_liker_id ON likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_likes_liked_id ON likes(liked_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Index pour les notifications temps réel
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Index pour les connexions
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_socket_id ON user_connections(socket_id);

-- Index pour les conversations et messages
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);

-- ========================================
-- FONCTIONS ET TRIGGERS
-- ========================================

-- Fonction pour créer automatiquement une conversation quand un match se produit
CREATE OR REPLACE FUNCTION create_conversation_on_match()
RETURNS TRIGGER AS $$
BEGIN
    -- Insérer une conversation pour ce match
    INSERT INTO conversations (user1_id, user2_id, created_at)
    VALUES (
        LEAST(NEW.user1_id, NEW.user2_id),
        GREATEST(NEW.user1_id, NEW.user2_id),
        NEW.created_at
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour les matches
DROP TRIGGER IF EXISTS trigger_create_conversation ON matches;
CREATE TRIGGER trigger_create_conversation
    AFTER INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION create_conversation_on_match();

-- ========================================
-- DONNÉES INITIALES (optionnel)
-- ========================================

-- Mettre à jour les profils existants qui sont déjà complets
-- (au cas où ce script est exécuté sur une base existante)
UPDATE profiles 
SET iscomplete = true 
WHERE biography IS NOT NULL 
  AND age IS NOT NULL 
  AND gender IS NOT NULL 
  AND sexual_orientation IS NOT NULL
  AND iscomplete = false;

-- Message de confirmation
SELECT 'Base de données Matcha initialisée avec succès - Schéma unifié v2.1 CORRIGÉ!' as message;
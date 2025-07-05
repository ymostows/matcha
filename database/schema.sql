-- Schema pour Web Matcha - Site de rencontres
-- Extensions PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des profils utilisateur
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    biography TEXT,
    age INTEGER CHECK (age >= 18 AND age <= 100),
    gender VARCHAR(20) CHECK (gender IN ('homme', 'femme')),
    sexual_orientation VARCHAR(20) CHECK (sexual_orientation IN ('hetero', 'homo', 'bi')),
    interests TEXT[], -- Array de centres d'intérêt
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    city VARCHAR(100),
    fame_rating INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des photos de profil avec stockage base64
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    image_data TEXT NOT NULL, -- Stockage base64
    mime_type VARCHAR(50) DEFAULT 'image/jpeg',
    is_profile_picture BOOLEAN DEFAULT FALSE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des likes/dislikes
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    liker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    liked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_like BOOLEAN NOT NULL, -- true pour like, false pour dislike
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(liker_id, liked_id)
);

-- Table des matches (quand 2 personnes se likent mutuellement)
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id)
);

-- Table des messages
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'like', 'match', 'message', 'visit'
    from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des visites de profil
CREATE TABLE profile_visits (
    id SERIAL PRIMARY KEY,
    visitor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    visited_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_profile_picture ON photos(is_profile_picture);
CREATE INDEX idx_likes_liker_id ON likes(liker_id);
CREATE INDEX idx_likes_liked_id ON likes(liked_id);
CREATE INDEX idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX idx_messages_match_id ON messages(match_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
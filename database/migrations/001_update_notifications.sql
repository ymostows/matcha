-- Migration pour améliorer le système de notifications temps réel
-- Date: 2025-07-26

-- Mettre à jour la table notifications pour le temps réel
ALTER TABLE notifications 
DROP COLUMN IF EXISTS title,
ADD COLUMN IF NOT EXISTS data JSONB,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Renommer la colonne 'read' en 'is_read' si elle existe
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'notifications' AND column_name = 'read') THEN
        ALTER TABLE notifications RENAME COLUMN read TO is_read;
    END IF;
END $$;

-- Ajouter des index pour les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Créer la table des connexions utilisateurs pour le temps réel
CREATE TABLE IF NOT EXISTS user_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  socket_id VARCHAR(255) NOT NULL,
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, socket_id)
);

-- Index pour les connexions
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_socket_id ON user_connections(socket_id);

-- Créer la table des conversations pour le chat amélioré
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user1_id, user2_id),
  CONSTRAINT check_different_users CHECK (user1_id != user2_id)
);

-- Mettre à jour la table messages pour utiliser conversation_id
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

-- Index pour les conversations et messages
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

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
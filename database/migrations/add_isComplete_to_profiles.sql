-- Migration: Ajouter le champ isComplete à la table profiles
-- Date: 2025-07-25

-- Ajouter la colonne isComplete avec valeur par défaut false
ALTER TABLE profiles 
ADD COLUMN isComplete BOOLEAN DEFAULT false NOT NULL;

-- Mettre à jour les profils existants qui sont déjà complets
-- (ceux qui ont une biographie, un âge, un genre, et une orientation sexuelle)
UPDATE profiles 
SET isComplete = true 
WHERE biography IS NOT NULL 
  AND age IS NOT NULL 
  AND gender IS NOT NULL 
  AND sexual_orientation IS NOT NULL;

-- Ajouter un index pour optimiser les requêtes sur isComplete
CREATE INDEX IF NOT EXISTS idx_profiles_isComplete ON profiles(isComplete);
-- Script de vérification du schéma v2.1 CORRIGÉ
-- Vérifie que le schéma correspond EXACTEMENT aux modèles TypeScript

\echo '=== VÉRIFICATION DU SCHÉMA MATCHA v2.1 CORRIGÉ ==='

-- 1. Vérifier les colonnes critiques corrigées
\echo '1. Vérification des colonnes CORRIGÉES...'

-- Vérifier users.is_verified (PAS email_verified)
SELECT 
    'users.is_verified' as "Colonne Critique",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'is_verified'
        ) THEN '✅ CORRECT (is_verified existe)'
        ELSE '❌ ERREUR (is_verified manquant)'
    END as "Status v2.1";

-- Vérifier qu'il n'y a PAS de email_verified
SELECT 
    'users.email_verified (ne doit PAS exister)' as "Colonne Critique",
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'email_verified'
        ) THEN '✅ CORRECT (email_verified absente)'
        ELSE '❌ ERREUR (email_verified encore présente)'
    END as "Status v2.1";

-- Vérifier profiles.location_lat (PAS latitude)
SELECT 
    'profiles.location_lat' as "Colonne Critique",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'location_lat'
        ) THEN '✅ CORRECT (location_lat existe)'
        ELSE '❌ ERREUR (location_lat manquant)'
    END as "Status v2.1";

-- Vérifier qu'il n'y a PAS de latitude
SELECT 
    'profiles.latitude (ne doit PAS exister)' as "Colonne Critique",
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'latitude'
        ) THEN '✅ CORRECT (latitude absente)'
        ELSE '❌ ERREUR (latitude encore présente)'
    END as "Status v2.1";

-- Vérifier profiles.location_lng (PAS longitude)
SELECT 
    'profiles.location_lng' as "Colonne Critique",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'location_lng'
        ) THEN '✅ CORRECT (location_lng existe)'
        ELSE '❌ ERREUR (location_lng manquant)'
    END as "Status v2.1";

-- Vérifier qu'il n'y a PAS de longitude
SELECT 
    'profiles.longitude (ne doit PAS exister)' as "Colonne Critique",
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'longitude'
        ) THEN '✅ CORRECT (longitude absente)'
        ELSE '❌ ERREUR (longitude encore présente)'
    END as "Status v2.1";

-- Vérifier profiles.iscomplete (lowercase, PAS isComplete)
SELECT 
    'profiles.iscomplete (lowercase)' as "Colonne Critique",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'iscomplete'
        ) THEN '✅ CORRECT (iscomplete en lowercase)'
        ELSE '❌ ERREUR (iscomplete manquant)'
    END as "Status v2.1";

-- 2. Vérifier les colonnes ajoutées pour UserModel
\echo '2. Vérification des colonnes ajoutées...'

SELECT 
    'users.verification_token_expires' as "Colonne Ajoutée",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'verification_token_expires'
        ) THEN '✅ AJOUTÉE'
        ELSE '❌ MANQUANTE'
    END as "Status v2.1";

SELECT 
    'users.reset_password_token' as "Colonne Ajoutée",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'reset_password_token'
        ) THEN '✅ AJOUTÉE'
        ELSE '❌ MANQUANTE'
    END as "Status v2.1";

-- 3. Vérifier les notifications corrigées
\echo '3. Vérification des notifications...'

SELECT 
    'notifications.from_user_id' as "Colonne Notifications",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'from_user_id'
        ) THEN '✅ CORRECT (from_user_id)'
        ELSE '❌ ERREUR (from_user_id manquant)'
    END as "Status v2.1";

-- 4. Test d'intégrité - Compter les tables principales
\echo '4. Test d\intégrité des tables...'

SELECT 
    COUNT(*) as "Nombre de tables principales",
    CASE 
        WHEN COUNT(*) >= 8 THEN '✅ Tables principales présentes'
        ELSE '❌ Tables manquantes'
    END as "Status v2.1"
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'profiles', 'photos', 'likes', 'matches', 
    'messages', 'notifications', 'conversations'
);

-- 5. Test de compatibilité avec le code TypeScript
\echo '5. Test de compatibilité TypeScript...'

-- Test que tous les champs du UserModel existent
SELECT 
    'Compatibilité UserModel' as "Test TypeScript",
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('id', 'email', 'username', 'first_name', 'last_name', 'is_verified', 'verification_token')
        ) = 7 THEN '✅ UserModel compatible'
        ELSE '❌ UserModel incompatible'
    END as "Status v2.1";

-- Test que tous les champs du Profile existent
SELECT 
    'Compatibilité Profile' as "Test TypeScript",
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name IN ('id', 'user_id', 'location_lat', 'location_lng', 'iscomplete')
        ) = 5 THEN '✅ Profile compatible'
        ELSE '❌ Profile incompatible'
    END as "Status v2.1";

\echo '=== RÉSUMÉ ==='
\echo 'Si tout affiche ✅, le schéma v2.1 est CORRECT et compatible !'
\echo 'Si des ❌ apparaissent, il y a encore des problèmes.'

-- Message final
SELECT 'Schéma v2.1 - Vérification terminée !' as "Message Final";
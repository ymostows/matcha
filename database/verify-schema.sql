-- Script de vérification de l'intégrité du schéma Matcha
-- Ce script vérifie que toutes les tables, colonnes et index sont correctement créés

\echo '=== VÉRIFICATION DU SCHÉMA MATCHA ==='

-- Vérifier les extensions
\echo '1. Vérification des extensions PostgreSQL...'
SELECT 
    extname as "Extension",
    CASE WHEN extname IS NOT NULL THEN '✅ Installée' ELSE '❌ Manquante' END as "Status"
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto')
UNION ALL
SELECT 
    'uuid-ossp' as "Extension",
    '❌ Manquante' as "Status"
WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp')
UNION ALL
SELECT 
    'pgcrypto' as "Extension", 
    '❌ Manquante' as "Status"
WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto');

-- Vérifier les tables principales
\echo '2. Vérification des tables principales...'
SELECT 
    tablename as "Table",
    CASE WHEN tablename IS NOT NULL THEN '✅ Existe' ELSE '❌ Manquante' END as "Status"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'profiles', 'photos', 'likes', 'matches', 
    'messages', 'profile_visits', 'notifications',
    'user_connections', 'conversations'
)
ORDER BY tablename;

-- Vérifier les colonnes critiques pour éviter les conflits
\echo '3. Vérification des colonnes critiques...'

-- Vérifier notifications.is_read (pas notifications.read)
SELECT 
    'notifications.is_read' as "Colonne",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'is_read'
        ) THEN '✅ Correcte'
        ELSE '❌ Manquante'
    END as "Status";

-- Vérifier qu'il n'y a PAS de colonne notifications.read
SELECT 
    'notifications.read (ne doit PAS exister)' as "Colonne",
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'read'
        ) THEN '✅ Correct (absente)'
        ELSE '❌ Problème (présente)'
    END as "Status";

-- Vérifier profiles.isComplete
SELECT 
    'profiles.isComplete' as "Colonne",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'iscomplete'
        ) THEN '✅ Existe'
        ELSE '❌ Manquante'
    END as "Status";

-- Vérifier conversations.user1_id et user2_id
SELECT 
    'conversations.user1_id' as "Colonne",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'conversations' AND column_name = 'user1_id'
        ) THEN '✅ Existe'
        ELSE '❌ Manquante'
    END as "Status";

-- Vérifier les index critiques
\echo '4. Vérification des index principaux...'
SELECT 
    indexname as "Index",
    CASE WHEN indexname IS NOT NULL THEN '✅ Existe' ELSE '❌ Manquant' END as "Status"
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN (
    'idx_users_email', 'idx_users_username',
    'idx_profiles_user_id', 'idx_profiles_iscomplete',
    'idx_notifications_user_id', 'idx_notifications_is_read'
)
ORDER BY indexname;

-- Vérifier les contraintes de clés étrangères
\echo '5. Vérification des contraintes importantes...'
SELECT 
    tc.constraint_name as "Contrainte",
    tc.table_name as "Table",
    '✅ Active' as "Status"
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN ('profiles', 'notifications', 'likes', 'matches', 'messages')
ORDER BY tc.table_name, tc.constraint_name;

-- Vérifier les triggers
\echo '6. Vérification des triggers...'
SELECT 
    trigger_name as "Trigger",
    event_object_table as "Table",
    '✅ Actif' as "Status"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'trigger_create_conversation';

-- Compter les enregistrements
\echo '7. Statistiques des données...'
SELECT 'users' as "Table", COUNT(*) as "Nombre d'enregistrements" FROM users
UNION ALL
SELECT 'profiles' as "Table", COUNT(*) as "Nombre d'enregistrements" FROM profiles
UNION ALL
SELECT 'photos' as "Table", COUNT(*) as "Nombre d'enregistrements" FROM photos
UNION ALL
SELECT 'likes' as "Table", COUNT(*) as "Nombre d'enregistrements" FROM likes
UNION ALL
SELECT 'matches' as "Table", COUNT(*) as "Nombre d'enregistrements" FROM matches
UNION ALL
SELECT 'notifications' as "Table", COUNT(*) as "Nombre d'enregistrements" FROM notifications;

\echo '=== FIN DE LA VÉRIFICATION ==='
\echo 'Si tout affiche ✅, le schéma est correct !'
\echo 'Si des ❌ apparaissent, il y a des problèmes à résoudre.'
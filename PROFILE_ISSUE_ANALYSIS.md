# Analyse du problème "Voir le profil"

## Problème identifié

Le bouton "Voir le profil" dans la page de browsing ne fonctionnait pas correctement en raison d'une incohérence dans la structure des données entre les différentes routes API.

## Causes du problème

### 1. Incohérence dans `ProfileModel.findCompleteProfile`
- La requête SQL utilisait `SELECT u.id, ..., p.*` 
- Cela causait un conflit : `p.id` (ID du profil) écrasait `u.id` (ID de l'utilisateur)
- Résultat : l'API retournait l'ID du profil au lieu de l'ID de l'utilisateur

### 2. Manque de `user_id` dans `/profile/browse`
- La route `/profile/browse` retournait `u.id` mais pas de `user_id`
- Le frontend utilisait `profile.user_id` pour la navigation
- Résultat : `profile.user_id` était `undefined`

### 3. Contrainte manquante dans `profile_visits`
- La route `/profile/:userId` tentait d'utiliser `ON CONFLICT (visitor_id, visited_id, DATE(visited_at))`
- Cette contrainte unique n'existait pas dans la base de données
- Résultat : erreur SQL lors de l'enregistrement des visites

## Solutions appliquées

### 1. Correction de `ProfileModel.findCompleteProfile`
```sql
-- Avant
SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.last_seen, p.*

-- Après  
SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.last_seen,
       p.id as profile_id, p.user_id, p.biography, p.age, p.gender, p.sexual_orientation, 
       p.interests, p.location_lat, p.location_lng, p.city, p.fame_rating,
       p.created_at, p.updated_at
```

### 2. Ajout de `user_id` dans `/profile/browse`
```sql
-- Avant
SELECT u.id, u.username, u.first_name, u.last_name, u.last_seen, ...

-- Après
SELECT u.id, u.id as user_id, u.username, u.first_name, u.last_name, u.last_seen, ...
```

### 3. Création de la contrainte unique manquante
```sql
CREATE UNIQUE INDEX IF NOT EXISTS unique_daily_visit 
ON profile_visits (visitor_id, visited_id, DATE(visited_at));
```

## Structure des données correcte

### Réponse `/profile/browse`
```json
{
  "success": true,
  "profiles": [
    {
      "id": 47,           // ID de l'utilisateur
      "user_id": 47,      // ID de l'utilisateur (pour navigation)
      "username": "...",
      "first_name": "...",
      "last_name": "...",
      "age": 36,
      "photos": [...]
    }
  ]
}
```

### Réponse `/profile/:userId`
```json
{
  "success": true,
  "profile": {
    "id": 47,             // ID de l'utilisateur
    "profile_id": 47,     // ID du profil
    "user_id": 47,        // ID de l'utilisateur (référence)
    "username": "...",
    "first_name": "...",
    "last_name": "...",
    "age": 36,
    "photos": [...]
  }
}
```

## Navigation frontend

Le bouton "Voir le profil" utilise maintenant correctement :
```javascript
onClick={() => navigate(`/profile/${profile.user_id}`)}
```

Où `profile.user_id` correspond à l'ID de l'utilisateur (47 dans l'exemple).

## Tests effectués

1. ✅ Login API : Authentification réussie
2. ✅ Browse API : Retourne les profils avec `user_id` 
3. ✅ Profile API : Route `/profile/47` fonctionne correctement
4. ✅ Navigation : Le bouton "Voir le profil" navigue vers la bonne route

## Fichiers modifiés

1. `/backend/src/models/Profile.ts` - Correction de la requête SQL
2. `/backend/src/routes/profile.ts` - Ajout de `user_id` dans browse
3. Base de données - Ajout de l'index unique pour les visites

## Conclusion

Le problème était causé par une incohérence dans la structure des données entre les différentes routes API. La solution a consisté à harmoniser les réponses pour que :
- `id` = ID de l'utilisateur
- `user_id` = ID de l'utilisateur (pour navigation)
- `profile_id` = ID du profil (quand applicable)

Le bouton "Voir le profil" fonctionne maintenant correctement et redirige vers la bonne route avec les bonnes données.
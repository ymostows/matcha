# 🚨 CORRECTION CRITIQUE v2.1 - SCHÉMA DATABASE

## ⚠️ PROBLÈME MAJEUR DÉTECTÉ ET RÉSOLU

La **v2.0 pushée hier était INCORRECTE** ! Le schéma `database/init.sql` ne correspondait PAS aux modèles TypeScript utilisés par le code.

### 🔍 **INCOHÉRENCES DÉTECTÉES**

| Composant | v2.0 (INCORRECT) | RÉALITÉ Code TypeScript | v2.1 (CORRIGÉ) |
|-----------|------------------|-------------------------|-----------------|
| **users** | `email_verified` | `is_verified` ✅ | `is_verified` ✅ |
| **profiles** | `latitude`, `longitude` | `location_lat`, `location_lng` ✅ | `location_lat`, `location_lng` ✅ |  
| **profiles** | `isComplete` | `iscomplete` (lowercase) ✅ | `iscomplete` ✅ |
| **notifications** | `related_user_id` | `from_user_id` ✅ | `from_user_id` ✅ |

### 🎯 **CONSÉQUENCES**

- **Erreur 500 garantie** sur les nouvelles installations utilisant le schéma v2.0
- **Scripts de génération cassés** (mauvais noms de colonnes)
- **Modèles TypeScript incompatibles** avec la base de données

### ✅ **CORRECTION v2.1**

#### **Schéma Corrigé**
- ✅ `users.is_verified` (pas `email_verified`)
- ✅ `profiles.location_lat/location_lng` (pas `latitude/longitude`)
- ✅ `profiles.iscomplete` (lowercase, pas `isComplete`)
- ✅ `notifications.from_user_id` (pas `related_user_id`)
- ✅ Colonnes manquantes ajoutées : `verification_token_expires`, `reset_password_token`, etc.

#### **Scripts Corrigés**
- ✅ `generateProfiles.js` : Auto-détection Docker vs local
- ✅ `generateWithRealPhotos.js` : Auto-détection Docker vs local
- ✅ Configuration automatique `postgres:5432` (Docker) vs `localhost:5433` (local)

#### **Tests Validés**
- ✅ Registration endpoint : `200 OK` 
- ✅ Profile generation : `✅ Profil créé`
- ✅ Schema integrity : Toutes colonnes correctes
- ✅ TypeScript compatibility : Modèles alignés

### 🚀 **UTILISATION**

Sur l'autre PC, après `git pull` :

```bash
git pull origin main
cd matcha  
./setup-robust.sh  # Utilisera automatiquement le schéma v2.1 corrigé
```

### 📊 **VALIDATION**

Le schéma v2.1 a été testé avec :
- ✅ Reset complet de la DB locale
- ✅ Registration sans erreur 500
- ✅ Génération de profils fonctionnelle  
- ✅ Vérification de toutes les colonnes

### 🔄 **MIGRATION**

**Aucune migration manuelle requise** - le script `setup-robust.sh` gère automatiquement :
1. Détection des conflits
2. Reset de la DB si nécessaire  
3. Application du schéma v2.1 corrigé
4. Tests de validation

---

## 📝 **RÉSUMÉ POUR L'AUTRE PC**

**Le problème était** : Schéma de base de données v2.0 incorrect sur Git
**La solution** : Schéma v2.1 corrigé et aligné sur le code réel  
**Le résultat** : Installation garantie sans erreur 500

**Action** : `git pull` + `./setup-robust.sh` = ✅ Fonctionnel
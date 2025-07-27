# Migration vers Neon Database

## Étapes pour migrer vers Neon

### 1. Créer un projet Neon
1. Va sur https://console.neon.tech
2. Connecte-toi et crée un nouveau projet
3. Copie la chaîne de connexion (format: `postgresql://username:password@ep-xxx.region.neon.tech/dbname?sslmode=require`)

### 2. Configuration locale
1. Crée un fichier `.env` dans `backend/` basé sur `.env.example`
2. Colle ta chaîne de connexion Neon dans `DATABASE_URL`

```bash
# backend/.env
DATABASE_URL=postgresql://username:password@ep-xxx.region.neon.tech/dbname?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-for-development-only
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
```

### 3. Configurer la base de données Neon
```bash
cd backend
npm run setup:neon
```

Ce script va :
- Tester la connexion à Neon
- Créer toutes les tables nécessaires
- Configurer les index et triggers

### 4. Lancer l'application avec Neon

#### Option A: Docker avec Neon (recommandé)
```bash
# Utilise le fichier docker-compose spécial pour Neon
docker-compose -f docker-compose.neon.yml up
```

#### Option B: Développement local
```bash
# Backend
cd backend
npm run dev

# Frontend (dans un autre terminal)
cd frontend  
npm run dev
```

### 5. Générer des données de test (optionnel)
```bash
cd backend
npm run seed:500
```

## Avantages de Neon

✅ **Pas de Docker PostgreSQL local**  
✅ **Base de données managed (backups automatiques)**  
✅ **Scalabilité automatique**  
✅ **SSL par défaut**  
✅ **Interface web pour gérer la DB**  

## Commandes utiles

```bash
# Configurer Neon
npm run setup:neon

# Nettoyer et regénérer les profils
npm run reset:profiles

# Développement avec Neon
docker-compose -f docker-compose.neon.yml up

# Développement local (sans Docker)
npm run dev
```

## Dépannage

- **Erreur de connexion** : Vérifie que `DATABASE_URL` est correcte dans `.env`
- **SSL errors** : Neon utilise SSL par défaut, la config est déjà adaptée
- **Timeout** : Neon peut être plus lent, les timeouts sont ajustés
- **Trop de connexions** : Le pool est limité à 10 connexions max pour Neon

## Retour en arrière (si nécessaire)

Pour revenir à PostgreSQL local :
```bash
docker-compose up  # Utilise le fichier original avec postgres local
```
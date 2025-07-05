# 💕 Web Matcha

Site de rencontres moderne développé avec React, Express.js et PostgreSQL.

## 🏗️ Architecture

- **Frontend** : React + TypeScript + TailwindCSS + Vite
- **Backend** : Express.js + TypeScript + PostgreSQL
- **Base de données** : PostgreSQL 15
- **Conteneurisation** : Docker + Docker Compose

## 🚀 Démarrage ultra-simple

### Prérequis
- Docker et Docker Compose
- Git

### Démarrage en une commande

```bash
# Cloner le projet
git clone [repo-url]
cd web-matcha

# Tout démarrer avec Docker
docker-compose up
```

**C'est tout !** L'application complète se lance automatiquement avec :
- Base de données PostgreSQL avec 500+ profils de test
- Backend API Express.js
- Frontend React
- Interface d'administration de la base de données

### Ou utiliser le script pratique

```bash
./start-dev.sh
```

## 📱 URLs de l'application

Une fois `docker-compose up` lancé :

- **🌐 Application web** : http://localhost:5173
- **🔧 API Backend** : http://localhost:3001  
- **🩺 Health check** : http://localhost:3001/api/health
- **🗄️ Adminer (DB)** : http://localhost:8080

## 🎯 Utilisation

### Démarrer l'application
```bash
docker-compose up
```

### Arrêter l'application  
```bash
docker-compose down
```

### Voir les logs en temps réel
```bash
docker-compose logs -f
```

### Redémarrer un service
```bash
docker-compose restart backend
docker-compose restart frontend
```

## 🗄️ Base de données

La base de données PostgreSQL est automatiquement configurée avec :
- **Schéma complet** (`database/schema.sql`)
- **500+ profils de test** pré-générés
- **Tables** : users, profiles, likes, matches, etc.

### Accès direct à la base
```bash
# Via Adminer (interface web)
http://localhost:8080
# Serveur: postgres
# Utilisateur: matcha_user  
# Mot de passe: matcha_password
# Base: matcha_db

# Via ligne de commande
docker exec -it matcha-db psql -U matcha_user -d matcha_db
```

## 🔐 Fonctionnalités incluses

- ✅ **Authentification complète** (inscription/connexion)
- ✅ **Validation des données** côté client et serveur
- ✅ **Sécurité** : bcrypt, JWT, CORS, sanitisation
- ✅ **Interface responsive** avec TailwindCSS
- ✅ **API REST** complète
- ✅ **Base de données** avec données de test

## 📂 Structure du projet

```
web-matcha/
├── backend/           # API Express.js + TypeScript
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── config/
│   └── Dockerfile
├── frontend/          # React + TypeScript + Vite  
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── services/
│   │   └── types/
│   └── Dockerfile
├── database/          # Scripts SQL
├── docker-compose.yml # Configuration complète
└── start-dev.sh      # Script de démarrage
```

## 🐳 Configuration Docker

Le fichier `docker-compose.yml` configure automatiquement :

- **postgres** : Base de données sur port 5433
- **backend** : API Express.js sur port 3001  
- **frontend** : Application React sur port 5173
- **adminer** : Interface DB sur port 8080

Tous les services ont des health checks et se lancent dans le bon ordre.

## 🔧 Variables d'environnement

Tout est pré-configuré ! Les fichiers `.env` sont automatiquement utilisés :

**Backend** :
- Base de données PostgreSQL interne
- JWT secret pour le développement
- CORS configuré pour le frontend

**Frontend** :
- API URL pointant vers le backend Docker
- Configuration Vite optimisée

## 🛠️ Développement avancé

### Mode développement avec hot reload
Les volumes Docker sont configurés pour le hot reload :
- Modification du code → rechargement automatique
- Pas besoin de rebuilder les images

### Commandes utiles
```bash
# Voir l'état des conteneurs
docker-compose ps

# Logs d'un service spécifique  
docker-compose logs backend
docker-compose logs frontend

# Reconstruire un service
docker-compose build backend
docker-compose up -d backend

# Shell dans un conteneur
docker exec -it matcha-backend sh
docker exec -it matcha-frontend sh
```

## ✨ Avantages de cette approche

- **🚀 Démarrage immédiat** : Une seule commande
- **🔄 Pas de config locale** : Node.js pas requis sur la machine
- **🧹 Environnement propre** : Isolation complète
- **📦 Portable** : Fonctionne partout où Docker tourne
- **⚡ Hot reload** : Développement fluide
- **🗄️ Base de données incluse** : Rien à installer séparément

## 📝 Notes importantes

- La base de données **conserve les données** entre les redémarrages
- Les **ports sont automatiquement configurés** (pas de conflits)
- Le **hot reload fonctionne** pour le développement
- **Health checks intégrés** pour chaque service
- **Logs centralisés** avec `docker-compose logs`

---

**🎉 Démarrage en 30 secondes avec `docker-compose up` !** 